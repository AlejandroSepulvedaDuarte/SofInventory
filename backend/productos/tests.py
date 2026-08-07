from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image

from usuarios.models import Rol, TipoDocumento, Usuario
from .models import Categoria
from .serializers import CategoriaSerializer, ProductoEscrituraSerializer


class CategoriaSerializerTests(TestCase):
    def setUp(self):
        tipo_documento = TipoDocumento.objects.get(codigo='CC')
        rol = Rol.objects.get(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=tipo_documento,
            numero_documento='100200300',
            nombre_completo='Admin Categorías',
            email='admin-categorias@example.com',
            username='admin_categorias',
            password='Secret123!',
            rol=rol,
            fecha_creacion='2026-01-01',
        )
        Categoria.objects.create(
            nombre='Herramientas',
            tipo_control='HERRAMIENTA',
            creado_por=self.usuario,
        )

    def test_duplicado_exacto_devuelve_mensaje_natural_en_espanol(self):
        serializer = CategoriaSerializer(
            data={'nombre': 'Herramientas', 'tipo_control': 'GENERAL'}
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            str(serializer.errors['nombre'][0]),
            'Ya existe una categoría con este nombre.',
        )

    def test_duplicado_sin_importar_mayusculas_devuelve_mismo_mensaje(self):
        serializer = CategoriaSerializer(
            data={'nombre': '  herramientas  ', 'tipo_control': 'GENERAL'}
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            str(serializer.errors['nombre'][0]),
            'Ya existe una categoría con este nombre.',
        )

    def test_categoria_alfanumerica_es_valida_y_categoria_numerica_no(self):
        valid = CategoriaSerializer(
            data={'nombre': 'Químicos 2K', 'tipo_control': 'GENERAL'}
        )
        invalid = CategoriaSerializer(
            data={'nombre': '7777777', 'tipo_control': 'GENERAL'}
        )

        self.assertTrue(valid.is_valid(), valid.errors)
        self.assertFalse(invalid.is_valid())
        self.assertIn('números', str(invalid.errors['nombre'][0]))

    def test_productos_comerciales_y_referencia_alfanumerica_son_validos(self):
        cases = [
            ('WD-40', '3M'),
            ('Alcohol 70%', 'Laboratorios 2K'),
            ('Cemento Tipo 1', 'Marca 24 Horas'),
        ]
        for name, brand in cases:
            with self.subTest(name=name, brand=brand):
                serializer = ProductoEscrituraSerializer(data={
                    'nombre': name,
                    'marca': brand,
                    'referencia': 'REF-2026-A1',
                    'categoria': Categoria.objects.get(nombre='Herramientas').id,
                })
                self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_producto_y_marca_solamente_numericos_se_rechazan(self):
        category_id = Categoria.objects.get(nombre='Herramientas').id
        for field in ('nombre', 'marca'):
            payload = {
                'nombre': 'Taladro 20V',
                'marca': '3M',
                'referencia': 'REF-2026-A1',
                'categoria': category_id,
            }
            payload[field] = '44444444'
            with self.subTest(field=field):
                serializer = ProductoEscrituraSerializer(data=payload)
                self.assertFalse(serializer.is_valid())
                self.assertIn(field, serializer.errors)

    def test_imagen_real_es_valida_y_archivo_disfrazado_se_rechaza(self):
        buffer = BytesIO()
        Image.new('RGB', (32, 32), 'blue').save(buffer, format='PNG')
        valid_image = SimpleUploadedFile(
            'taladro.png', buffer.getvalue(), content_type='image/png'
        )
        valid = ProductoEscrituraSerializer(data={
            'nombre': 'Taladro 20V',
            'marca': '3M',
            'referencia': 'REF-IMG-1',
            'categoria': Categoria.objects.get(nombre='Herramientas').id,
            'imagen': valid_image,
        })
        self.assertTrue(valid.is_valid(), valid.errors)
        self.assertNotEqual(valid.validated_data['imagen'].name, 'taladro.png')

        fake_image = SimpleUploadedFile(
            'taladro.png', b'contenido ejecutable', content_type='image/png'
        )
        invalid = ProductoEscrituraSerializer(data={
            'nombre': 'Taladro 20V',
            'marca': '3M',
            'referencia': 'REF-IMG-2',
            'categoria': Categoria.objects.get(nombre='Herramientas').id,
            'imagen': fake_image,
        })
        self.assertFalse(invalid.is_valid())
        self.assertIn('imagen', invalid.errors)
