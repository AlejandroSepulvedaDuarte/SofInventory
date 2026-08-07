from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('usuarios', '0006_remove_legacy_admin')]

    operations = [
        migrations.CreateModel(
            name='EventoAuditoriaUsuario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('usuario_nombre', models.CharField(max_length=150)),
                ('realizado_por_nombre', models.CharField(max_length=150)),
                ('accion', models.CharField(choices=[('creacion', 'Creación'), ('edicion', 'Edición'), ('cambio_rol', 'Cambio de rol'), ('cambio_estado', 'Activación o desactivación'), ('desbloqueo', 'Desbloqueo'), ('eliminacion', 'Eliminación')], max_length=20)),
                ('detalle', models.JSONField(blank=True, default=dict)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('realizado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='eventos_auditoria_realizados', to='usuarios.usuario')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='eventos_auditoria_recibidos', to='usuarios.usuario')),
            ],
            options={'db_table': 'auditoria_usuarios', 'ordering': ['-fecha']},
        ),
        migrations.AddIndex(
            model_name='eventoauditoriausuario',
            index=models.Index(fields=['-fecha', 'accion'], name='auditoria_u_fecha_5131b5_idx'),
        ),
    ]
