from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import construir_dashboard


@api_view(['GET'])
def datos_dashboard(request):
    """Entrega métricas y series consolidadas sin exponer registros completos."""
    return Response(construir_dashboard())
