from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from empresa.models import Empresa
from inventario.models import Almacen, StockAlmacen
from productos.models import Categoria, Producto
from proveedores.models import Proveedor
from usuarios.models import Rol, TipoDocumento, Usuario

from .models import Compra


class ComprasApiTests(TestCase):
    def setUp(self):
        document_type = TipoDocumento.objects.get(codigo='CC')
        role = Rol.objects.get(nombre='Bodega')
        self.user = Usuario.objects.create(
            tipo_documento=document_type,
            numero_documento='1100200300',
            nombre_completo='Responsable de Bodega',
            email='bodega-compras@example.com',
            username='bodega_compras',
            password='Secret123!',
            rol=role,
        )
        self.other_user = Usuario.objects.create(
            tipo_documento=document_type,
            numero_documento='1100200301',
            nombre_completo='Otro Responsable',
            email='otro-bodega@example.com',
            username='otro_bodega',
            password='Secret123!',
            rol=role,
        )
        self.provider = Proveedor.objects.create(
            tipo_documento=document_type,
            numero_documento='900333444',
            razon_social='Suministros 24 Horas S.A.S.',
            nombre_contacto='María-José Muñoz',
            email='proveedor-compras@example.com',
            telefono='3001234567',
            direccion='Carrera 20 # 10-30',
            pais='Colombia',
            departamento='Antioquia',
            ciudad='Medellín',
            tipo_proveedor='Bienes',
            creado_por=self.user,
        )
        self.category = Categoria.objects.create(
            nombre='Compras Test', creado_por=self.user
        )
        self.product = Producto.objects.create(
            sku='COMPRA-TEST-1',
            nombre='Cemento Tipo 1',
            marca='3M',
            referencia='REF-COMPRA-A1',
            categoria=self.category,
            precio_compra=Decimal('5000'),
            precio_venta=Decimal('7000'),
            creado_por=self.user,
            estado='activo',
        )
        self.warehouse = Almacen.objects.create(
            nombre='Bodega Principal', codigo='BOD-COMPRA', creado_por=self.user
        )
        self.company = Empresa.objects.create(
            nombre_comercial='Ferretería Compras',
            nit='900777111',
            direccion='Calle 1 # 2-3',
            pais='Colombia',
            departamento='Antioquia',
            ciudad='Medellín',
            telefono='6045551111',
            creado_por=self.user,
            actualizado_por=self.user,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def payload(self):
        return {
            'proveedor_id': self.provider.id,
            'almacen_id': self.warehouse.id,
            'numero_factura': '20260001',
            'fecha_compra': '2026-08-07',
            'tipo_compra': 'Contado',
            'observaciones': 'Recepción sin novedades.',
            'registrado_por': self.other_user.id,
            'productos': [{
                'producto_id': self.product.id,
                'cantidad': 3,
                'costo_unitario': '6000.00',
                'iva': '19.00',
            }],
        }

    def test_compra_usa_usuario_autenticado_snapshot_y_detalle_historico(self):
        response = self.client.post('/api/compras/registrar/', self.payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)

        purchase = Compra.objects.get(pk=response.data['compra_id'])
        detail = purchase.detalles.get()
        stock = StockAlmacen.objects.get(producto=self.product, almacen=self.warehouse)
        self.assertEqual(purchase.registrado_por, self.user)
        self.assertEqual(purchase.empresa_snapshot['nombre_comercial'], 'Ferretería Compras')
        self.assertEqual(purchase.observaciones, 'Recepción sin novedades.')
        self.assertEqual(detail.nombre_producto, 'Cemento Tipo 1')
        self.assertEqual(detail.sku_producto, 'COMPRA-TEST-1')
        self.assertEqual(stock.cantidad, 3)
        self.assertEqual(purchase.subtotal, Decimal('18000.00'))
        self.assertEqual(purchase.iva_total, Decimal('3420.00'))
        self.assertEqual(purchase.total, Decimal('21420.00'))

        detail_response = self.client.get(f'/api/compras/detalle/{purchase.id}/')
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data['registrado_por_nombre'], self.user.nombre_completo)
        self.assertEqual(detail_response.data['proveedor_documento'], 'CC 900333444')

    def test_compra_historica_sin_responsable_muestra_no_disponible(self):
        purchase = Compra.objects.create(
            proveedor=self.provider,
            numero_factura='20260002',
            fecha_compra='2026-08-07',
            tipo_compra='Credito',
            registrado_por=None,
        )
        response = self.client.get(f'/api/compras/detalle/{purchase.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['registrado_por_nombre'], 'No disponible')
