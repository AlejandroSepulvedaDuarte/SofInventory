from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Cliente
from .serializers import ClienteSerializer
from usuarios.models import TipoDocumento
from usuarios.permissions import require_roles


def _format_serializer_errors(errors):
    """Convierte errors de serializer a un dict campo->mensaje (string) para respuestas amigables."""
    flat = {}
    if isinstance(errors, dict):
        for field, val in errors.items():
            if isinstance(val, list) and val:
                flat[field] = str(val[0])
            else:
                flat[field] = str(val)
    else:
        flat['error'] = str(errors)
    return flat


# ── CREAR CLIENTE ──────────────────────────────────────────
@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def crear_cliente(request):
    data = request.data.copy()

    # Compatibilidad: aceptar campo tipo_documento_id (usado por algunas vistas)
    if 'tipo_documento_id' in data and 'tipo_documento' not in data:
        data['tipo_documento'] = data.get('tipo_documento_id')

    # Valores por defecto (coherentes con el modelo y con el frontend)
    data.setdefault('tipo_cliente', 'natural')
    data.setdefault('categoria', 'general')
    data.setdefault('estado', 'activo')

    serializer = ClienteSerializer(data=data)
    if serializer.is_valid():
        try:
            # validar que el tipo_documento exista
            TipoDocumento.objects.get(id=data.get('tipo_documento'))
        except TipoDocumento.DoesNotExist:
            return Response({'error': 'Tipo de documento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cliente = serializer.save(creado_por=request.user)
        return Response({
            'mensaje': '✅ Cliente creado correctamente.',
            'cliente': ClienteSerializer(cliente).data
        }, status=status.HTTP_201_CREATED)

    return Response(_format_serializer_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR CLIENTES ────────────────────────────────────────
@api_view(['GET'])
def listar_clientes(request):
    estado = request.query_params.get('estado', None)
    if estado:
        clientes = Cliente.objects.select_related('tipo_documento', 'creado_por').filter(estado=estado)
    else:
        clientes = Cliente.objects.select_related('tipo_documento', 'creado_por').all()
    serializer = ClienteSerializer(clientes, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── EDITAR CLIENTE ─────────────────────────────────────────
@api_view(['PUT'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def editar_cliente(request, id):
    try:
        cliente = Cliente.objects.get(id=id)
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data.copy()
    if 'tipo_documento_id' in data and 'tipo_documento' not in data:
        data['tipo_documento'] = data.get('tipo_documento_id')

    serializer = ClienteSerializer(instance=cliente, data=data)
    if serializer.is_valid():
        try:
            TipoDocumento.objects.get(id=data.get('tipo_documento'))
        except TipoDocumento.DoesNotExist:
            return Response({'error': 'Tipo de documento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        cliente = serializer.save()
        return Response({
            'mensaje': '✅ Cliente actualizado correctamente.',
            'cliente': ClienteSerializer(cliente).data
        }, status=status.HTTP_200_OK)

    return Response(_format_serializer_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


# ── CAMBIAR ESTADO CLIENTE ─────────────────────────────────
@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def cambiar_estado_cliente(request, id):
    try:
        cliente = Cliente.objects.get(id=id)
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in ['activo', 'inactivo', 'bloqueado']:
            return Response({'error': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        cliente.estado = nuevo_estado
        cliente.save()
        return Response({'mensaje': f'Cliente {nuevo_estado} correctamente.', 'estado': cliente.estado})
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


# ── ELIMINAR CLIENTE ───────────────────────────────────────
@api_view(['DELETE'])
@require_roles('Administrador', 'Supervisor')
def eliminar_cliente(request, id):
    try:
        cliente = Cliente.objects.get(id=id)
        cliente.delete()
        return Response({'mensaje': 'Cliente eliminado correctamente.'}, status=status.HTTP_200_OK)
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
