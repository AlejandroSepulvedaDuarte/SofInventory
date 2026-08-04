from django.test import TestCase
from rest_framework.test import APIClient

from .models import Usuario, Rol, TipoDocumento, SesionAPI


class AutenticacionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol_admin = Rol.objects.get(nombre='Administrador')
        self.rol_vendedor = Rol.objects.get(nombre='Vendedor')
        self.admin = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='1001',
            nombre_completo='Admin Principal',
            email='admin-test@example.com',
            username='admin_test',
            password='Secret123!',
            rol=self.rol_admin,
            fecha_creacion='2026-01-01',
        )
        self.vendedor = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='1002',
            nombre_completo='Vendedor Uno',
            email='vendedor@example.com',
            username='vendedor',
            password='Secret123!',
            rol=self.rol_vendedor,
            fecha_creacion='2026-01-01',
        )

    def autenticar(self, username='admin_test', password='Secret123!'):
        response = self.client.post('/api/auth/login/', {
            'username': username,
            'password': password,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        token = response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return token

    def test_login_retorna_token_y_usuario(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin_test',
            'password': 'Secret123!',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('access_token', response.data)
        self.assertEqual(response.data['usuario']['rol'], 'Administrador')
        self.assertEqual(SesionAPI.objects.filter(usuario=self.admin, activa=True).count(), 1)

    def test_endpoint_me_requiere_token(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 403)

    def test_endpoint_me_devuelve_usuario_autenticado(self):
        self.autenticar()
        response = self.client.get('/api/auth/me/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['usuario']['username'], 'admin_test')

    def test_permiso_admin_bloquea_vendedor_en_creacion_usuarios(self):
        self.autenticar(username='vendedor')
        response = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '1003',
            'nombre_completo': 'Nuevo Usuario',
            'email': 'nuevo@example.com',
            'username': 'nuevo',
            'password': 'Secret123!',
            'rol': self.rol_vendedor.id,
            'fecha_creacion': '2026-01-01',
        }, format='json')

        self.assertEqual(response.status_code, 403)

    def test_logout_invalida_token(self):
        self.autenticar()
        logout_response = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_response.status_code, 200)

        me_response = self.client.get('/api/auth/me/')
        self.assertEqual(me_response.status_code, 403)
