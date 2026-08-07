from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .locations import LocationCatalogError, load_colombia_catalog


@api_view(['GET'])
def colombia_catalog(request):
    try:
        return Response(load_colombia_catalog(), status=status.HTTP_200_OK)
    except LocationCatalogError:
        return Response(
            {
                'error': (
                    'No fue posible cargar el catálogo territorial local. '
                    'Inténtalo nuevamente o contacta al administrador.'
                )
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
