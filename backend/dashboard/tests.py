from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from clientes.models import Cliente
from compras.models import Compra
from productos.models import Categoria, Producto
from proveedores.models import Proveedor
from usuarios.models import Rol, TipoDocumento, Usuario
from ventas.models import Venta, DetalleVenta


class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.create(codigo='CC', nombre='Cedula')
        self.rol = Rol.objects.create(nombre='Administrador')
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
