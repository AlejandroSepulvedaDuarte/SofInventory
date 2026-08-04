import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('compras', '0003_compra_almacen_auditoria_constraints'),
        ('inventario', '0001_initial'),
        ('productos', '0008_producto_constraints'),
        ('usuarios', '0005_alter_usuario_fecha_creacion'),
        ('ventas', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='movimientoinventario',
            name='compra',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='movimientos_inventario',
                to='compras.compra',
            ),
        ),
        migrations.AddField(
            model_name='movimientoinventario',
            name='movimiento_revertido',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='movimiento_reversion',
                to='inventario.movimientoinventario',
            ),
        ),
        migrations.AddField(
            model_name='movimientoinventario',
            name='traslado',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='movimientos_inventario',
                to='inventario.traslado',
            ),
        ),
        migrations.AddField(
            model_name='movimientoinventario',
            name='venta',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='movimientos_inventario',
                to='ventas.venta',
            ),
        ),
        migrations.AddIndex(
            model_name='movimientoinventario',
            index=models.Index(
                fields=['producto', 'fecha'],
                name='inv_mov_producto_fecha_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='movimientoinventario',
            index=models.Index(
                fields=['tipo', 'fecha'],
                name='inv_mov_tipo_fecha_idx',
            ),
        ),
        migrations.AddConstraint(
            model_name='almacen',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(capacidad__isnull=True)
                    | models.Q(capacidad__gte=0)
                ),
                name='inventario_almacen_capacidad_no_negativa',
            ),
        ),
        migrations.AddConstraint(
            model_name='movimientoinventario',
            constraint=models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name='inventario_movimiento_cantidad_positiva',
            ),
        ),
        migrations.AddConstraint(
            model_name='movimientoinventario',
            constraint=models.CheckConstraint(
                condition=(
                    (models.Q(compra__isnull=True) | models.Q(venta__isnull=True))
                    & (models.Q(compra__isnull=True) | models.Q(traslado__isnull=True))
                    & (models.Q(venta__isnull=True) | models.Q(traslado__isnull=True))
                ),
                name='inventario_movimiento_un_documento',
            ),
        ),
        migrations.AddConstraint(
            model_name='stockalmacen',
            constraint=models.CheckConstraint(
                condition=models.Q(cantidad__gte=0),
                name='inventario_stock_cantidad_no_negativa',
            ),
        ),
        migrations.AddConstraint(
            model_name='trasladodetalle',
            constraint=models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name='inventario_traslado_cantidad_positiva',
            ),
        ),
    ]
