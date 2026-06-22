from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import Usuario, Rol, TipoDocumento
from .models import Cliente


class ClienteAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.create(codigo='CC', nombre='Cédula')
        self.rol = Rol.objects.create(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='1001',
            nombre_completo='Admin Principal',
            email='admin@example.com',
            username='admin',
            password='Secret123!',
            rol=self.rol,
            fecha_creacion='2026-01-01',
        )
        self.payload = {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '900100200',
            'nombres': 'Cliente',
            'apellidos': 'Prueba',
            'email': 'cliente@example.com',
            'telefono': '3001234567',
            'direccion': 'Calle 1',
            'pais': 'Colombia',
            'departamento': 'Cundinamarca',
            'ciudad': 'Bogota',
            'estado': 'activo',
            'notas': '',
            'creado_por': self.usuario.id,
        }

    def autenticar(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'Secret123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access_token']}")

    def test_crear_cliente_valido(self):
        self.autenticar()
        response = self.client.post('/api/clientes/crear/', self.payload, format='json')
        self.assertEqual(response.status_code, 201)

    def test_numero_documento_obligatorio_muestra_error_espanol(self):
        self.autenticar()
        payload = {**self.payload}
        payload.pop('numero_documento', None)
        response = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        msg = ' '.join([str(v) for v in response.data.values()]) if isinstance(response.data, dict) else str(response.data)
        self.assertIn('número de documento', msg.lower())
        self.assertIn('obligatorio', msg.lower())

    def test_documento_repetido_rechazado(self):
        self.autenticar()
        resp1 = self.client.post('/api/clientes/crear/', self.payload, format='json')
        self.assertEqual(resp1.status_code, 201)
        payload_dup = {**self.payload, 'numero_documento': self.payload['numero_documento']}
        resp2 = self.client.post('/api/clientes/crear/', payload_dup, format='json')
        self.assertEqual(resp2.status_code, 400)
        msg = ''
        if isinstance(resp2.data, dict):
            msg = ' '.join([str(v) for v in resp2.data.values()])
        else:
            msg = str(resp2.data)
        self.assertIn('documento', msg.lower())

    def test_correo_repetido_rechazado(self):
        self.autenticar()
        resp1 = self.client.post('/api/clientes/crear/', self.payload, format='json')
        self.assertEqual(resp1.status_code, 201)
        payload_dup = {**self.payload, 'numero_documento': '900100201', 'email': self.payload['email']}
        resp2 = self.client.post('/api/clientes/crear/', payload_dup, format='json')
        self.assertEqual(resp2.status_code, 400)
        msg = ''
        if isinstance(resp2.data, dict):
            msg = ' '.join([str(v) for v in resp2.data.values()])
        else:
            msg = str(resp2.data)
        self.assertIn('correo', msg.lower())

    def test_razon_social_duplicada_rechazada(self):
        self.autenticar()
        first_payload = {
            **self.payload,
            'tipo_cliente': 'juridica',
            'razon_social': 'Empresa ABC SAS',
            'nombre_comercial': 'ABC Store',
            'numero_documento': '900100300',
            'email': 'empresa1@example.com',
        }
        resp1 = self.client.post('/api/clientes/crear/', first_payload, format='json')
        self.assertEqual(resp1.status_code, 201)

        payload_dup = {
            **first_payload,
            'numero_documento': '900100301',
            'email': 'empresa2@example.com',
        }
        resp2 = self.client.post('/api/clientes/crear/', payload_dup, format='json')
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('razón social', str(resp2.data).lower())

    def test_nombre_comercial_duplicado_rechazado(self):
        self.autenticar()
        first_payload = {
            **self.payload,
            'tipo_cliente': 'juridica',
            'razon_social': 'Empresa ABC SAS',
            'nombre_comercial': 'ABC Store',
            'numero_documento': '900100400',
            'email': 'empresa3@example.com',
        }
        resp1 = self.client.post('/api/clientes/crear/', first_payload, format='json')
        self.assertEqual(resp1.status_code, 201)

        payload_dup = {
            **first_payload,
            'numero_documento': '900100401',
            'email': 'otro3@example.com',
        }
        resp2 = self.client.post('/api/clientes/crear/', payload_dup, format='json')
        self.assertEqual(resp2.status_code, 400)
        self.assertIn('nombre comercial', str(resp2.data).lower())

    def test_nombre_comercial_no_debe_ser_igual_a_razon_social(self):
        self.autenticar()
        payload = {**self.payload, 'tipo_cliente': 'juridica', 'razon_social': 'Empresa ABC SAS', 'nombre_comercial': 'Empresa ABC SAS'}
        resp = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        msg = ' '.join([str(v) for v in resp.data.values()]) if isinstance(resp.data, dict) else str(resp.data)
        self.assertIn('no debe ser igual', msg.lower())

    def test_documento_con_letras_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'numero_documento': 'ABC123'}
        resp = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('no se permiten letras', str(resp.data).lower())

    def test_documento_menor_6_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'numero_documento': '12345'}
        resp = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('entre 6 y 10', str(resp.data).lower())

    def test_documento_mayor_10_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'numero_documento': '1' * 11}
        resp = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('entre 6 y 10', str(resp.data).lower())

    def test_telefono_con_letras_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'telefono': '300ABC123'}
        resp = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('teléfon', str(resp.data).lower())

    def test_telefono_invalido_rechazado(self):
        self.autenticar()
        payload = {**self.payload, 'telefono': '1' * 20}
        resp = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('máximo', str(resp.data).lower())
