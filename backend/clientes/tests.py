from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import Usuario, Rol, TipoDocumento
from .models import Cliente


class ClienteAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tipo_documento = TipoDocumento.objects.get(codigo='CC')
        self.rol = Rol.objects.get(nombre='Administrador')
        self.usuario = Usuario.objects.create(
            tipo_documento=self.tipo_documento,
            numero_documento='1001',
            nombre_completo='Admin Principal',
            email='admin-clientes@example.com',
            username='admin_clientes',
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
            'ciudad': 'Soacha',
            'estado': 'activo',
            'notas': '',
            'creado_por': self.usuario.id,
        }

    def autenticar(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'admin_clientes',
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
        self.assertIn('dígitos', str(resp.data).lower())

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

    def test_nombres_compuestos_lugares_y_direccion_numerica_son_validos(self):
        self.autenticar()
        payload = {
            **self.payload,
            'nombres': '  María-José   del Pilar  ',
            'apellidos': "D'Angelo Muñoz",
            'ciudad': 'San Andrés',
            'departamento': 'Archipiélago de San Andrés',
            'direccion': 'Calle 10 # 25-30',
        }

        response = self.client.post('/api/clientes/crear/', payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        cliente = Cliente.objects.get(numero_documento=self.payload['numero_documento'])
        self.assertEqual(cliente.nombres, 'María-José del Pilar')
        self.assertEqual(cliente.direccion, 'Calle 10 # 25-30')

    def test_pasaporte_alfanumerico_es_valido(self):
        self.autenticar()
        passport = TipoDocumento.objects.get(codigo='PA')
        payload = {
            **self.payload,
            'tipo_documento': passport.id,
            'numero_documento': 'AB123456',
        }

        response = self.client.post('/api/clientes/crear/', payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)

    def test_nombres_con_numeros_o_solo_espacios_se_rechazan(self):
        self.autenticar()
        for field, value in [
            ('nombres', 'Juan123'),
            ('apellidos', '555Pedro'),
            ('nombres', '   '),
            ('apellidos', "---''"),
        ]:
            with self.subTest(field=field, value=value):
                response = self.client.post(
                    '/api/clientes/crear/',
                    {**self.payload, field: value},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_catalogo_colombia_es_unico_y_completo(self):
        self.autenticar()

        response = self.client.get('/api/catalogos/ubicaciones/colombia/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['department_count'], 33)
        self.assertEqual(response.data['municipality_count'], 1122)
        bogota = next(item for item in response.data['departments'] if item['code'] == '11')
        self.assertEqual(bogota['name'], 'Bogotá D. C.')
        self.assertEqual(bogota['municipalities'][0]['code'], '11001')

    def test_crear_cliente_colombiano_canoniza_variantes_legacy(self):
        self.autenticar()
        payload = {
            **self.payload,
            'departamento': '  bogota dc ',
            'ciudad': 'bogota',
        }

        response = self.client.post('/api/clientes/crear/', payload, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        cliente = Cliente.objects.get(numero_documento=self.payload['numero_documento'])
        self.assertEqual(cliente.pais, 'Colombia')
        self.assertEqual(cliente.departamento, 'Bogotá D. C.')
        self.assertEqual(cliente.ciudad, 'Bogotá D. C.')

    def test_rechaza_ciudad_colombiana_de_otro_departamento(self):
        self.autenticar()

        response = self.client.post(
            '/api/clientes/crear/',
            {**self.payload, 'departamento': 'Antioquia', 'ciudad': 'Cali'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('ciudad', response.data)
        self.assertIn('no pertenece', str(response.data['ciudad']).lower())

    def test_crear_y_editar_cliente_extranjero_normaliza_ubicacion(self):
        self.autenticar()
        payload = {
            **self.payload,
            'pais': '  México  ',
            'departamento': '  Jalisco  ',
            'ciudad': '  Guadalajara  ',
        }
        created = self.client.post('/api/clientes/crear/', payload, format='json')
        self.assertEqual(created.status_code, 201, created.data)
        cliente_id = created.data['cliente']['id']

        edited = self.client.put(
            f'/api/clientes/editar/{cliente_id}/',
            {
                **payload,
                'tipo_cliente': 'natural',
                'categoria': 'general',
                'ciudad': 'Puerto Vallarta',
            },
            format='json',
        )

        self.assertEqual(edited.status_code, 200, edited.data)
        cliente = Cliente.objects.get(pk=cliente_id)
        self.assertEqual(cliente.pais, 'México')
        self.assertEqual(cliente.departamento, 'Jalisco')
        self.assertEqual(cliente.ciudad, 'Puerto Vallarta')

    def test_ubicacion_extranjera_numerica_o_vacia_se_rechaza(self):
        self.autenticar()
        for field, value in [('pais', '555'), ('departamento', '   '), ('ciudad', '777')]:
            with self.subTest(field=field):
                response = self.client.post(
                    '/api/clientes/crear/',
                    {
                        **self.payload,
                        'pais': 'México',
                        'departamento': 'Jalisco',
                        'ciudad': 'Guadalajara',
                        field: value,
                    },
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)

    def test_editar_cliente_colombiano_y_conservar_ubicacion_legacy(self):
        self.autenticar()
        cliente = Cliente.objects.create(
            tipo_cliente='natural',
            categoria='general',
            tipo_documento=self.tipo_documento,
            numero_documento='900100777',
            nombres='Cliente',
            apellidos='Antiguo',
            email='legacy-cliente@example.com',
            pais='Colombia',
            departamento='Cundinamarca',
            ciudad='Bogota',
            estado='activo',
            creado_por=self.usuario,
        )
        payload = {
            **self.payload,
            'tipo_cliente': 'natural',
            'categoria': 'general',
            'numero_documento': cliente.numero_documento,
            'nombres': cliente.nombres,
            'apellidos': 'Actualizado',
            'email': cliente.email,
            'departamento': cliente.departamento,
            'ciudad': cliente.ciudad,
        }

        response = self.client.put(
            f'/api/clientes/editar/{cliente.id}/', payload, format='json'
        )

        self.assertEqual(response.status_code, 200, response.data)
        cliente.refresh_from_db()
        self.assertEqual(cliente.ciudad, 'Bogota')
        self.assertEqual(cliente.apellidos, 'Actualizado')

    def test_lugares_con_numeros_se_rechazan(self):
        self.autenticar()
        for field, value in [
            ('pais', 'Colombia123'),
            ('departamento', '444444'),
            ('ciudad', 'Ciudad 55'),
        ]:
            with self.subTest(field=field):
                response = self.client.post(
                    '/api/clientes/crear/',
                    {**self.payload, field: value},
                    format='json',
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)
