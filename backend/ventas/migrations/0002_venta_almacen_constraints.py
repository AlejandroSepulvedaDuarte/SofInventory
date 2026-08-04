import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0001_initial'),
        ('inventario', '0002_movimiento_referencias_constraints'),
        ('productos', '0008_producto_constraints'),
        ('usuarios', '0005_alter_usuario_fecha_creacion'),
        ('ventas', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='venta',
            name='almacen',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='ventas',
                to='inventario.almacen',
            ),
        ),
        migrations.AddConstraint(
            model_name='detalleventa',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(cantidad__gt=0)
                    & models.Q(precio_unitario__gte=0)
                    & models.Q(subtotal__gte=0)
                ),
                name='ventas_detalle_valores_validos',
            ),
        ),
        migrations.AddConstraint(
            model_name='venta',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(subtotal__gte=0)
                    & models.Q(descuento__gte=0)
                    & models.Q(iva_monto__gte=0)
                    & models.Q(total__gte=0)
                ),
                name='ventas_totales_no_negativos',
            ),
        ),
    ]
