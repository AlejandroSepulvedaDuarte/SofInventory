from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0006_remove_legacy_admin'),
        ('compras', '0003_compra_almacen_auditoria_constraints'),
    ]

    operations = [
        migrations.AlterField(
            model_name='compra',
            name='registrado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='compras_registradas', to='usuarios.usuario'),
        ),
        migrations.AddField(
            model_name='compra',
            name='empresa_snapshot',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='compra',
            name='observaciones',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='detallecompra',
            name='nombre_producto',
            field=models.CharField(blank=True, default='', max_length=150),
        ),
        migrations.AddField(
            model_name='detallecompra',
            name='sku_producto',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
