from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Categoria, Producto
from .serializers import CategoriaSerializer, ProductoSerializer
from inventario.models import Almacen, StockAlmacen, MovimientoInventario
from usuarios.models import Usuario
import json


# ── CREAR CATEGORÍA ────────────────────────────────────────
@api_view(['POST'])
def crear_categoria(request):
    serializer = CategoriaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Categoría creada exitosamente'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR CATEGORÍAS ──────────────────────────────────────
@api_view(['GET'])
def listar_categorias(request):
    categorias = Categoria.objects.select_related('creado_por').all()
    serializer = CategoriaSerializer(categorias, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── ELIMINAR CATEGORÍA ─────────────────────────────────────
@api_view(['DELETE'])
def eliminar_categoria(request, id):
    try:
        categoria = Categoria.objects.get(id=id)
        categoria.delete()
        return Response({'mensaje': 'Categoría eliminada correctamente'}, status=status.HTTP_200_OK)
    except Categoria.DoesNotExist:
        return Response({'error': 'Categoría no encontrada'}, status=status.HTTP_404_NOT_FOUND)


# ── LISTAR PRODUCTOS ───────────────────────────────────────
@api_view(['GET'])
def listar_productos(request):
    estado = request.query_params.get('estado', None)
    if estado:
        productos = Producto.objects.select_related('categoria', 'creado_por').filter(estado=estado)
    else:
        productos = Producto.objects.select_related('categoria', 'creado_por').all()
    serializer = ProductoSerializer(productos, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── CONFIGURAR PRODUCTO ────────────────────────────────────
# Cuando el usuario configura el producto por primera vez,
# se crea automáticamente el StockAlmacen en el almacén principal
# con la cantidad que vino de la compra (producto.stock).
# También se registra el movimiento de inventario tipo ENTRADA_COMPRA.
@api_view(['PUT'])
def configurar_producto(request, id):
    try:
        producto = Producto.objects.get(id=id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    producto.precio_venta  = request.data.get('precio_venta', producto.precio_venta)
    producto.stock_minimo  = request.data.get('stock_minimo', producto.stock_minimo)
    producto.descripcion   = request.data.get('descripcion', '')
    producto.observaciones = request.data.get('observaciones', '')
    producto.estado        = 'activo'

    # Guardar especificaciones dinámicas
    especificaciones = {}
    for key in ['garantia_meses', 'voltaje', 'especificaciones_tecnicas', 'capacidad', 'medida']:
        if key in request.data:
            especificaciones[key] = request.data[key]
    if especificaciones:
        producto.especificaciones = especificaciones

    if 'imagen' in request.FILES:
        producto.imagen = request.FILES['imagen']

    producto.save()

    # ─────────────────────────────────────────────────────
    # CREAR STOCK EN ALMACÉN PRINCIPAL
    # Se busca el almacén principal (primer almacén activo).
    # Si no existe ninguno, se omite sin romper el flujo.
    # ─────────────────────────────────────────────────────
    almacen_principal = Almacen.objects.filter(estado='activo').order_by('id').first()

    if almacen_principal:
        stock_obj, creado = StockAlmacen.objects.get_or_create(
            producto = producto,
            almacen  = almacen_principal,
            defaults = {'cantidad': 0}
        )

        if creado:
            # Primera vez que se configura — asignar todo el stock al almacén principal
            stock_obj.cantidad = producto.stock
            stock_obj.save()

            # Registrar movimiento de entrada por compra
            usuario = Usuario.objects.first()
            MovimientoInventario.objects.create(
                tipo            = 'ENTRADA_COMPRA',
                producto        = producto,
                almacen_destino = almacen_principal,
                almacen_origen  = None,
                cantidad        = producto.stock,
                observacion     = f'Entrada inicial al configurar producto [{producto.sku}]',
                creado_por      = usuario
            )
        else:
            # El producto ya tenía StockAlmacen (reconfiguración)
            # Solo actualiza si el stock de productos es mayor al registrado
            if producto.stock > stock_obj.cantidad:
                diferencia         = producto.stock - stock_obj.cantidad
                stock_obj.cantidad = producto.stock
                stock_obj.save()

                usuario = Usuario.objects.first()
                MovimientoInventario.objects.create(
                    tipo            = 'AJUSTE_POSITIVO',
                    producto        = producto,
                    almacen_destino = almacen_principal,
                    almacen_origen  = None,
                    cantidad        = diferencia,
                    observacion     = f'Ajuste de stock al reconfigurar producto [{producto.sku}]',
                    creado_por      = usuario
                )

    return Response({
        'mensaje': 'Producto configurado correctamente.',
        'producto': ProductoSerializer(producto).data
    }, status=status.HTTP_200_OK)


# ── EDITAR PRODUCTO ────────────────────────────────────────
@api_view(['PUT'])
def editar_producto(request, id):
    try:
        producto = Producto.objects.get(id=id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if 'precio_venta' in request.data:
        producto.precio_venta = float(request.data['precio_venta'])

    if 'stock_minimo' in request.data:
        producto.stock_minimo = int(request.data['stock_minimo'])

    if 'observaciones' in request.data:
        producto.observaciones = request.data['observaciones']

    if 'descripcion' in request.data:
        producto.descripcion = request.data['descripcion']

    # Especificaciones dinámicas
    especificaciones = producto.especificaciones or {}
    for key in ['garantia_meses', 'voltaje', 'especificaciones_tecnicas', 'capacidad', 'medida']:
        if key in request.data:
            especificaciones[key] = request.data[key]
    producto.especificaciones = especificaciones

    if 'imagen' in request.FILES:
        producto.imagen = request.FILES['imagen']

    producto.save()
    return Response({
        'mensaje': 'Producto actualizado correctamente.',
        'producto': ProductoSerializer(producto, context={'request': request}).data
    }, status=status.HTTP_200_OK)


# ── CAMBIAR ESTADO DEL PRODUCTO ────────────────────────────
@api_view(['PATCH'])
def cambiar_estado_producto(request, producto_id):
    try:
        producto = Producto.objects.get(id=producto_id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    nuevo_estado = request.data.get('estado')

    if nuevo_estado not in ['activo', 'inactivo']:
        return Response({'error': 'Estado no válido. Use "activo" o "inactivo"'},
                        status=status.HTTP_400_BAD_REQUEST)

    producto.estado = nuevo_estado
    producto.save()

    return Response({
        'mensaje': f'Producto {nuevo_estado} correctamente',
        'estado': nuevo_estado,
        'producto': ProductoSerializer(producto).data
    }, status=status.HTTP_200_OK)