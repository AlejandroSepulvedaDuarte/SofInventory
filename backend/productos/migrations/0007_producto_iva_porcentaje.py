from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0006_producto_descripcion'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='iva_porcentaje',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
    ]
