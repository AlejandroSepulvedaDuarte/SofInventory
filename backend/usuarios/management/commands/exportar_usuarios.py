from django.core.management.base import BaseCommand
from usuarios.models import Usuario
from openpyxl import Workbook


class Command(BaseCommand):
    help = 'Exporta los usuarios a un archivo Excel'

    def handle(self, *args, **kwargs):
        usuarios = Usuario.objects.select_related('rol', 'tipo_documento').all()

        if not usuarios.exists():
            self.stdout.write(self.style.WARNING('No hay usuarios registrados.'))
            return

        wb = Workbook()
        ws = wb.active
        ws.title = "Usuarios"

        # Encabezados
        ws.append(["ID", "USERNAME", "NOMBRE", "EMAIL", "ROL", "ESTADO"])

        # Datos
        for u in usuarios:
            ws.append([
                u.id,
                u.username,
                u.nombre_completo,
                u.email,
                u.rol.nombre,
                u.estado
            ])

        wb.save("usuarios.xlsx")

        self.stdout.write(self.style.SUCCESS(
            "Archivo usuarios.xlsx generado correctamente."
        ))