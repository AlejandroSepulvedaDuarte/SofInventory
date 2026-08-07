from .models import Empresa


def obtener_empresa_actual():
    return Empresa.objects.first()


def obtener_snapshot_empresa():
    empresa = obtener_empresa_actual()
    return empresa.comprobante_snapshot() if empresa else {}
