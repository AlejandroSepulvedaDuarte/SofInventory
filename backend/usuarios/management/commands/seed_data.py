from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from usuarios.models import TipoDocumento, Rol, Usuario


class Command(BaseCommand):
    help = 'Crea los datos iniciales si no existen (tipos de documento, roles, admin)'

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

        if not Usuario.objects.filter(username='admin').exists():
            Usuario.objects.create(
                tipo_documento=cc,
                numero_documento='1234567890',
                nombre_completo='Administrador del Sistema',
                email='admin@sofinventory.com',
                username='admin',
                password=make_password('admin123'),
                rol=admin_rol,
                estado='activo',
                fecha_creacion=timezone.now().date(),
                observaciones='Usuario creado automáticamente al inicializar la base de datos.',
            )
            self.stdout.write(self.style.SUCCESS('Admin user created'))
        else:
            self.stdout.write('Admin user already exists')
