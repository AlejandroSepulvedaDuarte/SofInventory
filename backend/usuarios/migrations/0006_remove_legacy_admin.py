from django.contrib.auth.hashers import make_password
from django.db import migrations


def disable_legacy_admin_password(apps, schema_editor):
    """Invalida la clave expuesta sin romper las relaciones historicas del usuario."""
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(
        username='admin',
        numero_documento='1234567890',
    ).update(
        password=make_password(None),
        cuenta_bloqueada=False,
        fecha_bloqueo=None,
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0005_alter_usuario_fecha_creacion'),
    ]

    operations = [
        migrations.RunPython(disable_legacy_admin_password, noop),
    ]
