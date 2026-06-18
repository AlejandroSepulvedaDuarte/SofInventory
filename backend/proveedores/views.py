from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import IntegrityError
from .models import Proveedor
from .serializers import ProveedorSerializer
from usuarios.permissions import require_roles


def _format_serializer_errors(errors):
    """Convierte errors de serializer a un mensaje legible en español."""
    if isinstance(errors, dict):
        field, first = next(iter(errors.items()))
        # first puede ser lista o string
        msg = first[0] if isinstance(first, (list, tuple)) and first else str(first)
        field_map = {
            'numero_documento': 'Número de documento',
            'email': 'Correo electrónico',
            'razon_social': 'Razón social',
            'nombre_contacto': 'Nombre de contacto',
        }
        label = field_map.get(field, field.replace('_', ' ').capitalize())
        # Normalizar mensajes generados por validadores automáticos en inglés
        lower_msg = msg.lower()
        if 'already exists' in lower_msg or 'already' in lower_msg:
            if field == 'numero_documento':
                return f"{label}: El número de documento ya se encuentra registrado."
            if field == 'email':
                return f"{label}: El correo electrónico ya se encuentra registrado."
            if field == 'razon_social':
                return f"{label}: Ya existe un proveedor con esa razón social."
        return f"{label}: {msg}"
    return str(errors)

# ── CREAR PROVEEDOR ────────────────────────────────────────
@api_view(['POST'])
@require_roles('Administrador', 'Supervisor')
def crear_proveedor(request):
    serializer = ProveedorSerializer(data=request.data)
    if serializer.is_valid():
        try:
            serializer.save(creado_por=request.user)
        except IntegrityError:
            return Response(
                {'error': 'Ya existe un proveedor con esa razon social.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response({'mensaje': 'Proveedor creado exitosamente'}, status=status.HTTP_201_CREATED)
    # Formatear errores para devolver mensaje amigable
    return Response({'error': _format_serializer_errors(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR PROVEEDORES ─────────────────────────────────────
@api_view(['GET'])
def listar_proveedores(request):
    proveedores = Proveedor.objects.select_related('creado_por', 'tipo_documento').all()
    serializer = ProveedorSerializer(proveedores, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── ELIMINAR PROVEEDOR ─────────────────────────────────────
@api_view(['DELETE'])
@require_roles('Administrador', 'Supervisor')
def eliminar_proveedor(request, id):
    try:
        proveedor = Proveedor.objects.get(id=id)
        proveedor.delete()
        return Response({'mensaje': 'Proveedor eliminado correctamente'}, status=status.HTTP_200_OK)
    except Proveedor.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

# ── EDITAR PROVEEDOR ───────────────────────────────────────
@api_view(['PUT'])
@require_roles('Administrador', 'Supervisor')
def editar_proveedor(request, id):
    try:
        proveedor = Proveedor.objects.get(id=id)
    except Proveedor.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProveedorSerializer(proveedor, data=request.data, partial=True)
    if serializer.is_valid():
        try:
            serializer.save()
        except IntegrityError:
            return Response(
                {'error': 'Ya existe un proveedor con esa razon social.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response({'mensaje': 'Proveedor actualizado correctamente'}, status=status.HTTP_200_OK)
    # Formatear errores del serializer
    return Response({'error': _format_serializer_errors(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)


# ── CAMBIAR ESTADO PROVEEDOR ───────────────────────────────
@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def cambiar_estado_proveedor(request, id):
    try:
        proveedor = Proveedor.objects.get(id=id)
        proveedor.estado = 'Inactivo' if proveedor.estado == 'Activo' else 'Activo'
        proveedor.save()
        return Response({
            'mensaje': f'Estado cambiado a {proveedor.estado}',
            'estado': proveedor.estado
        }, status=status.HTTP_200_OK)
    except Proveedor.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

