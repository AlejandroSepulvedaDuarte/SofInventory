import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from usuarios.models import TipoDocumento, Rol, Usuario
from proveedores.views import crear_proveedor

factory = APIRequestFactory()

# Preparar datos base: tipo documento, rol y usuario autenticado
td, _ = TipoDocumento.objects.get_or_create(codigo='CC', defaults={'nombre': 'Cédula'})
rol, _ = Rol.objects.get_or_create(nombre='Administrador')
user = Usuario.objects.create(
    tipo_documento=td,
    numero_documento='999999',
    nombre_completo='Test Admin',
    email='admin@test.local',
    username='admin_test',
    password='pass',
    rol=rol,
    fecha_creacion='2020-01-01'
)

def post(payload):
    req = factory.post('/proveedores/crear/', payload, format='json')
    req.user = user
    resp = crear_proveedor(req)
    print('Payload:', json.dumps(payload, ensure_ascii=False))
    print('Status:', resp.status_code)
    print('Data:', resp.data)
    print('---')

# 1) Crear proveedor válido
valid = {
    'tipo_documento': td.id,
    'numero_documento': '1234567890',
    'razon_social': 'Proveedor A',
    'nombre_contacto': 'Juan Pérez',
    'email': 'proveedora@example.com',
    'telefono': '3001234567',
    'direccion': 'Calle 1',
    'pais': 'Colombia',
    'departamento': 'Antioquia',
    'ciudad': 'Medellín',
    'tipo_proveedor': 'Bienes',
    'estado': 'Activo'
}
post(valid)

# 2) Crear proveedor con documento repetido
dup_doc = dict(valid)
dup_doc['email'] = 'other@example.com'
post(dup_doc)

# 3) Crear proveedor con letras en documento
letters = dict(valid)
letters['numero_documento'] = 'ABC123'
letters['email'] = 'letters@example.com'
letters['razon_social'] = 'Proveedor Letras'
post(letters)

# 4) Crear proveedor con más de 10 dígitos
longdoc = dict(valid)
longdoc['numero_documento'] = '1234567890123'
longdoc['email'] = 'long@example.com'
longdoc['razon_social'] = 'Proveedor Largo'
post(longdoc)
