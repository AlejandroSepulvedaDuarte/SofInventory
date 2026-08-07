from decimal import Decimal
from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from clientes.models import Cliente
from compras.models import Compra
from inventario.models import Almacen, MovimientoInventario, StockAlmacen
from productos.models import Categoria, Producto
from proveedores.models import Proveedor
from usuarios.models import Rol, TipoDocumento, Usuario
from ventas.models import Venta, DetalleVenta


class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol = Rol.objects.get(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='2001',
            nombre_completo='Usuario Dashboard',
            email='dashboard@example.com',
            username='dashboard',
            password='Secret123!',
            rol=self.rol,
            fecha_creacion='2026-01-01',
        )
        self.categoria = Categoria.objects.create(
            nombre='Herramientas',
            tipo_control='GENERAL',
            creado_por=self.usuario,
        )
        self.producto = Producto.objects.create(
            sku='SKU-1',
            nombre='Taladro',
            marca='Bosch',
            referencia='T100',
            categoria=self.categoria,
            precio_compra=Decimal('100.00'),
            precio_venta=Decimal('150.00'),
            iva_porcentaje=Decimal('19.00'),
            stock=3,
            stock_minimo=5,
            estado='activo',
            creado_por=self.usuario,
        )
        self.almacen = Almacen.objects.create(
            nombre='Almacen Dashboard',
            codigo='ALM-DASH',
            creado_por=self.usuario,
        )
        StockAlmacen.objects.create(
            producto=self.producto,
            almacen=self.almacen,
            cantidad=3,
        )
        self.cliente = Cliente.objects.create(
            tipo_cliente='natural',
            categoria='general',
            tipo_documento=self.tipo_documento,
            numero_documento='3001',
            nombres='Ana',
            apellidos='Lopez',
            creado_por=self.usuario,
            estado='activo',
        )
        self.proveedor = Proveedor.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='4001',
            razon_social='Proveedor Uno',
            nombre_contacto='Pedro',
            email='proveedor1@example.com',
            telefono='12345',
            direccion='Calle 2',
            pais='Colombia',
            departamento='Cundinamarca',
            ciudad='Bogota',
            tipo_proveedor='Bienes',
            estado='Activo',
            creado_por=self.usuario,
        )
        Compra.objects.create(
            proveedor=self.proveedor,
            numero_factura='10001',
            fecha_compra='2026-04-10',
            tipo_compra='Contado',
            subtotal=Decimal('100.00'),
            iva_total=Decimal('19.00'),
            total=Decimal('119.00'),
            registrado_por=self.usuario,
        )
        self.venta = Venta.objects.create(
            cliente=self.cliente,
            vendedor=self.usuario,
            subtotal=Decimal('150.00'),
            descuento=Decimal('0.00'),
            iva_monto=Decimal('28.50'),
            total=Decimal('178.50'),
            metodo_pago='efectivo',
        )
        DetalleVenta.objects.create(
            venta=self.venta,
            producto=self.producto,
            precio_unitario=Decimal('150.00'),
            cantidad=1,
            nombre_producto='Taladro',
            sku_producto='SKU-1',
        )

    def autenticar(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'dashboard',
            'password': 'Secret123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")

    def test_dashboard_devuelve_metricas_y_ventas_recientes(self):
        self.autenticar()
        response = self.client.get('/api/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['metricas']['total_proveedores'], 1)
        self.assertEqual(response.data['metricas']['stock_bajo'], 1)
        self.assertEqual(response.data['ventas_recientes'][0]['cliente'], 'Ana Lopez')


class DashboardPeriodosTests(TestCase):
    ZONA = ZoneInfo('America/Bogota')
    AHORA = datetime(2026, 8, 6, 10, 0, tzinfo=ZONA)

    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol = Rol.objects.get(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='DASH-PERIODOS-1',
            nombre_completo='Administrador Periodos',
            email='periodos-dashboard@example.com',
            username='periodos_dashboard',
            password='Secret123!',
            rol=self.rol,
        )
        self.categoria = Categoria.objects.create(
            nombre='Categoria Periodos',
            tipo_control='GENERAL',
            creado_por=self.usuario,
        )
        self.producto = Producto.objects.create(
            sku='PER-001',
            nombre='Producto Periodos',
            categoria=self.categoria,
            precio_compra=Decimal('10.00'),
            precio_venta=Decimal('20.00'),
            iva_porcentaje=Decimal('19.00'),
            stock=100,
            stock_minimo=5,
            estado='activo',
            creado_por=self.usuario,
        )
        self.almacen = Almacen.objects.create(
            nombre='Almacen Periodos',
            codigo='ALM-PER',
            creado_por=self.usuario,
        )
        StockAlmacen.objects.create(
            producto=self.producto,
            almacen=self.almacen,
            cantidad=100,
        )
        self.proveedor = Proveedor.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='PROV-PER-1',
            razon_social='Proveedor Periodos',
            nombre_contacto='Contacto',
            email='proveedor-periodos@example.com',
            telefono='3000000000',
            direccion='Calle 1',
            pais='Colombia',
            departamento='Antioquia',
            ciudad='Medellin',
            tipo_proveedor='Bienes',
            estado='Activo',
            creado_por=self.usuario,
        )
        self.client.force_authenticate(self.usuario)

    def crear_venta(
        self,
        fecha,
        *,
        total='100.00',
        subtotal='84.03',
        descuento='0.00',
        costo=None,
        estado='completada',
    ):
        venta = Venta.objects.create(
            vendedor=self.usuario,
            almacen=self.almacen,
            subtotal=Decimal(subtotal),
            descuento=Decimal(descuento),
            iva_monto=Decimal('0.00'),
            total=Decimal(total),
            metodo_pago='efectivo',
            estado=estado,
        )
        Venta.objects.filter(pk=venta.pk).update(fecha_creacion=fecha)
        venta.refresh_from_db()
        if costo is not None:
            MovimientoInventario.objects.create(
                tipo='SALIDA_VENTA',
                producto=self.producto,
                almacen_origen=self.almacen,
                cantidad=1,
                costo_unitario=Decimal(costo),
                venta=venta,
                referencia_tipo='VENTA',
                referencia_id=venta.pk,
                creado_por=self.usuario,
            )
        return venta

    def crear_compra(self, fecha, *, total='100.00', estado='completada'):
        return Compra.objects.create(
            proveedor=self.proveedor,
            almacen=self.almacen,
            numero_factura=f'F-{Compra.objects.count() + 1}',
            fecha_compra=fecha,
            tipo_compra='Contado',
            subtotal=Decimal(total),
            iva_total=Decimal('0.00'),
            total=Decimal(total),
            estado=estado,
            registrado_por=self.usuario,
        )

    def consultar(self):
        with patch('dashboard.services.timezone.now', return_value=self.AHORA):
            return self.client.get('/api/dashboard/')

    def test_periodos_valores_grandes_y_margen_por_costo_historico(self):
        self.crear_venta(
            datetime(2026, 8, 6, 9, 0, tzinfo=self.ZONA),
            total='150000000.00',
            subtotal='120000000.00',
            costo='20000000.00',
        )
        self.crear_venta(
            datetime(2026, 7, 15, 9, 0, tzinfo=self.ZONA),
            total='75000000.00',
            subtotal='60000000.00',
            costo='10000000.00',
        )
        # Se contabiliza como venta, pero no se inventa utilidad sin costo auditable.
        self.crear_venta(
            datetime(2026, 8, 5, 11, 0, tzinfo=self.ZONA),
            total='500.00',
            subtotal='420.17',
            costo=None,
        )
        self.crear_compra('2026-08-06', total='120000000.00')
        self.crear_compra('2026-07-15', total='60000000.00')

        response = self.consultar()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['version'], 2)
        self.assertEqual(response.data['periodos']['ventas']['mes']['valor'], 150000500.0)
        self.assertEqual(response.data['periodos']['ventas']['mes']['cantidad'], 2)
        self.assertEqual(response.data['periodos']['compras']['mes']['valor'], 120000000.0)
        self.assertEqual(response.data['periodos']['compras']['mes']['cantidad'], 1)
        margen = response.data['periodos']['margen']['mes']
        self.assertEqual(margen['valor'], 100000000.0)
        self.assertEqual(margen['ingreso_neto_sin_iva'], 120000000.0)
        self.assertEqual(margen['costo_ventas'], 20000000.0)
        self.assertEqual(margen['cantidad'], 1)
        self.assertEqual(margen['operaciones_sin_costo'], 1)
        self.assertEqual(margen['comparacion']['porcentaje'], 100.0)
        self.assertEqual(response.data['metricas']['margen_mes'], 100000000.0)

    def test_anuladas_y_pendientes_no_se_contabilizan(self):
        fecha = datetime(2026, 8, 6, 8, 0, tzinfo=self.ZONA)
        self.crear_venta(fecha, total='100.00', subtotal='80.00', costo='30.00')
        self.crear_venta(
            fecha, total='900.00', subtotal='800.00', costo='50.00', estado='anulada'
        )
        self.crear_compra('2026-08-06', total='200.00')
        self.crear_compra('2026-08-06', total='300.00', estado='pendiente')
        self.crear_compra('2026-08-06', total='400.00', estado='anulada')

        response = self.consultar()

        self.assertEqual(response.data['periodos']['ventas']['hoy']['valor'], 100.0)
        self.assertEqual(response.data['periodos']['ventas']['hoy']['cantidad'], 1)
        self.assertEqual(response.data['periodos']['compras']['hoy']['valor'], 200.0)
        self.assertEqual(response.data['periodos']['compras']['hoy']['cantidad'], 1)
        self.assertEqual(response.data['periodos']['margen']['hoy']['valor'], 50.0)

    def test_limites_locales_de_dia_semana_mes_y_anio(self):
        # Lunes 00:00 entra en semana actual; el minuto previo queda en la anterior.
        self.crear_venta(
            datetime(2026, 8, 3, 0, 0, tzinfo=self.ZONA),
            total='200.00', subtotal='150.00', costo='50.00',
        )
        self.crear_venta(
            datetime(2026, 8, 2, 23, 59, tzinfo=self.ZONA),
            total='100.00', subtotal='80.00', costo='30.00',
        )
        self.crear_venta(
            datetime(2026, 8, 6, 0, 0, tzinfo=self.ZONA),
            total='60.00', subtotal='50.00', costo='20.00',
        )
        self.crear_venta(
            datetime(2026, 8, 5, 23, 59, tzinfo=self.ZONA),
            total='30.00', subtotal='25.00', costo='10.00',
        )
        self.crear_venta(
            datetime(2026, 1, 1, 0, 0, tzinfo=self.ZONA),
            total='40.00', subtotal='35.00', costo='15.00',
        )
        self.crear_venta(
            datetime(2025, 12, 31, 23, 59, tzinfo=self.ZONA),
            total='20.00', subtotal='18.00', costo='8.00',
        )

        response = self.consultar()
        ventas = response.data['periodos']['ventas']

        self.assertEqual(ventas['hoy']['valor'], 60.0)
        self.assertEqual(ventas['hoy']['comparacion']['porcentaje'], 100.0)
        self.assertEqual(ventas['semana']['valor'], 290.0)
        self.assertEqual(ventas['semana']['comparacion']['valor_anterior'], 100.0)
        self.assertEqual(ventas['anio']['valor'], 430.0)
        self.assertEqual(ventas['anio']['comparacion']['valor_anterior'], 20.0)
        self.assertEqual(response.data['reglas_calculo']['zona_horaria'], 'America/Bogota')
        self.assertEqual(response.data['reglas_calculo']['inicio_semana'], 'lunes')

    def test_periodos_vacios_no_dividen_por_cero_y_series_se_completan(self):
        with CaptureQueriesContext(connection) as consultas:
            response = self.consultar()

        self.assertEqual(response.status_code, 200)
        hoy = response.data['periodos']['ventas']['hoy']
        self.assertEqual(hoy['valor'], 0.0)
        self.assertEqual(hoy['cantidad'], 0)
        self.assertFalse(hoy['comparacion']['disponible'])
        self.assertIsNone(hoy['comparacion']['porcentaje'])
        self.assertEqual(
            len(response.data['graficas']['operaciones']['siete_dias']['labels']), 7
        )
        self.assertTrue(all(
            valor == 0
            for valor in response.data['graficas']['operaciones']['siete_dias']['ventas']
        ))
        self.assertLessEqual(len(consultas), 25)
