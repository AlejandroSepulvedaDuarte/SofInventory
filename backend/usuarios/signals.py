import os
from datetime import date

from django.db import transaction
from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .models import Rol, TipoDocumento, Usuario


@receiver(post_migrate)
def create_initial_user_data(sender, **kwargs):
    if sender.name != 'usuarios':
        return

    default_documentos = [
        {'codigo': 'CC', 'nombre': 'Cédula de Ciudadanía'},
        {'codigo': 'CE', 'nombre': 'Cédula de Extranjería'},
        {'codigo': 'NIT', 'nombre': 'NIT'},
    ]
    default_roles = [
        {'nombre': 'Administrador', 'descripcion': 'Rol con acceso completo al sistema.'},
        {'nombre': 'Vendedor', 'descripcion': 'Rol para usuarios de ventas y operación.'},
    ]

    with transaction.atomic():
        for documento in default_documentos:
            TipoDocumento.objects.get_or_create(
                codigo=documento['codigo'],
                defaults={'nombre': documento['nombre']}
            )

        for role in default_roles:
            Rol.objects.get_or_create(
                nombre=role['nombre'],
                defaults={'descripcion': role['descripcion']}
            )

        admin_username = os.getenv('INITIAL_ADMIN_USERNAME', 'admin')
        admin_password = os.getenv('INITIAL_ADMIN_PASSWORD', 'Admin123!')
        admin_email = os.getenv('INITIAL_ADMIN_EMAIL', 'admin@example.com')
        admin_nombre = os.getenv('INITIAL_ADMIN_NOMBRE_COMPLETO', 'Administrador Principal')
        admin_tipo_documento = os.getenv('INITIAL_ADMIN_TIPO_DOCUMENTO', 'CC')
        admin_numero_documento = os.getenv('INITIAL_ADMIN_NUMERO_DOCUMENTO', '1000000000')

        if Usuario.objects.filter(rol__nombre='Administrador', estado='activo').exists():
            return

        tipo_documento = TipoDocumento.objects.filter(codigo=admin_tipo_documento).first()
        if not tipo_documento:
            tipo_documento, _ = TipoDocumento.objects.get_or_create(
                codigo='CC',
                defaults={'nombre': 'Cédula de Ciudadanía'}
            )

        rol = Rol.objects.filter(nombre='Administrador').first()
        if not rol:
            rol, _ = Rol.objects.get_or_create(
                nombre='Administrador',
                defaults={'descripcion': 'Rol con acceso completo al sistema.'}
            )

        Usuario.objects.get_or_create(
            username=admin_username,
            defaults={
                'tipo_documento': tipo_documento,
                'numero_documento': admin_numero_documento,
                'nombre_completo': admin_nombre,
                'email': admin_email,
                'password': admin_password,
                'rol': rol,
                'estado': 'activo',
                'fecha_creacion': date.today(),
            },
        )
