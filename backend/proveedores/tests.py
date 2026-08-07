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
            'ciudad': 'Soacha',
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
        self.assertIn('razón social', str(response_2.data).lower())

    def test_normaliza_razon_social_al_guardar(self):
        self.autenticar()
        payload = {**self.payload, 'razon_social': '  Distribuciones Norte  '}
        response = self.client.post('/api/proveedores/crear/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        proveedor = Proveedor.objects.get(numero_documento='900100200')
        self.assertEqual(proveedor.razon_social, 'Distribuciones Norte')

    def test_duplicados_exactos_devuelven_mensajes_naturales_en_espanol(self):
        self.autenticar()
        response_1 = self.client.post('/api/proveedores/crear/', self.payload, format='json')
        self.assertEqual(response_1.status_code, 201)

        response_documento = self.client.post(
            '/api/proveedores/crear/',
            {**self.payload, 'razon_social': 'Proveedor Documento', 'email': 'documento@example.com'},
            format='json',
        )
        self.assertEqual(response_documento.status_code, 400)
        self.assertEqual(
            str(response_documento.data['errors']['numero_documento'][0]),
            'El número de documento ya se encuentra registrado.',
        )

        response_email = self.client.post(
            '/api/proveedores/crear/',
            {**self.payload, 'numero_documento': '900100299', 'razon_social': 'Proveedor Correo'},
            format='json',
        )
        self.assertEqual(response_email.status_code, 400)
        self.assertEqual(
            str(response_email.data['errors']['email'][0]),
            'El correo electrónico ya se encuentra registrado.',
        )

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

    def test_datos_semanticos_comerciales_y_nit_con_guion_son_validos(self):
        self.autenticar()
        nit = TipoDocumento.objects.get(codigo='NIT')
        payload = {
            **self.payload,
            'tipo_documento': nit.id,
            'numero_documento': '900123456-7',
            'razon_social': 'Distribuciones 24 Horas S.A.S.',
            'nombre_contacto': 'María-José Muñoz',
            'cargo_contacto': 'Técnico-administrativo',
            'ciudad': 'El Carmen de Viboral',
            'departamento': 'Antioquia',
            'direccion': 'Carrera 30 # 10-55',
        }

        response = self.client.post('/api/proveedores/crear/', payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        proveedor = Proveedor.objects.get(numero_documento='900123456-7')
        self.assertEqual(proveedor.nombre_contacto, 'María-José Muñoz')
        self.assertEqual(proveedor.direccion, 'Carrera 30 # 10-55')

    def test_campos_semanticos_invalidos_se_rechazan_por_campo(self):
        self.autenticar()
        cases = [
            ('razon_social', '44444444'),
            ('nombre_contacto', 'Juan123'),
            ('nombre_contacto', "---''"),
            ('cargo_contacto', 'Gerente123'),
            ('cargo_contacto', '   '),
            ('pais', 'Colombia123'),
            ('departamento', '444444'),
            ('ciudad', 'Ciudad 55'),
        ]
        for field, value in cases:
            with self.subTest(field=field, value=value):
                response = self.client.post(
                    '/api/proveedores/crear/',
                    {**self.payload, field: value},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data['errors'])

    def test_crear_y_editar_proveedor_colombiano(self):
        self.autenticar()
        created = self.client.post('/api/proveedores/crear/', self.payload, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        proveedor = Proveedor.objects.get(numero_documento=self.payload['numero_documento'])

        edited = self.client.put(
            f'/api/proveedores/editar/{proveedor.id}/',
            {'departamento': 'Antioquia', 'ciudad': 'Medellín', 'pais': 'Colombia'},
            format='json',
        )

        self.assertEqual(edited.status_code, 200, edited.data)
        proveedor.refresh_from_db()
        self.assertEqual(proveedor.departamento, 'Antioquia')
        self.assertEqual(proveedor.ciudad, 'Medellín')

    def test_rechaza_combinacion_colombiana_invalida(self):
        self.autenticar()

        response = self.client.post(
            '/api/proveedores/crear/',
            {**self.payload, 'departamento': 'Antioquia', 'ciudad': 'Cali'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('ciudad', response.data['errors'])
        self.assertIn('no pertenece', str(response.data['errors']['ciudad']).lower())

    def test_crear_y_editar_proveedor_extranjero(self):
        self.autenticar()
        payload = {
            **self.payload,
            'pais': '  México ',
            'departamento': ' Jalisco ',
            'ciudad': ' Guadalajara ',
        }
        created = self.client.post('/api/proveedores/crear/', payload, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        proveedor = Proveedor.objects.get(numero_documento=self.payload['numero_documento'])

        edited = self.client.put(
            f'/api/proveedores/editar/{proveedor.id}/',
            {'pais': 'México', 'departamento': 'Nuevo León', 'ciudad': 'Monterrey'},
            format='json',
        )

        self.assertEqual(edited.status_code, 200, edited.data)
        proveedor.refresh_from_db()
        self.assertEqual(proveedor.pais, 'México')
        self.assertEqual(proveedor.departamento, 'Nuevo León')
        self.assertEqual(proveedor.ciudad, 'Monterrey')

    def test_proveedor_extranjero_numerico_se_rechaza(self):
        self.autenticar()
        response = self.client.post(
            '/api/proveedores/crear/',
            {
                **self.payload,
                'pais': 'México',
                'departamento': '555',
                'ciudad': 'Guadalajara',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('departamento', response.data['errors'])

    def test_edicion_parcial_conserva_ubicacion_legacy(self):
        self.autenticar()
        proveedor = Proveedor.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='900100778',
            razon_social='Proveedor Legacy SAS',
            nombre_contacto='Laura Gómez',
            email='legacy-proveedor@example.com',
            telefono='3008887777',
            direccion='Calle 10 # 20-30',
            pais='Colombia',
            departamento='Cundinamarca',
            ciudad='Bogota',
            tipo_proveedor='Bienes',
            estado='Activo',
            creado_por=self.usuario,
        )

        response = self.client.put(
            f'/api/proveedores/editar/{proveedor.id}/',
            {'observaciones': 'Dato antiguo conservado'},
            format='json',
        )

        self.assertEqual(response.status_code, 200, response.data)
        proveedor.refresh_from_db()
        self.assertEqual(proveedor.ciudad, 'Bogota')
