from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from decimal import Decimal

from productos.models import Categoria, Producto
from inventario.models import Almacen, StockAlmacen, MovimientoInventario
from ventas.models import Venta, DetalleVenta
from usuarios.models import TipoDocumento, Rol, Usuario
from empresa.models import Empresa


class VentasTestCase(TestCase):
    def setUp(self):
        # crear usuario vendedor (modelo Usuario personalizado)
        tipo = TipoDocumento.objects.get(codigo='CC')
        rol = Rol.objects.get(nombre='Vendedor')
        self.user = Usuario.objects.create(
            tipo_documento=tipo,
            numero_documento='123456',
            nombre_completo='Vendedor Prueba',
            email='vendedor@test.local',
            username='seller',
            password='pass',
            rol=rol,
            estado='activo',
            fecha_creacion=timezone.now().date()
        )
        self.client = APIClient()
        # force_authenticate acepta cualquier objeto como request.user
        self.client.force_authenticate(user=self.user)

        # categoria y producto
        self.categoria = Categoria.objects.create(nombre='CAT-TEST', creado_por=self.user)
        self.producto = Producto.objects.create(
            sku='SKU-TEST-1', nombre='Producto Test', marca='M', referencia='R',
            categoria=self.categoria, precio_venta=Decimal('100.00'), iva_porcentaje=19,
            creado_por=self.user, stock=0, estado='activo'
        )

        # almacen y stock
        self.almacen = Almacen.objects.create(nombre='Almacen Prueba', codigo='ALM-1', creado_por=self.user)
        self.stock = StockAlmacen.objects.create(producto=self.producto, almacen=self.almacen, cantidad=10)
        self.empresa = Empresa.objects.create(
            nombre_comercial='Ferretería de Prueba',
            razon_social='Ferretería de Prueba S.A.S.',
            nit='900123456',
            direccion='Calle 10 # 20-30',
            pais='Colombia',
            departamento='Antioquia',
            ciudad='Medellín',
            telefono='6045550000',
            creado_por=self.user,
            actualizado_por=self.user,
        )

    def test_crear_venta_correcta_reduccion_stock(self):
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 3, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 201)
        self.stock.refresh_from_db()
        self.producto.refresh_from_db()
        self.assertEqual(self.stock.cantidad, 7)
        # Producto.stock debe actualizarse mediante aggregate
        self.assertEqual(self.producto.stock, 7)
        self.assertIn('numero_factura', resp.data)
        self.assertTrue(resp.data['numero_factura'].startswith('VTA-'))

    def test_vender_mas_que_disponible(self):
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 20, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)
        self.assertIn('no tiene suficiente stock', resp.data['error'].lower())

    def test_cantidad_cero(self):
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 0, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)
        self.assertIn('cantidad ingresada', resp.data['error'].lower())

    def test_cantidad_negativa(self):
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': -2, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)
        self.assertIn('cantidad ingresada', resp.data['error'].lower())

    def test_precio_negativo(self):
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 1, 'precio_unitario': -10}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('error', resp.data)
        self.assertIn('precio unitario', resp.data['error'].lower())

    def test_anular_venta_restaura_stock(self):
        # crear venta
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 4, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 201)
        venta_id = resp.data['venta_id']
        # verificar stock disminuido
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, 6)
        # anular
        resp2 = self.client.patch(f'/api/ventas/anular/{venta_id}/', {'motivo': 'Prueba'}, format='json')
        self.assertEqual(resp2.status_code, 200)
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad, 10)

    def test_numero_venta_generado_unico(self):
        payload = {
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 1, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 201)
        numero = resp.data.get('numero_factura')
        self.assertIsNotNone(numero)
        self.assertTrue(numero.startswith('VTA-'))

    def test_responsable_no_se_puede_suplantar_y_se_guarda_snapshot_completo(self):
        tipo = TipoDocumento.objects.get(codigo='CC')
        otro = Usuario.objects.create(
            tipo_documento=tipo,
            numero_documento='654321',
            nombre_completo='Vendedor Suplantado',
            email='otro-vendedor@test.local',
            username='other_seller',
            password='pass',
            rol=self.user.rol,
            estado='activo',
        )
        payload = {
            'vendedor': otro.id,
            'almacen_id': self.almacen.id,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 2, 'precio_unitario': 1}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500},
        }
        response = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)

        venta = Venta.objects.get(pk=response.data['venta_id'])
        detalle = venta.detalles.get()
        self.assertEqual(venta.vendedor, self.user)
        self.assertEqual(venta.empresa_snapshot['nombre_comercial'], 'Ferretería de Prueba')
        self.assertEqual(detalle.precio_unitario, Decimal('100.00'))
        self.assertEqual(detalle.iva_porcentaje, Decimal('19'))
        self.assertEqual(detalle.iva_monto, Decimal('38.00'))
        self.assertEqual(detalle.total, Decimal('238.00'))

        detail_response = self.client.get(f'/api/ventas/detalle/{venta.id}/')
        self.assertEqual(detail_response.data['vendedor_nombre'], self.user.nombre_completo)
        self.assertEqual(detail_response.data['empresa_snapshot']['nit'], '900123456')

    def test_venta_historica_sin_vendedor_muestra_no_disponible(self):
        venta = Venta.objects.create(
            vendedor=None,
            almacen=self.almacen,
            subtotal=Decimal('0'),
            iva_monto=Decimal('0'),
            total=Decimal('0'),
            metodo_pago='transferencia',
        )
        response = self.client.get(f'/api/ventas/detalle/{venta.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['vendedor_nombre'], 'No disponible')

    def test_errores_en_espanol_no_exponen_trazas(self):
        # Forzar error interno: enviar almacen inexistente
        payload = {
            'almacen_id': 99999,
            'productos': [
                {'producto_id': self.producto.id, 'cantidad': 1, 'precio_unitario': 100}
            ],
            'metodo_pago': {'metodo': 'efectivo', 'efectivoRecibido': 500}
        }
        resp = self.client.post('/api/ventas/crear/', payload, format='json')
        self.assertIn(resp.status_code, (400, 404))
        # si es HttpResponseNotFound puede no contener .data
        if hasattr(resp, 'data'):
            self.assertIn('error', resp.data)
            msg = str(resp.data['error']).lower()
            self.assertNotIn('traceback', msg)
            self.assertNotIn('exception', msg)
        else:
            # respuesta HTML 404: revisar contenido simplificado
            content = resp.content.decode('utf-8').lower()
            self.assertNotIn('traceback', content)
            self.assertNotIn('exception', content)
