from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from .models import Categoria, Producto
from .serializers import CategoriaSerializer, ProductoSerializer
from inventario.models import Almacen, StockAlmacen, MovimientoInventario
from usuarios.permissions import require_roles


def generar_sku(nombre, marca, referencia):
    return f"{nombre}-{marca}-{referencia}".upper().replace(" ", "-")


def obtener_usuario_responsable(request, producto=None):
    if getattr(request, 'user', None) and getattr(request.user, 'is_authenticated', False):
        return request.user
    if producto and producto.creado_por_id:
        return producto.creado_por
    return None


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor')
def crear_categoria(request):
    serializer = CategoriaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=request.user)
        return Response({'mensaje': 'Categoria creada exitosamente'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def listar_categorias(request):
    categorias = Categoria.objects.select_related('creado_por').all()
    serializer = CategoriaSerializer(categorias, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@require_roles('Administrador', 'Supervisor')
def eliminar_categoria(request, id):
    try:
        categoria = Categoria.objects.get(id=id)
        categoria.delete()
        return Response({'mensaje': 'Categoria eliminada correctamente'}, status=status.HTTP_200_OK)
    except Categoria.DoesNotExist:
        return Response({'error': 'Categoria no encontrada'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def listar_productos(request):
    estado = request.query_params.get('estado', None)
    if estado:
        productos = Producto.objects.select_related('categoria', 'creado_por').filter(estado=estado)
    else:
        productos = Producto.objects.select_related('categoria', 'creado_por').all()
    serializer = ProductoSerializer(productos, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor')
def crear_producto(request):
    nombre = (request.data.get('nombre') or '').strip()
    marca = (request.data.get('marca') or '').strip()
    referencia = (request.data.get('referencia') or '').strip()
    categoria_id = request.data.get('categoria')
    unidad_medida = request.data.get('unidad_medida') or 'Unidad'
    iva_porcentaje = request.data.get('iva_porcentaje', 0)
    if not all([nombre, marca, referencia, categoria_id]):
        return Response(
            {'error': 'Nombre, marca, referencia y categoria son obligatorios.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    sku = generar_sku(nombre, marca, referencia)

    if Producto.objects.filter(sku=sku).exists():
        return Response(
            {'error': f'Ya existe un producto con SKU {sku}.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        producto = Producto.objects.create(
            sku=sku,
            nombre=nombre,
            marca=marca,
            referencia=referencia,
            unidad_medida=unidad_medida,
            iva_porcentaje=iva_porcentaje,
            categoria_id=categoria_id,
            creado_por=request.user,
            estado='pendiente',
            stock=0,
            precio_compra=0,
            precio_venta=0,
        )
    except Exception:
        return Response(
            {'error': 'No se pudo crear el producto con los datos enviados.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response(
        {
            'mensaje': 'Producto creado correctamente.',
            'producto': ProductoSerializer(producto, context={'request': request}).data,
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['PUT'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def configurar_producto(request, id):
    try:
        producto = Producto.objects.get(id=id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    usuario = obtener_usuario_responsable(request, producto=producto)
    if not usuario:
        return Response(
            {'error': 'No se encontro un usuario valido para registrar la configuracion.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    with transaction.atomic():
        producto.precio_venta = request.data.get('precio_venta', producto.precio_venta)
        producto.stock_minimo = request.data.get('stock_minimo', producto.stock_minimo)
        producto.iva_porcentaje = request.data.get('iva_porcentaje', producto.iva_porcentaje)
        producto.descripcion = request.data.get('descripcion', '')
        producto.observaciones = request.data.get('observaciones', '')
        producto.estado = 'activo'

        especificaciones = {}
        for key in ['garantia_meses', 'voltaje', 'especificaciones_tecnicas', 'capacidad', 'medida']:
            if key in request.data:
                especificaciones[key] = request.data[key]
        if especificaciones:
            producto.especificaciones = especificaciones

        if 'imagen' in request.FILES:
            producto.imagen = request.FILES['imagen']

        producto.save()

        almacen_principal = Almacen.objects.filter(estado='activo').order_by('id').first()
        if almacen_principal:
            stock_obj, creado = StockAlmacen.objects.get_or_create(
                producto=producto,
                almacen=almacen_principal,
                defaults={'cantidad': 0}
            )

            if creado:
                stock_obj.cantidad = producto.stock
                stock_obj.save()

                if producto.stock > 0:
                    MovimientoInventario.objects.create(
                        tipo='ENTRADA_COMPRA',
                        producto=producto,
                        almacen_destino=almacen_principal,
                        almacen_origen=None,
                        cantidad=producto.stock,
                        observacion=f'Entrada inicial al configurar producto [{producto.sku}]',
                        creado_por=usuario
                    )
            elif producto.stock > stock_obj.cantidad:
                diferencia = producto.stock - stock_obj.cantidad
                stock_obj.cantidad = producto.stock
                stock_obj.save()

                MovimientoInventario.objects.create(
                    tipo='AJUSTE_POSITIVO',
                    producto=producto,
                    almacen_destino=almacen_principal,
                    almacen_origen=None,
                    cantidad=diferencia,
                    observacion=f'Ajuste de stock al reconfigurar producto [{producto.sku}]',
                    creado_por=usuario
                )

    return Response({
        'mensaje': 'Producto configurado correctamente.',
        'producto': ProductoSerializer(producto).data
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
@require_roles('Administrador', 'Supervisor')
def editar_producto(request, id):
    try:
        producto = Producto.objects.get(id=id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if 'precio_venta' in request.data:
        producto.precio_venta = float(request.data['precio_venta'])

    if 'stock_minimo' in request.data:
        producto.stock_minimo = int(request.data['stock_minimo'])

    if 'iva_porcentaje' in request.data:
        producto.iva_porcentaje = float(request.data['iva_porcentaje'])

    if 'observaciones' in request.data:
        producto.observaciones = request.data['observaciones']

    if 'descripcion' in request.data:
        producto.descripcion = request.data['descripcion']

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


@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def cambiar_estado_producto(request, producto_id):
    try:
        producto = Producto.objects.get(id=producto_id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    nuevo_estado = request.data.get('estado')

    if nuevo_estado not in ['activo', 'inactivo']:
        return Response(
            {'error': 'Estado no valido. Use "activo" o "inactivo"'},
            status=status.HTTP_400_BAD_REQUEST
        )

    producto.estado = nuevo_estado
    producto.save()

    return Response({
        'mensaje': f'Producto {nuevo_estado} correctamente',
        'estado': nuevo_estado,
        'producto': ProductoSerializer(producto).data
    }, status=status.HTTP_200_OK)
