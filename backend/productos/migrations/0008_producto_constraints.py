from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0007_producto_iva_porcentaje'),
        ('usuarios', '0005_alter_usuario_fecha_creacion'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='producto',
            constraint=models.CheckConstraint(
                condition=models.Q(stock__gte=0),
                name='productos_stock_no_negativo',
            ),
        ),
        migrations.AddConstraint(
            model_name='producto',
            constraint=models.CheckConstraint(
                condition=models.Q(stock_minimo__gte=0),
                name='productos_stock_minimo_no_negativo',
            ),
        ),
        migrations.AddConstraint(
            model_name='producto',
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(precio_compra__gte=0)
                    & models.Q(precio_venta__gte=0)
                    & models.Q(iva_porcentaje__gte=0)
                    & models.Q(iva_porcentaje__lte=100)
                ),
                name='productos_valores_comerciales_validos',
            ),
        ),
    ]
