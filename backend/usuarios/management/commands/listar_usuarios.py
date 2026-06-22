from django.core.management.base import BaseCommand
from usuarios.models import Usuario
from tabulate import tabulate


class Command(BaseCommand):
    help = 'Muestra todos los usuarios registrados en la base de datos'

    def handle(self, *args, **kwargs):
        usuarios = Usuario.objects.select_related('rol', 'tipo_documento').all()

        if not usuarios.exists():
            self.stdout.write(self.style.WARNING('No hay usuarios registrados.'))
            return

        data = []

        for u in usuarios:
            data.append([
                u.id,
                u.username,
                u.nombre_completo,
                u.email,
                u.rol.nombre,
                u.estado
            ])

        tabla = tabulate(
            data,
            headers=["ID", "USERNAME", "NOMBRE", "EMAIL", "ROL", "ESTADO"],
            tablefmt="fancy_grid"
        )

        self.stdout.write("\n" + tabla)
        self.stdout.write(f"\nTotal de usuarios: {usuarios.count()}\n")