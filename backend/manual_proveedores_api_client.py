import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from usuarios.models import TipoDocumento, Rol, Usuario

# Preparar datos base: tipo documento, rol y usuario autenticado
td, _ = TipoDocumento.objects.get_or_create(codigo='CC', defaults={'nombre': 'Cédula'})
rol, _ = Rol.objects.get_or_create(nombre='Administrador')
user, created = Usuario.objects.get_or_create(
    username='admin_test2',
    defaults={
        'tipo_documento': td,
        'numero_documento': '999998',
        'nombre_completo': 'Test Admin',
        'email': 'admin2@test.local',
        'password': 'pass',
        'rol': rol,
        'fecha_creacion': '2020-01-01'
    }
)

client = APIClient()
client.force_authenticate(user=user)

import time
suffix = str(int(time.time()))

base_num = suffix[-8:]

valid = {
    'tipo_documento': td.id,
    'numero_documento': base_num,
    'razon_social': f'Proveedor Test {suffix}',
    'nombre_contacto': 'Juan Pérez',
    'email': f'prov_{suffix}@example.com',
    'telefono': '3001234567',
    'direccion': 'Calle 1',
    'pais': 'Colombia',
    'departamento': 'Antioquia',
    'ciudad': 'Medellín',
    'tipo_proveedor': 'Bienes',
    'estado': 'Activo',
    'creado_por': user.id
}

print('Creating valid provider')
resp = client.post('/api/proveedores/crear/', data=valid, format='json', HTTP_HOST='localhost')
print(resp.status_code, getattr(resp, 'data', resp.content.decode()))
print('---')

print('Creating duplicate document')
dup = {
    'tipo_documento': td.id,
    'numero_documento': base_num,
    'razon_social': f'Proveedor Dup {suffix}',
    'nombre_contacto': 'Juan Pérez',
    'email': f'provdup_{suffix}@example.com',
    'telefono': '3001234567',
    'direccion': 'Calle 1',
    'pais': 'Colombia',
    'departamento': 'Antioquia',
    'ciudad': 'Medellín',
    'tipo_proveedor': 'Bienes',
    'estado': 'Activo',
    'creado_por': user.id
}
resp = client.post('/api/proveedores/crear/', data=dup, format='json', HTTP_HOST='localhost')
print(resp.status_code, getattr(resp, 'data', resp.content.decode()))
print('---')

print('Creating with letters in document')
letters = {
    'tipo_documento': td.id,
    'numero_documento': 'ABC123',
    'razon_social': f'Proveedor Letras {suffix}',
    'nombre_contacto': 'Juan Pérez',
    'email': f'letters_{suffix}@example.com',
    'telefono': '3001234567',
    'direccion': 'Calle 1',
    'pais': 'Colombia',
    'departamento': 'Antioquia',
    'ciudad': 'Medellín',
    'tipo_proveedor': 'Bienes',
    'estado': 'Activo',
    'creado_por': user.id
}
resp = client.post('/api/proveedores/crear/', data=letters, format='json', HTTP_HOST='localhost')
print(resp.status_code, getattr(resp, 'data', resp.content.decode()))
print('---')

print('Creating with long document (>10)')
long = {
    'tipo_documento': td.id,
    'numero_documento': '1234567890123',
    'razon_social': f'Proveedor Largo {suffix}',
    'nombre_contacto': 'Juan Pérez',
    'email': f'long_{suffix}@example.com',
    'telefono': '3001234567',
    'direccion': 'Calle 1',
    'pais': 'Colombia',
    'departamento': 'Antioquia',
    'ciudad': 'Medellín',
    'tipo_proveedor': 'Bienes',
    'estado': 'Activo',
    'creado_por': user.id
}
resp = client.post('/api/proveedores/crear/', data=long, format='json', HTTP_HOST='localhost')
print(resp.status_code, getattr(resp, 'data', resp.content.decode()))
print('---')
