from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Proveedor
from .serializers import ProveedorSerializer

# ── CREAR PROVEEDOR ────────────────────────────────────────
@api_view(['POST'])
def crear_proveedor(request):
    serializer = ProveedorSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Proveedor creado exitosamente'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR PROVEEDORES ─────────────────────────────────────
@api_view(['GET'])
def listar_proveedores(request):
    proveedores = Proveedor.objects.select_related('creado_por', 'tipo_documento').all()
    serializer = ProveedorSerializer(proveedores, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── ELIMINAR PROVEEDOR ─────────────────────────────────────
@api_view(['DELETE'])
def eliminar_proveedor(request, id):
    try:
        proveedor = Proveedor.objects.get(id=id)
        proveedor.delete()
        return Response({'mensaje': 'Proveedor eliminado correctamente'}, status=status.HTTP_200_OK)
    except Proveedor.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

# ── EDITAR PROVEEDOR ───────────────────────────────────────
@api_view(['PUT'])
def editar_proveedor(request, id):
    try:
        proveedor = Proveedor.objects.get(id=id)
    except Proveedor.DoesNotExist:
        return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProveedorSerializer(proveedor, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Proveedor actualizado correctamente'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── CAMBIAR ESTADO PROVEEDOR ───────────────────────────────
@api_view(['PATCH'])
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

