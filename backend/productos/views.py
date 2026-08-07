from django.db import IntegrityError, transaction
from django.db.models import IntegerField, Sum, Value
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from usuarios.permissions import require_roles

from .models import Categoria, Producto
from .serializers import (
    CategoriaSerializer,
    ProductoEscrituraSerializer,
    ProductoSerializer,
)


def generar_sku(nombre, marca, referencia):
    return f'{nombre}-{marca}-{referencia}'.upper().replace(' ', '-')


def _primer_error(errores):
    for campo, mensajes in errores.items():
        if isinstance(mensajes, list) and mensajes:
            return f'{campo}: {mensajes[0]}'
        return f'{campo}: {mensajes}'
    return 'Los datos enviados no son validos.'


def _respuesta_validacion(errores):
    return {
        'error': _primer_error(errores),
        'errors': errores,
    }


def _producto_salida(producto, request):
    producto = (
        Producto.objects.filter(pk=producto.pk)
        .select_related('categoria', 'creado_por')
        .prefetch_related('stocks')
        .annotate(
            stock_actual_calculado=Coalesce(
                Sum('stocks__cantidad'),
                Value(0),
                output_field=IntegerField(),
            )
        )
        .get()
    )
    return ProductoSerializer(producto, context={'request': request}).data


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor')
def crear_categoria(request):
    serializer = CategoriaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def listar_categorias(request):
    categorias = Categoria.objects.select_related('creado_por').all()
    return Response(CategoriaSerializer(categorias, many=True).data)


@api_view(['DELETE'])
@require_roles('Administrador', 'Supervisor')
def eliminar_categoria(request, id):
    try:
        categoria = Categoria.objects.get(pk=id)
    except Categoria.DoesNotExist:
        return Response(
            {'error': 'Categoria no encontrada.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        categoria.delete()
    except ProtectedError:
        return Response(
            {'error': 'No se puede eliminar una categoria con productos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def listar_productos(request):
    productos = (
        Producto.objects.select_related('categoria', 'creado_por')
        .prefetch_related('stocks')
        .annotate(
            stock_actual_calculado=Coalesce(
                Sum('stocks__cantidad'),
                Value(0),
                output_field=IntegerField(),
            )
        )
    )
    estado_producto = request.query_params.get('estado')
    if estado_producto:
        productos = productos.filter(estado=estado_producto)
    return Response(
        ProductoSerializer(
            productos, many=True, context={'request': request}
        ).data
    )


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor')
def crear_producto(request):
    serializer = ProductoEscrituraSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            _respuesta_validacion(serializer.errors),
            status=status.HTTP_400_BAD_REQUEST,
        )

    datos = dict(serializer.validated_data)
    sku = generar_sku(
        datos['nombre'].strip(),
        datos['marca'].strip(),
        datos['referencia'].strip(),
    )
    try:
        with transaction.atomic():
            producto = Producto.objects.create(
                sku=sku,
                creado_por=request.user,
                estado='pendiente',
                stock=0,
                **datos,
            )
    except IntegrityError:
        return Response(
            {
                'error': 'Ya existe un producto con este código.',
                'errors': {
                    'referencia': ['Ya existe un producto con esta combinación de nombre, marca y referencia.']
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {
            'mensaje': 'Producto creado correctamente.',
            'producto': _producto_salida(producto, request),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT', 'PATCH'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def configurar_producto(request, id):
    old_image = None
    try:
        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=id)
            old_image = producto.imagen if producto.imagen else None
            serializer = ProductoEscrituraSerializer(
                producto, data=request.data, partial=True
            )
            if not serializer.is_valid():
                return Response(
                    _respuesta_validacion(serializer.errors),
                    status=status.HTTP_400_BAD_REQUEST,
                )
            producto = serializer.save(estado='activo')
    except Producto.DoesNotExist:
        return Response(
            {'error': 'Producto no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if old_image and (
        not producto.imagen or old_image.name != producto.imagen.name
    ):
        transaction.on_commit(lambda: old_image.storage.delete(old_image.name))
    return Response(
        {
            'mensaje': 'Producto configurado correctamente.',
            'producto': _producto_salida(producto, request),
        }
    )


@api_view(['PUT', 'PATCH'])
@require_roles('Administrador', 'Supervisor')
def editar_producto(request, id):
    old_image = None
    try:
        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=id)
            old_image = producto.imagen if producto.imagen else None
            serializer = ProductoEscrituraSerializer(
                producto, data=request.data, partial=True
            )
            if not serializer.is_valid():
                return Response(
                    _respuesta_validacion(serializer.errors),
                    status=status.HTTP_400_BAD_REQUEST,
                )
            producto = serializer.save()
    except Producto.DoesNotExist:
        return Response(
            {'error': 'Producto no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if old_image and (
        not producto.imagen or old_image.name != producto.imagen.name
    ):
        transaction.on_commit(lambda: old_image.storage.delete(old_image.name))
    return Response(
        {
            'mensaje': 'Producto actualizado correctamente.',
            'producto': _producto_salida(producto, request),
        }
    )


@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def cambiar_estado_producto(request, producto_id):
    nuevo_estado = request.data.get('estado')
    if nuevo_estado not in ('activo', 'inactivo'):
        return Response(
            {'error': 'Estado no valido. Use "activo" o "inactivo".'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=producto_id)
            producto.estado = nuevo_estado
            producto.save(update_fields=['estado', 'fecha_actualizacion'])
    except Producto.DoesNotExist:
        return Response(
            {'error': 'Producto no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(
        {
            'mensaje': f'Producto {nuevo_estado} correctamente.',
            'estado': nuevo_estado,
            'producto': _producto_salida(producto, request),
        }
    )
