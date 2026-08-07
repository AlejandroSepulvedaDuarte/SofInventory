from django.db import migrations, models
import django.db.models.deletion
import empresa.models


class Migration(migrations.Migration):
    initial = True

    dependencies = [('usuarios', '0006_remove_legacy_admin')]

    operations = [
        migrations.CreateModel(
            name='Empresa',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('singleton', models.BooleanField(default=True, editable=False, unique=True)),
                ('nombre_comercial', models.CharField(max_length=150)),
                ('razon_social', models.CharField(blank=True, max_length=180, null=True)),
                ('nit', models.CharField(max_length=30)),
                ('digito_verificacion', models.CharField(blank=True, max_length=2, null=True)),
                ('logo', models.ImageField(blank=True, null=True, upload_to=empresa.models.company_logo_path)),
                ('direccion', models.CharField(max_length=220)),
                ('pais', models.CharField(default='Colombia', max_length=100)),
                ('departamento', models.CharField(max_length=100)),
                ('ciudad', models.CharField(max_length=100)),
                ('telefono', models.CharField(max_length=30)),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('sitio_web', models.URLField(blank=True, null=True)),
                ('mensaje_comprobante', models.CharField(default='Gracias por su compra.', max_length=250)),
                ('moneda', models.CharField(default='COP', max_length=3)),
                ('prefijo_ventas', models.CharField(blank=True, max_length=10, null=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('actualizado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='configuraciones_empresa_actualizadas', to='usuarios.usuario')),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='configuraciones_empresa_creadas', to='usuarios.usuario')),
            ],
            options={
                'verbose_name': 'Configuración de la empresa',
                'verbose_name_plural': 'Configuración de la empresa',
                'db_table': 'configuracion_empresa',
            },
        ),
    ]
