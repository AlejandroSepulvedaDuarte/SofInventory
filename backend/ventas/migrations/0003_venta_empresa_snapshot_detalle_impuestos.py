from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('usuarios', '0006_remove_legacy_admin'),
        ('ventas', '0002_venta_almacen_constraints'),
    ]

    operations = [
        migrations.AlterField(
            model_name='venta',
            name='vendedor',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='ventas_realizadas', to='usuarios.usuario'),
        ),
        migrations.AddField(
            model_name='venta',
            name='empresa_snapshot',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='detalleventa',
            name='iva_porcentaje',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='detalleventa',
            name='iva_monto',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name='detalleventa',
            name='total',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
    ]
