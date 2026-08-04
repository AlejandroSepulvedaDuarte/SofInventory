import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0002_initial'),
        ('inventario', '0001_initial'),
        ('productos', '0008_producto_constraints'),
        ('proveedores', '0002_proveedor_uq_proveedores_razon_social_ci'),
        ('usuarios', '0005_alter_usuario_fecha_creacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='compra',
            name='almacen',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='compras',
                to='inventario.almacen',
            ),
        ),
        migrations.AddField(
            model_name='compra',
            name='anulado_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='compras_anuladas',
                to='usuarios.usuario',
            ),
        ),
        migrations.AddField(
            model_name='compra',
            name='fecha_anulacion',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='compra',
            name='motivo_anulacion',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='compra',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(subtotal__gte=0)
                    & models.Q(iva_total__gte=0)
                    & models.Q(total__gte=0)
                ),
                name='compras_totales_no_negativos',
            ),
        ),
        migrations.AddConstraint(
            model_name='detallecompra',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(cantidad__gt=0)
                    & models.Q(costo_unitario__gte=0)
                    & models.Q(iva_porcentaje__gte=0)
                    & models.Q(iva_porcentaje__lte=100)
                    & models.Q(subtotal__gte=0)
                    & models.Q(total__gte=0)
                ),
                name='compras_detalle_valores_validos',
            ),
        ),
    ]
