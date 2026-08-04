from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_seed_initial_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='usuario',
            name='fecha_creacion',
            field=models.DateField(auto_now_add=True),
        ),
    ]
