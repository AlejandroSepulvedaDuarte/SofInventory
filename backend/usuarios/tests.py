import importlib
import os
from unittest.mock import patch

from django.apps import apps
from django.contrib.auth.hashers import check_password, is_password_usable
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
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


@override_settings(LOGIN_THROTTLE_RATE='3/min')
class LoginThrottlingTests(TestCase):
    """El endpoint login limita intentos por IP para reducir fuerza bruta y
    bloqueos intencionales de cuenta."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol_vendedor = Rol.objects.get(nombre='Vendedor')
        self.vendedor = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='3001',
            nombre_completo='Vendedor Throttle',
            email='vendedor-throttle@example.com',
            username='vendedor_throttle',
            password='Secret123!',
            rol=self.rol_vendedor,
            fecha_creacion='2026-01-01',
        )

    def tearDown(self):
        cache.clear()

    def login(self, password='ClaveEquivocada-2026!'):
        return self.client.post('/api/auth/login/', {
            'username': self.vendedor.username,
            'password': password,
        }, format='json')

    def test_login_correcto_funciona_dentro_del_limite(self):
        response = self.login(password='Secret123!')
        self.assertEqual(response.status_code, 200)

    def test_intentos_fallidos_dentro_del_limite_devuelven_401(self):
        for _ in range(3):
            response = self.login()
            self.assertEqual(response.status_code, 401)
            self.assertIn('intentos_fallidos', response.data)

    def test_superado_el_limite_devuelve_429(self):
        for _ in range(3):
            self.assertEqual(self.login().status_code, 401)
        response = self.login()
        self.assertEqual(response.status_code, 429)

    def test_login_correcto_funciona_despues_de_intentos_fallidos_dentro_del_limite(self):
        for _ in range(2):
            self.assertEqual(self.login().status_code, 401)
        response = self.login(password='Secret123!')
        self.assertEqual(response.status_code, 200)


class AutorizacionRolTests(TestCase):
    """El backend es la fuente de verdad del rol: un Vendedor recibe 403 en
    endpoints de Administrador aunque el frontend muestre un rol alterado."""

    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol_admin = Rol.objects.get(nombre='Administrador')
        self.rol_vendedor = Rol.objects.get(nombre='Vendedor')
        self.admin = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='2001',
            nombre_completo='Admin Autorizacion',
            email='admin-autorizacion@example.com',
            username='admin_autorizacion',
            password='Secret123!',
            rol=self.rol_admin,
            fecha_creacion='2026-01-01',
        )
        self.vendedor = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='2002',
            nombre_completo='Vendedor Autorizacion',
            email='vendedor-autorizacion@example.com',
            username='vendedor_autorizacion',
            password='Secret123!',
            rol=self.rol_vendedor,
            fecha_creacion='2026-01-01',
        )

    def autenticar(self, user):
        response = self.client.post('/api/auth/login/', {
            'username': user.username,
            'password': 'Secret123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        token = response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_vendedor_recibe_403_en_endpoints_de_administrador(self):
        self.autenticar(self.vendedor)

        endpoints = [
            ('post', '/api/usuarios/crear/', {
                'tipo_documento': self.tipo_documento.id,
                'numero_documento': '2003',
                'nombre_completo': 'Bloqueado',
                'email': 'bloqueado@example.com',
                'username': 'bloqueado',
                'password': 'ClaveBloqueada-2026!',
                'confirm_password': 'ClaveBloqueada-2026!',
                'rol': self.rol_vendedor.id,
            }),
            ('get', '/api/usuarios/listar/', None),
            ('get', '/api/usuarios/auditoria/', None),
            ('get', '/api/roles/reporte/', None),
            ('patch', f'/api/usuarios/estado/{self.admin.id}/', {}),
            ('post', f'/api/usuarios/desbloquear/{self.admin.id}/', {}),
            ('put', f'/api/usuarios/editar/{self.admin.id}/', {'email': 'cambiado@example.com'}),
        ]

        for method, url, data in endpoints:
            if data is None:
                response = getattr(self.client, method)(url)
            else:
                response = getattr(self.client, method)(url, data=data, format='json')
            self.assertEqual(
                response.status_code, 403,
                f'{method.upper()} {url} debería devolver 403 y devolvió {response.status_code}',
            )

    def test_vendedor_no_escala_aunque_envie_rol_de_admin(self):
        self.autenticar(self.vendedor)
        response = self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '2004',
            'nombre_completo': 'Intento Escalada',
            'email': 'escalada@example.com',
            'username': 'escalada',
            'password': 'ClaveEscalada-2026!',
            'confirm_password': 'ClaveEscalada-2026!',
            'rol': self.rol_admin.id,
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(Usuario.objects.filter(username='escalada').exists())

    def test_vendedor_puede_usar_endpoints_de_su_rol(self):
        self.autenticar(self.vendedor)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['usuario']['rol'], 'Vendedor')

    def test_admin_puede_usar_endpoints_de_administrador(self):
        self.autenticar(self.admin)
        response = self.client.get('/api/usuarios/listar/')
        self.assertEqual(response.status_code, 200)


class ValidacionFortalezaContrasenaTests(TestCase):
    """Se aplican los validadores oficiales de Django (mensajes en español)
    al crear y actualizar usuarios, sin tocar contraseñas existentes."""

    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol_admin = Rol.objects.get(nombre='Administrador')
        self.rol_vendedor = Rol.objects.get(nombre='Vendedor')
        self.admin = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='4001',
            nombre_completo='Admin Password',
            email='admin-password@example.com',
            username='admin_password',
            password='Secret123!',
            rol=self.rol_admin,
            fecha_creacion='2026-01-01',
        )

    def autenticar(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin_password',
            'password': 'Secret123!',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        token = response.data['access_token']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def crear_con_password(self, password):
        return self.client.post('/api/usuarios/crear/', {
            'tipo_documento': self.tipo_documento.id,
            'numero_documento': '40020001',
            'nombre_completo': 'Usuario Clave',
            'email': 'clave@example.com',
            'username': 'usuario_clave',
            'password': password,
            'confirm_password': password,
            'rol': self.rol_vendedor.id,
        }, format='json')

    def test_contrasena_corta_se_rechaza_con_mensaje_en_espanol(self):
        self.autenticar()
        response = self.crear_con_password('abc')
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)
        self.assertIn('corta', str(response.data['password'][0]).lower())

    def test_contrasena_numerica_se_rechaza(self):
        self.autenticar()
        response = self.crear_con_password('1928374655')
        self.assertEqual(response.status_code, 400)
        self.assertIn('numérica', str(response.data['password'][0]).lower())

    def test_contrasena_comun_se_rechaza(self):
        self.autenticar()
        response = self.crear_con_password('password')
        self.assertEqual(response.status_code, 400)
        self.assertIn('común', str(response.data['password'][0]).lower())

    def test_contrasena_fuerte_es_valida(self):
        self.autenticar()
        response = self.crear_con_password('ClaveFuerte-Nueva-2026!')
        self.assertEqual(response.status_code, 201, response.data)

    def test_actualizacion_con_contrasena_similar_al_username_se_rechaza(self):
        self.autenticar()
        response = self.client.put(f'/api/usuarios/editar/{self.admin.id}/', {
            'password': 'admin_password123',
            'confirm_password': 'admin_password123',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('similar', str(response.data['password'][0]).lower())

    def test_actualizacion_sin_cambiar_password_no_valida_la_existente(self):
        self.autenticar()
        response = self.client.put(f'/api/usuarios/editar/{self.admin.id}/', {
            'email': 'otro-correo@example.com',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.admin.refresh_from_db()
        self.assertTrue(check_password('Secret123!', self.admin.password))
