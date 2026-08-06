from django.db import transaction
from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .models import Rol, TipoDocumento


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
