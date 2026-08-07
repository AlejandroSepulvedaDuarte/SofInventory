from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Empresa
from .serializers import EmpresaSerializer


def _is_admin(user):
    return getattr(getattr(user, 'rol', None), 'nombre', None) == 'Administrador'


def _validation_response(errors):
    first = next(iter(errors.values()), ['Los datos enviados no son válidos.'])
    if isinstance(first, list):
        first = first[0] if first else 'Los datos enviados no son válidos.'
    return {'error': str(first), 'errors': errors}


@api_view(['GET', 'POST', 'PUT', 'PATCH'])
def configuracion_empresa(request):
    empresa = Empresa.objects.select_related('creado_por', 'actualizado_por').first()
    puede_editar = _is_admin(request.user)

    if request.method == 'GET':
        return Response({
            'configurada': empresa is not None,
            'puede_editar': puede_editar,
            'empresa': EmpresaSerializer(
                empresa, context={'request': request}
            ).data if empresa else None,
        })

    if not puede_editar:
        return Response(
            {'error': 'Solo un administrador puede modificar la configuración de la empresa.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if request.method == 'POST' and empresa is not None:
        return Response(
            {'error': 'La configuración de la empresa ya existe. Utiliza la opción de editar.'},
            status=status.HTTP_409_CONFLICT,
        )
    if request.method in ('PUT', 'PATCH') and empresa is None:
        return Response(
            {'error': 'Primero debes crear la configuración de la empresa.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = EmpresaSerializer(
        empresa,
        data=request.data,
        partial=request.method == 'PATCH',
        context={'request': request},
    )
    if not serializer.is_valid():
        return Response(
            _validation_response(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST,
        )

    old_logo = empresa.logo if empresa and empresa.logo else None
    try:
        with transaction.atomic():
            if empresa:
                saved = serializer.save(actualizado_por=request.user)
            else:
                saved = serializer.save(
                    creado_por=request.user,
                    actualizado_por=request.user,
                )
    except (IntegrityError, ValueError):
        return Response(
            {'error': 'Solo puede existir una configuración de empresa.'},
            status=status.HTTP_409_CONFLICT,
        )

    if old_logo and (not saved.logo or old_logo.name != saved.logo.name):
        transaction.on_commit(lambda: old_logo.storage.delete(old_logo.name))
    return Response(
        {
            'mensaje': 'Configuración de la empresa guardada correctamente.',
            'empresa': EmpresaSerializer(saved, context={'request': request}).data,
        },
        status=status.HTTP_200_OK if empresa else status.HTTP_201_CREATED,
    )
