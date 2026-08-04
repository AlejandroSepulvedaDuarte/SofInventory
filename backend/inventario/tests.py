from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.test import TestCase
from rest_framework.test import APIClient

from clientes.models import Cliente
from compras.models import Compra
from productos.models import Categoria, Producto
from proveedores.models import Proveedor
from usuarios.models import Rol, TipoDocumento, Usuario
from ventas.models import Venta

from .models import Almacen, MovimientoInventario, StockAlmacen, Traslado


class FlujoInventarioTests(TestCase):
    def setUp(self):
        documento = TipoDocumento.objects.get(codigo='CC')
        rol = Rol.objects.get(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=documento,
            numero_documento='INV-1001',
            nombre_completo='Administrador Inventario',
            email='inventario-tests@example.com',
            username='inventario_tests',
            password='Secret123!',
            rol=rol,
            estado='activo',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.usuario)
        self.almacen = Almacen.objects.create(
            nombre='Principal',
            codigo='PRI',
            creado_por=self.usuario,
        )
        self.almacen_secundario = Almacen.objects.create(
            nombre='Secundario',
            codigo='SEC',
            creado_por=self.usuario,
        )
        categoria = Categoria.objects.create(
            nombre='Materiales',
            creado_por=self.usuario,
        )
        self.producto = Producto.objects.create(
            sku='CEMENTO-GRIS-50',
            nombre='Cemento Gris',
            marca='Argos',
            referencia='50KG',
            categoria=categoria,
            precio_venta=Decimal('100.00'),
            iva_porcentaje=Decimal('19.00'),
            stock_minimo=5,
            estado='pendiente',
            creado_por=self.usuario,
        )
        self.proveedor = Proveedor.objects.create(
            tipo_documento=documento,
            numero_documento='900100200',
            razon_social='Proveedor Inventario',
            nombre_contacto='Contacto',
            email='proveedor-inventario@example.com',
            telefono='3000000000',
            direccion='Calle 1',
            pais='Colombia',
            departamento='Cundinamarca',
            ciudad='Bogota',
            tipo_proveedor='Bienes',
            estado='Activo',
            creado_por=self.usuario,
        )
        self.cliente = Cliente.objects.create(
            tipo_cliente='natural',
            categoria='general',
            tipo_documento=documento,
            numero_documento='100200300',
            nombres='Cliente',
            apellidos='Prueba',
            estado='activo',
            creado_por=self.usuario,
        )

    def registrar_compra(self, factura, cantidad=10):
        return self.client.post(
            '/api/compras/registrar/',
            {
                'proveedor_id': self.proveedor.pk,
                'almacen_id': self.almacen.pk,
                'numero_factura': factura,
                'fecha_compra': '2026-07-29',
                'tipo_compra': 'Contado',
                # Se envian totales falsos para comprobar que el servidor los ignora.
                'subtotal': 1,
                'iva_total': 1,
                'total': 2,
                'productos': [
                    {
                        'producto_id': self.producto.pk,
                        'cantidad': cantidad,
                        'costo_unitario': '50.00',
                        'iva': '19.00',
                    }
                ],
            },
            format='json',
        )

    def registrar_venta(self, cantidad, productos=None):
        return self.client.post(
            '/api/ventas/crear/',
            {
                'cliente_id': self.cliente.pk,
                'almacen_id': self.almacen.pk,
                'descuento': 0,
                'productos': productos or [
                    {
                        'producto_id': self.producto.pk,
                        'cantidad': cantidad,
                        'precio_unitario': '1.00',
                    }
                ],
                'metodo_pago': {
                    'metodo': 'efectivo',
                    'efectivoRecibido': '100000.00',
                },
            },
            format='json',
        )

    def test_tres_compras_pendiente_y_venta_dejan_quince_unidades(self):
        for factura in ('0001', '0002', '0003'):
            respuesta = self.registrar_compra(factura)
            self.assertEqual(respuesta.status_code, 201, respuesta.data)

        self.producto.refresh_from_db()
        stock = StockAlmacen.objects.get(
            producto=self.producto, almacen=self.almacen
        )
        self.assertEqual(stock.cantidad, 30)
        self.assertEqual(self.producto.stock, 30)
        self.assertEqual(
            MovimientoInventario.objects.filter(
                producto=self.producto, tipo='ENTRADA_COMPRA'
            ).aggregate(total=Sum('cantidad'))['total'],
            30,
        )

        self.producto.estado = 'activo'
        self.producto.save(update_fields=['estado'])
        venta = self.registrar_venta(15)
        self.assertEqual(venta.status_code, 201, venta.data)

        stock.refresh_from_db()
        self.producto.refresh_from_db()
        self.assertEqual(stock.cantidad, 15)
        self.assertEqual(self.producto.stock, 15)
        self.assertEqual(
            MovimientoInventario.objects.filter(
                venta_id=venta.data['venta_id'],
                tipo='SALIDA_VENTA',
            ).count(),
            1,
        )
        alertas = self.client.get('/api/inventario/stock/alertas/')
        self.assertEqual(alertas.status_code, 200)
        self.assertNotIn(
            self.producto.pk,
            [item['producto_id'] for item in alertas.data],
        )

    def test_lineas_duplicadas_no_permiten_sobreventa(self):
        self.assertEqual(self.registrar_compra('1001').status_code, 201)
        self.producto.estado = 'activo'
        self.producto.save(update_fields=['estado'])
        respuesta = self.registrar_venta(
            0,
            productos=[
                {
                    'producto_id': self.producto.pk,
                    'cantidad': 7,
                    'precio_unitario': '100.00',
                },
                {
                    'producto_id': self.producto.pk,
                    'cantidad': 7,
                    'precio_unitario': '100.00',
                },
            ],
        )
        self.assertEqual(respuesta.status_code, 400)
        stock = StockAlmacen.objects.get(
            producto=self.producto, almacen=self.almacen
        )
        self.assertEqual(stock.cantidad, 10)
        self.assertFalse(Venta.objects.exists())

    def test_anulaciones_son_auditables_e_idempotentes(self):
        compra = self.registrar_compra('2001')
        self.producto.estado = 'activo'
        self.producto.save(update_fields=['estado'])
        venta = self.registrar_venta(4)

        respuesta = self.client.patch(
            f'/api/ventas/anular/{venta.data["venta_id"]}/',
            {'motivo': 'Devolucion total'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(
            self.client.patch(
                f'/api/ventas/anular/{venta.data["venta_id"]}/',
                {'motivo': 'Repetida'},
                format='json',
            ).status_code,
            400,
        )

        respuesta = self.client.patch(
            f'/api/compras/anular/{compra.data["compra_id"]}/',
            {'motivo': 'Factura anulada'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(
            self.client.patch(
                f'/api/compras/anular/{compra.data["compra_id"]}/',
                {'motivo': 'Repetida'},
                format='json',
            ).status_code,
            400,
        )

        stock = StockAlmacen.objects.get(
            producto=self.producto, almacen=self.almacen
        )
        self.producto.refresh_from_db()
        self.assertEqual(stock.cantidad, 0)
        self.assertEqual(self.producto.stock, 0)
        self.assertEqual(
            MovimientoInventario.objects.filter(
                tipo='DEVOLUCION_VENTA'
            ).count(),
            1,
        )
        self.assertEqual(
            MovimientoInventario.objects.filter(
                tipo='DEVOLUCION_COMPRA'
            ).count(),
            1,
        )

    def test_no_anula_compra_si_unidades_fueron_vendidas(self):
        compra = self.registrar_compra('3001')
        self.producto.estado = 'activo'
        self.producto.save(update_fields=['estado'])
        self.assertEqual(self.registrar_venta(6).status_code, 201)
        respuesta = self.client.patch(
            f'/api/compras/anular/{compra.data["compra_id"]}/',
            {'motivo': 'Intento invalido'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(
            Compra.objects.get(pk=compra.data['compra_id']).estado,
            'completada',
        )
        self.assertEqual(
            StockAlmacen.objects.get(
                producto=self.producto, almacen=self.almacen
            ).cantidad,
            4,
        )

    def test_transferencia_conserva_stock_total_y_registra_traslado(self):
        self.assertEqual(self.registrar_compra('4001').status_code, 201)
        respuesta = self.client.post(
            '/api/inventario/stock/movimiento/',
            {
                'producto_id': self.producto.pk,
                'almacen_id': self.almacen.pk,
                'almacen_destino_id': self.almacen_secundario.pk,
                'cantidad': 4,
                'tipo': 'transferencia',
                'observacion': 'Reubicacion',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(
            StockAlmacen.objects.get(
                producto=self.producto, almacen=self.almacen
            ).cantidad,
            6,
        )
        self.assertEqual(
            StockAlmacen.objects.get(
                producto=self.producto, almacen=self.almacen_secundario
            ).cantidad,
            4,
        )
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 10)
        self.assertEqual(Traslado.objects.count(), 1)

    def test_base_de_datos_rechaza_stock_negativo(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                StockAlmacen.objects.create(
                    producto=self.producto,
                    almacen=self.almacen,
                    cantidad=-1,
                )
