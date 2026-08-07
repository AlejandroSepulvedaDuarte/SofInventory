import shutil
import tempfile
from io import BytesIO

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from usuarios.models import Rol, TipoDocumento, Usuario

from .models import Empresa


def valid_image(name='logo.png', image_format='PNG', content_type='image/png'):
    buffer = BytesIO()
    Image.new('RGB', (120, 80), '#1f9d8a').save(buffer, format=image_format)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


def valid_png(name='logo.png'):
    return valid_image(name)


class EmpresaApiTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root = tempfile.mkdtemp(prefix='sofinventory-media-tests-')
        cls.override = override_settings(MEDIA_ROOT=cls.media_root)
        cls.override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.override.disable()
        shutil.rmtree(cls.media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        document_type = TipoDocumento.objects.get(codigo='CC')
        admin_role = Rol.objects.get(nombre='Administrador')
        seller_role = Rol.objects.get(nombre='Vendedor')
        self.admin = Usuario.objects.create(
            tipo_documento=document_type,
            numero_documento='900100001',
            nombre_completo='Administradora Empresa',
            email='empresa-admin@example.com',
            username='empresa_admin',
            password='Secret123!',
            rol=admin_role,
        )
        self.seller = Usuario.objects.create(
            tipo_documento=document_type,
            numero_documento='900100002',
            nombre_completo='Vendedor Consulta',
            email='empresa-seller@example.com',
            username='empresa_seller',
            password='Secret123!',
            rol=seller_role,
        )
        self.client = APIClient()
        self.payload = {
            'nombre_comercial': 'Ferretería La Central',
            'razon_social': 'Distribuciones La Central S.A.S.',
            'nit': '900123456',
            'digito_verificacion': '7',
            'direccion': 'Calle 10 # 25-30',
            'pais': 'Colombia',
            'departamento': 'Antioquia',
            'ciudad': 'Medellín',
            'telefono': '6044445566',
            'email': 'contacto@lacentral.example',
            'mensaje_comprobante': 'Gracias por preferirnos.',
            'moneda': 'COP',
        }

    def test_admin_crea_empresa_unica_con_logo_y_otro_usuario_puede_consultarla(self):
        self.client.force_authenticate(self.admin)
        payload = {**self.payload, 'logo': valid_png()}
        response = self.client.post('/api/empresa/', payload, format='multipart')

        self.assertEqual(response.status_code, 201, response.data)
        company = Empresa.objects.get()
        self.assertTrue(company.logo.name.startswith('empresa/logos/'))
        self.assertNotIn('logo.png', company.logo.name)

        second = self.client.post('/api/empresa/', self.payload, format='multipart')
        self.assertEqual(second.status_code, 409)
        self.assertEqual(Empresa.objects.count(), 1)

        self.client.force_authenticate(self.seller)
        read = self.client.get('/api/empresa/')
        self.assertEqual(read.status_code, 200)
        self.assertTrue(read.data['configurada'])
        self.assertFalse(read.data['puede_editar'])
        self.assertEqual(read.data['empresa']['nombre_comercial'], 'Ferretería La Central')

    def test_usuario_no_admin_no_puede_modificar_y_empresa_no_se_elimina(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post('/api/empresa/', self.payload).status_code, 201)

        self.client.force_authenticate(self.seller)
        forbidden = self.client.patch('/api/empresa/', {'telefono': '3000000000'})
        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(self.client.delete('/api/empresa/').status_code, 405)

    def test_rechaza_archivo_disfrazado_de_imagen(self):
        self.client.force_authenticate(self.admin)
        fake = SimpleUploadedFile('logo.png', b'<script>alert(1)</script>', content_type='image/png')
        response = self.client.post(
            '/api/empresa/', {**self.payload, 'logo': fake}, format='multipart'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('logo', response.data['errors'])
        self.assertEqual(Empresa.objects.count(), 0)

    def test_acepta_jpeg_y_webp_y_rechaza_archivo_demasiado_grande(self):
        self.client.force_authenticate(self.admin)
        formats = (
            ('logo.jpg', 'JPEG', 'image/jpeg'),
            ('logo.jpeg', 'JPEG', 'image/jpeg'),
            ('logo.webp', 'WEBP', 'image/webp'),
        )
        for name, image_format, content_type in formats:
            with self.subTest(image_format=image_format, name=name):
                response = self.client.post(
                    '/api/empresa/',
                    {
                        **self.payload,
                        'logo': valid_image(name, image_format, content_type),
                    },
                    format='multipart',
                )
                self.assertEqual(response.status_code, 201, response.data)
                self.assertTrue(Empresa.objects.get().logo.name.endswith(('.jpg', '.webp')))
                Empresa.objects.all().delete()

        oversized_buffer = BytesIO()
        Image.effect_noise((2048, 2048), 100).save(oversized_buffer, format='PNG')
        self.assertGreater(len(oversized_buffer.getvalue()), 2 * 1024 * 1024)
        oversized = SimpleUploadedFile(
            'logo.png', oversized_buffer.getvalue(), content_type='image/png'
        )
        response = self.client.post(
            '/api/empresa/', {**self.payload, 'logo': oversized}, format='multipart'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('2 MB', str(response.data['errors']['logo'][0]))

    def test_cambia_elimina_y_conserva_logo_si_otra_validacion_falla(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            '/api/empresa/', {**self.payload, 'logo': valid_png()}, format='multipart'
        )
        self.assertEqual(created.status_code, 201, created.data)
        company = Empresa.objects.get()
        original_name = company.logo.name
        self.assertTrue(company.logo.storage.exists(original_name))

        invalid = self.client.patch(
            '/api/empresa/',
            {
                'nombre_comercial': '   ',
                'logo': valid_image('nuevo.webp', 'WEBP', 'image/webp'),
            },
            format='multipart',
        )
        self.assertEqual(invalid.status_code, 400)
        company.refresh_from_db()
        self.assertEqual(company.logo.name, original_name)
        self.assertTrue(company.logo.storage.exists(original_name))

        with self.captureOnCommitCallbacks(execute=True):
            changed = self.client.patch(
                '/api/empresa/',
                {'logo': valid_image('nuevo.jpg', 'JPEG', 'image/jpeg')},
                format='multipart',
            )
        self.assertEqual(changed.status_code, 200, changed.data)
        company.refresh_from_db()
        changed_name = company.logo.name
        self.assertNotEqual(changed_name, original_name)
        self.assertFalse(company.logo.storage.exists(original_name))

        with self.captureOnCommitCallbacks(execute=True):
            removed = self.client.patch(
                '/api/empresa/', {'quitar_logo': True}, format='multipart'
            )
        self.assertEqual(removed.status_code, 200, removed.data)
        company.refresh_from_db()
        self.assertFalse(company.logo)
        self.assertFalse(company.logo.storage.exists(changed_name))
