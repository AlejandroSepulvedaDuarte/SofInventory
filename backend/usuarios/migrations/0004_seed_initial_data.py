from django.db import migrations
from django.contrib.auth.hashers import make_password
from django.utils import timezone


def seed_initial_data(apps, schema_editor):
    TipoDocumento = apps.get_model('usuarios', 'TipoDocumento')
    Rol = apps.get_model('usuarios', 'Rol')
    Usuario = apps.get_model('usuarios', 'Usuario')

    # ── Tipos de Documento ─────────────────────────────
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

    # ── Roles ──────────────────────────────────────────
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

    # ── Usuario Administrador por defecto ──────────────
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


def unseed_initial_data(apps, schema_editor):
    """Elimina los datos creados (rollback)."""
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(username='admin').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0003_usuario_cuenta_bloqueada_usuario_fecha_bloqueo_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_initial_data, unseed_initial_data),
    ]
