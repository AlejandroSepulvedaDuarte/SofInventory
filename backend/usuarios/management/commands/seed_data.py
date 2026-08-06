import os
import secrets

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from usuarios.models import TipoDocumento, Rol, Usuario


class Command(BaseCommand):
    help = 'Crea los datos iniciales si no existen (tipos de documento, roles, admin)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--print-password',
            action='store_true',
            help='Imprime la contraseña del admin solo si fue generada automáticamente.',
        )

    def handle(self, *args, **options):
        cc, _ = TipoDocumento.objects.get_or_create(
            codigo='CC', defaults={'nombre': 'Cédula de Ciudadanía'}
        )
        TipoDocumento.objects.get_or_create(
            codigo='CE', defaults={'nombre': 'Cédula de Extranjería'}
        )
        TipoDocumento.objects.get_or_create(
            codigo='NIT', defaults={'nombre': 'Número de Identificación Tributaria'}
        )
        TipoDocumento.objects.get_or_create(
            codigo='TI', defaults={'nombre': 'Tarjeta de Identidad'}
        )
        TipoDocumento.objects.get_or_create(
            codigo='PA', defaults={'nombre': 'Pasaporte'}
        )

        admin_rol, _ = Rol.objects.get_or_create(
            nombre='Administrador',
            defaults={'descripcion': 'Acceso total al sistema'}
        )
        Rol.objects.get_or_create(
            nombre='Supervisor',
            defaults={'descripcion': 'Supervisión de operaciones'}
        )
        Rol.objects.get_or_create(
            nombre='Bodega',
            defaults={'descripcion': 'Gestión de inventario y almacenes'}
        )
        Rol.objects.get_or_create(
            nombre='Vendedor',
            defaults={'descripcion': 'Registro de ventas y clientes'}
        )

        username = os.getenv('INITIAL_ADMIN_USERNAME', 'admin')
        if Usuario.objects.filter(username=username).exists():
            self.stdout.write(f'Admin user "{username}" already exists')
            return

        password = os.getenv('INITIAL_ADMIN_PASSWORD') or secrets.token_urlsafe(18)

        Usuario.objects.create(
            tipo_documento=cc,
            numero_documento=os.getenv('INITIAL_ADMIN_NUMERO_DOCUMENTO', '1234567890'),
            nombre_completo=os.getenv('INITIAL_ADMIN_NOMBRE_COMPLETO', 'Administrador del Sistema'),
            email=os.getenv('INITIAL_ADMIN_EMAIL', 'admin@sofinventory.com'),
            username=username,
            password=make_password(password),
            rol=admin_rol,
            estado='activo',
            fecha_creacion=timezone.now().date(),
            observaciones='Usuario creado automáticamente al inicializar la base de datos.',
        )

        if 'INITIAL_ADMIN_PASSWORD' not in os.environ or not os.getenv('INITIAL_ADMIN_PASSWORD'):
            self.stdout.write(self.style.WARNING(
                f'[SEGURIDAD] Se generó una contraseña aleatoria para "{username}". '
                f'Estabézcala con INITIAL_ADMIN_PASSWORD o cámbiela tras el primer ingreso.'
            ))
            if options.get('print_password'):
                self.stdout.write(f'Contraseña temporal de "{username}": {password}')
        else:
            self.stdout.write(self.style.SUCCESS(f'Admin user "{username}" created from environment'))
