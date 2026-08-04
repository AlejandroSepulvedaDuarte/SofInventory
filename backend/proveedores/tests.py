from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import Usuario, Rol, TipoDocumento
from .models import Proveedor


class ProveedorAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol = Rol.objects.get(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='1001',
            nombre_completo='Admin Principal',
            email='admin-proveedores@example.com',
            username='admin_proveedores',
            password='Secret123!',
            rol=self.rol,
            fecha_creacion='2026-01-01',
        )
        self.payload = {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '900100200',
            'razon_social': 'Ferreteria Central SAS',
            'nombre_contacto': 'Laura Gomez',
            'cargo_contacto': 'Compras',
            'email': 'proveedor@example.com',
            'telefono': '3001234567',
            'direccion': 'Calle 1',
            'pais': 'Colombia',
            'departamento': 'Cundinamarca',
            'ciudad': 'Bogota',
            'tipo_proveedor': 'Bienes',
            'estado': 'Activo',
            'observaciones': '',
            'creado_por': self.usuario.id,
        }

    def autenticar(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin_proveedores',
            'password': 'Secret123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")

    def test_no_permite_razon_social_duplicada_sin_importar_mayusculas(self):
        self.autenticar()
        response_1 = self.client.post('/api/proveedores/crear/', self.payload, format='json')
        self.assertEqual(response_1.status_code, 201)

        payload_duplicado = {**self.payload, 'numero_documento': '900100201', 'email': 'otro@example.com'}
        payload_duplicado['razon_social'] = '  ferreteria central sas  '

        response_2 = self.client.post('/api/proveedores/crear/', payload_duplicado, format='json')

        self.assertEqual(response_2.status_code, 400)
        self.assertIn('razon social', str(response_2.data).lower())

    def test_normaliza_razon_social_al_guardar(self):
        self.autenticar()
        payload = {**self.payload, 'razon_social': '  Distribuciones Norte  '}
        response = self.client.post('/api/proveedores/crear/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        proveedor = Proveedor.objects.get(numero_documento='900100200')
        self.assertEqual(proveedor.razon_social, 'Distribuciones Norte')

    def test_telefono_valido_permite_crear(self):
        self.autenticar()
        payload = {**self.payload, 'telefono': '3123456789', 'numero_documento': '900200300', 'email': 'telvalido@example.com'}
        response = self.client.post('/api/proveedores/crear/', payload, format='json')
        self.assertEqual(response.status_code, 201)

    def test_telefono_con_letras_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'telefono': '300ABC123', 'numero_documento': '900200301', 'email': 'telletras@example.com'}
        response = self.client.post('/api/proveedores/crear/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        # Espera mensaje claro en español
        msg = ''
        if isinstance(response.data, dict):
            msg = ' '.join([str(v) for v in response.data.values()])
        else:
            msg = str(response.data)
        self.assertIn('teléfon', msg.lower() or msg.lower())
        self.assertIn('númer', msg.lower() or msg.lower())

    def test_telefono_con_especiales_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'telefono': '+57-300-123-4567', 'numero_documento': '900200302', 'email': 'telesp@example.com'}
        response = self.client.post('/api/proveedores/crear/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        msg = ''
        if isinstance(response.data, dict):
            msg = ' '.join([str(v) for v in response.data.values()])
        else:
            msg = str(response.data)
        self.assertIn('teléfon', msg.lower() or msg.lower())
        self.assertIn('númer', msg.lower() or msg.lower())

    def test_telefono_mas_largo_rechazado(self):
        self.autenticar()
        long_tel = '1' * 25
        payload = {**self.payload, 'telefono': long_tel, 'numero_documento': '900200303', 'email': 'tellong@example.com'}
        response = self.client.post('/api/proveedores/crear/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        msg = ''
        if isinstance(response.data, dict):
            msg = ' '.join([str(v) for v in response.data.values()])
        else:
            msg = str(response.data)
        self.assertIn('teléfon', msg.lower() or msg.lower())
        self.assertIn('máximo', msg.lower() or msg.lower())
