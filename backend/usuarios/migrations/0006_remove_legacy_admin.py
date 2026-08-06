from django.db import migrations


def remove_legacy_admin(apps, schema_editor):
    """Elimina el usuario admin creado con contraseña hardcodeada en migraciones previas."""
    Usuario = apps.get_model('usuarios', 'Usuario')
    Usuario.objects.filter(username='admin', numero_documento='1234567890').delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0005_alter_usuario_fecha_creacion'),
    ]

    operations = [
        migrations.RunPython(remove_legacy_admin, noop),
    ]
