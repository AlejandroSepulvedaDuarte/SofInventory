import csv

from django.db.models import IntegerField, Q, Sum, Value
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from productos.models import Producto
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from usuarios.permissions import require_roles

from .models import Almacen, MovimientoInventario, StockAlmacen
from .serializers import (
    AlmacenSerializer,
    MovimientoInventarioSerializer,
    MovimientoRapidoSerializer,
    StockInventarioSerializer,
)
from .services import InventarioError, ServicioInventario


def calcular_estado_stock(stock_actual, stock_minimo):
    if stock_actual == 0:
        return 'agotado'
    if stock_minimo > 0 and stock_actual <= stock_minimo:
        return 'bajo'
    if stock_minimo > 0 and stock_actual <= stock_minimo * 2:
        return 'medio'
    return 'alto'


def productos_con_stock(queryset=None, almacen_id=None):
    if queryset is None:
        queryset = Producto.objects.all()
    filtro = Q(stocks__almacen_id=almacen_id) if almacen_id else Q()
    return queryset.annotate(
        stock_actual_calculado=Coalesce(
            Sum('stocks__cantidad', filter=filtro),
            Value(0),
            output_field=IntegerField(),
        )
    )


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def crear_almacen(request):
    serializer = AlmacenSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def listar_almacenes(request):
    almacenes = Almacen.objects.prefetch_related('stocks').all()
    return Response(AlmacenSerializer(almacenes, many=True).data)


@api_view(['GET'])
def detalle_almacen(request, pk):
    try:
        almacen = Almacen.objects.prefetch_related('stocks').get(pk=pk)
    except Almacen.DoesNotExist:
        return Response(
            {'error': 'Almacén no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(AlmacenSerializer(almacen).data)


@api_view(['PUT'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def editar_almacen(request, pk):
    try:
        almacen = Almacen.objects.get(pk=pk)
    except Almacen.DoesNotExist:
        return Response(
            {'error': 'Almacén no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = AlmacenSerializer(almacen, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@require_roles('Administrador', 'Supervisor')
def eliminar_almacen(request, pk):
    try:
        almacen = Almacen.objects.get(pk=pk)
    except Almacen.DoesNotExist:
        return Response(
            {'error': 'Almacén no encontrado.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    if almacen.stocks.filter(cantidad__gt=0).exists():
        return Response(
            {
                'error': (
                    f'No se puede eliminar. El almacén "{almacen.nombre}" '
                    'tiene productos con stock.'
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        almacen.delete()
    except ProtectedError:
        return Response(
            {
                'error': (
                    'El almacén tiene historial asociado. Cambia su estado '
                    'a inactivo en lugar de eliminarlo.'
                )
            },
            status=status.HTTP_409_CONFLICT,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def estadisticas_inventario(request):
    productos = list(productos_con_stock())
    configurados = [p for p in productos if p.estado != 'pendiente']
    disponibles = sum(1 for p in configurados if p.stock_actual_calculado > 0)
    stock_bajo = sum(
        1
        for producto in configurados
        if calcular_estado_stock(
            producto.stock_actual_calculado, producto.stock_minimo
        ) in ('bajo', 'agotado')
    )
    almacenes = Almacen.objects.filter(estado='activo').count()
    return Response(
        {
            'total_productos': len(productos),
            'productos': len(productos),
            'productos_configurados': len(configurados),
            'productos_pendientes': len(productos) - len(configurados),
            'disponible': disponibles,
            'en_stock': disponibles,
            'stock_bajo': stock_bajo,
            'bajo_stock': stock_bajo,
            'total_almacenes': almacenes,
            'almacenes': almacenes,
        }
    )


@api_view(['GET'])
def listar_inventario(request):
    busqueda = request.GET.get('busqueda', '').strip()
    categoria = request.GET.get('categoria', '').strip()
    almacen_id = request.GET.get('almacen', '').strip()
    filtro_stock = request.GET.get('stock', '').strip()
    filtro_estado = request.GET.get('estado', '').strip()

    productos = Producto.objects.select_related('categoria').prefetch_related(
        'stocks__almacen'
    )
    if busqueda:
        productos = productos.filter(
            Q(nombre__icontains=busqueda)
            | Q(marca__icontains=busqueda)
            | Q(sku__icontains=busqueda)
        )
    if categoria:
        productos = productos.filter(categoria_id=categoria)
    if filtro_estado == 'configurado':
        productos = productos.exclude(estado='pendiente')
    elif filtro_estado == 'pendiente':
        productos = productos.filter(estado='pendiente')
    if almacen_id:
        productos = productos.filter(stocks__almacen_id=almacen_id)

    productos = list(
        productos_con_stock(productos, almacen_id=almacen_id).distinct()
    )
    datos = StockInventarioSerializer(
        productos,
        many=True,
        context={'request': request, 'almacen_id': almacen_id or None},
    ).data
    resultado = [
        item
        for item in datos
        if not filtro_stock or item['estado_stock'] == filtro_stock
    ]
    resultado.sort(
        key=lambda item: (
            item['estado_stock'] == 'pendiente',
            item['stock_actual'],
        )
    )
    return Response(resultado)


@api_view(['GET'])
def alertas_stock(request):
    productos = productos_con_stock(
        Producto.objects.filter(estado='activo')
    ).order_by('stock_actual_calculado', 'nombre')
    alertas = []
    for producto in productos:
        estado_stock = calcular_estado_stock(
            producto.stock_actual_calculado, producto.stock_minimo
        )
        if estado_stock in ('bajo', 'agotado'):
            alertas.append(
                {
                    'producto_id': producto.id,
                    'sku': producto.sku,
                    'nombre': producto.nombre,
                    'stock_actual': producto.stock_actual_calculado,
                    'stock_minimo': producto.stock_minimo,
                    'tipo_alerta': estado_stock,
                }
            )
    return Response(alertas)


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def movimiento_rapido(request):
    serializer = MovimientoRapidoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    data = serializer.validated_data
    observacion = data.get('observacion', '')

    try:
        if data['tipo'] == 'entrada':
            _, anterior, _, total = ServicioInventario.entrada(
                producto=data['producto_id'],
                almacen=data['almacen_id'],
                cantidad=data['cantidad'],
                usuario=request.user,
                tipo='AJUSTE_POSITIVO',
                observacion=observacion or 'Entrada manual de inventario',
            )
        elif data['tipo'] == 'salida':
            _, anterior, _, total = ServicioInventario.salida(
                producto=data['producto_id'],
                almacen=data['almacen_id'],
                cantidad=data['cantidad'],
                usuario=request.user,
                tipo='AJUSTE_NEGATIVO',
                observacion=observacion or 'Salida manual de inventario',
            )
        else:
            _, _, _, anterior, total = ServicioInventario.transferir(
                producto=data['producto_id'],
                almacen_origen=data['almacen_id'],
                almacen_destino=data['almacen_destino_id'],
                cantidad=data['cantidad'],
                usuario=request.user,
                observacion=observacion,
            )
    except InventarioError as exc:
        return Response(
            {'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST
        )

    return Response(
        {
            'mensaje': (
                f'Movimiento "{data["tipo"]}" realizado correctamente.'
            ),
            'stock_anterior': anterior,
            'stock_nuevo': total,
        }
    )


@api_view(['GET'])
def stock_por_almacen(request):
    producto_id = request.GET.get('producto_id')
    almacen_id = request.GET.get('almacen_id')
    if not producto_id or not almacen_id:
        return Response(
            {'error': 'Selecciona un producto y un almacén.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    cantidad = (
        StockAlmacen.objects.filter(
            producto_id=producto_id, almacen_id=almacen_id
        )
        .values_list('cantidad', flat=True)
        .first()
        or 0
    )
    return Response({'cantidad': cantidad})


@api_view(['GET'])
def listar_movimientos(request):
    movimientos = MovimientoInventario.objects.select_related(
        'producto',
        'almacen_origen',
        'almacen_destino',
        'creado_por',
    )
    if request.GET.get('producto_id'):
        movimientos = movimientos.filter(
            producto_id=request.GET['producto_id']
        )
    if request.GET.get('tipo'):
        movimientos = movimientos.filter(tipo=request.GET['tipo'])
    if request.GET.get('desde'):
        movimientos = movimientos.filter(fecha__date__gte=request.GET['desde'])
    if request.GET.get('hasta'):
        movimientos = movimientos.filter(fecha__date__lte=request.GET['hasta'])
    return Response(
        MovimientoInventarioSerializer(
            movimientos.order_by('-fecha')[:500], many=True
        ).data
    )


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def exportar_inventario_csv(request):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = (
        'attachment; filename="inventario.csv"'
    )
    response.write('\ufeff')
    writer = csv.writer(response)
    writer.writerow(
        [
            'SKU', 'Producto', 'Categoria', 'Almacenes', 'Stock Actual',
            'Stock Minimo', 'Estado Stock', 'Precio Compra',
            'Precio Venta', 'Estado Producto',
        ]
    )
    productos = productos_con_stock(
        Producto.objects.select_related('categoria').prefetch_related(
            'stocks__almacen'
        )
    )
    for producto in productos:
        almacenes = ', '.join(
            sorted(
                stock.almacen.nombre
                for stock in producto.stocks.all()
                if stock.cantidad > 0
            )
        ) or 'Sin almacén'
        writer.writerow(
            [
                producto.sku,
                producto.nombre,
                producto.categoria.nombre,
                almacenes,
                producto.stock_actual_calculado,
                producto.stock_minimo,
                calcular_estado_stock(
                    producto.stock_actual_calculado,
                    producto.stock_minimo,
                ).capitalize(),
                producto.precio_compra,
                producto.precio_venta,
                producto.estado,
            ]
        )
    return response
