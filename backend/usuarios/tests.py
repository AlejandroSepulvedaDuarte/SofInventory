import importlib
import os
from unittest.mock import patch

from django.apps import apps
from django.contrib.auth.hashers import check_password, is_password_usable
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from clientes.models import Cliente

from .models import EventoAuditoriaUsuario, Usuario, Rol, TipoDocumento, SesionAPI


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

    def test_nombre_compuesto_pasaporte_y_username_alfanumerico_son_validos(self):
        self.autenticar()
        passport = TipoDocumento.objects.get(codigo='PA')
        response = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': passport.id,
            'numero_documento': 'PA2026A1',
            'nombre_completo': "  María-José   D'Angelo  ",
            'email': 'maria.dangelo@example.com',
            'username': 'maria.jose_2026',
            'password': 'ClaveUsuarioNueva-2026!',
            'confirm_password': 'ClaveUsuarioNueva-2026!',
            'rol': self.rol_vendedor.id,
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        created = Usuario.objects.get(username='maria.jose_2026')
        self.assertEqual(created.nombre_completo, "María-José D'Angelo")
        self.assertEqual(created.numero_documento, 'PA2026A1')

    def test_nombre_de_usuario_con_numeros_en_nombre_personal_se_rechaza(self):
        self.autenticar()
        response = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '100300400',
            'nombre_completo': 'Juan123 Pérez',
            'email': 'juan123@example.com',
            'username': 'juan_123',
            'password': 'ClaveUsuarioNueva-2027!',
            'confirm_password': 'ClaveUsuarioNueva-2027!',
            'rol': self.rol_vendedor.id,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('nombre_completo', response.data)

    def test_username_con_espacios_se_rechaza(self):
        self.autenticar()
        response = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '100300401',
            'nombre_completo': 'Juan Pérez',
            'email': 'juan.perez@example.com',
            'username': 'juan perez',
            'password': 'ClaveUsuarioNueva-2028!',
            'confirm_password': 'ClaveUsuarioNueva-2028!',
            'rol': self.rol_vendedor.id,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.data)

    def test_operaciones_administrativas_generan_auditoria_sin_secretos(self):
        self.autenticar()
        create = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '100300499',
            'nombre_completo': 'Usuario Auditado',
            'email': 'auditado@example.com',
            'username': 'usuario_auditado',
            'password': 'ClaveAuditoria-2030!',
            'confirm_password': 'ClaveAuditoria-2030!',
            'rol': self.rol_vendedor.id,
        }, format='json')
        self.assertEqual(create.status_code, 201, create.data)
        target = Usuario.objects.get(username='usuario_auditado')

        state = self.client.patch(f'/api/usuarios/estado/{target.id}/', {}, format='json')
        self.assertEqual(state.status_code, 200)
        actions = list(
            EventoAuditoriaUsuario.objects.filter(usuario=target)
            .values_list('accion', flat=True)
        )
        self.assertIn('creacion', actions)
        self.assertIn('cambio_estado', actions)

        report = self.client.get('/api/usuarios/auditoria/')
        self.assertEqual(report.status_code, 200)
        serialized = str(report.data).lower()
        self.assertNotIn('claveauditoria', serialized)
        self.assertNotIn('password', serialized)

    def test_nombre_completo_formado_solo_por_espacios_se_rechaza_en_espanol(self):
        self.autenticar()
        response = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '100300402',
            'nombre_completo': '   ',
            'email': 'espacios@example.com',
            'username': 'nombre_espacios',
            'password': 'ClaveUsuarioNueva-2029!',
            'confirm_password': 'ClaveUsuarioNueva-2029!',
            'rol': self.rol_vendedor.id,
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('nombre_completo', response.data)
        self.assertIn('espacios', str(response.data['nombre_completo'][0]))

    def test_logout_invalida_token(self):
        self.autenticar()
        logout_response = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_response.status_code, 200)

        me_response = self.client.get('/api/auth/me/')
        self.assertEqual(me_response.status_code, 403)


class CredentialBootstrapTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol_admin = Rol.objects.get(nombre='Administrador')

    def crear_admin_legacy(self, password='admin123'):
        return Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='1234567890',
            nombre_completo='Administrador del Sistema',
            email='admin@sofinventory.com',
            username='admin',
            password=password,
            rol=self.rol_admin,
        )

    @patch.dict(os.environ, {
        'INITIAL_ADMIN_USERNAME': 'admin',
        'INITIAL_ADMIN_PASSWORD': 'NuevaClaveSegura-2026!',
    })
    def test_migracion_preserva_relaciones_y_seed_reactiva_admin(self):
        admin = self.crear_admin_legacy()
        cliente = Cliente.objects.create(
            tipo_cliente='natural',
            categoria='general',
            tipo_documento=self.tipo_documento,
            numero_documento='9000001',
            nombres='Cliente historico',
            creado_por=admin,
        )

        migration = importlib.import_module(
            'usuarios.migrations.0006_remove_legacy_admin'
        )
        migration.disable_legacy_admin_password(apps, None)

        admin.refresh_from_db()
        self.assertFalse(is_password_usable(admin.password))
        self.assertEqual(cliente.creado_por_id, admin.pk)
        self.assertTrue(Usuario.objects.filter(pk=admin.pk).exists())

        admin.nombre_completo = 'Administrador preservado'
        admin.save()
        admin.refresh_from_db()
        self.assertFalse(is_password_usable(admin.password))

        call_command('seed_data')

        admin.refresh_from_db()
        self.assertTrue(check_password('NuevaClaveSegura-2026!', admin.password))
        self.assertEqual(cliente.creado_por_id, admin.pk)
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'NuevaClaveSegura-2026!',
        }, format='json')
        self.assertEqual(response.status_code, 200)

    @patch.dict(os.environ, {
        'INITIAL_ADMIN_USERNAME': 'admin',
        'INITIAL_ADMIN_PASSWORD': 'NoDebeReemplazarLaClaveActual!',
    })
    def test_seed_no_reemplaza_una_contrasena_ya_utilizable(self):
        admin = self.crear_admin_legacy(password='ClaveActualSegura-2026!')

        call_command('seed_data')

        admin.refresh_from_db()
        self.assertTrue(check_password('ClaveActualSegura-2026!', admin.password))
        self.assertFalse(check_password(
            'NoDebeReemplazarLaClaveActual!',
            admin.password,
        ))
