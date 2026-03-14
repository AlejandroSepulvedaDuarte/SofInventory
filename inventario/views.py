from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Q
from django.http import HttpResponse
from .models import (Almacen, StockAlmacen, MovimientoInventario)
from .serializers import (AlmacenSerializer, StockInventarioSerializer,
                           MovimientoRapidoSerializer)
from productos.models import Producto
from usuarios.models import Usuario
import csv


# =========================================================
# UTILIDAD: OBTENER USUARIO
# =========================================================
def get_usuario(request):
    usuario_id = request.data.get('usuario_id')
    if usuario_id:
        try:
            return Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            pass
    return Usuario.objects.first()


# =========================================================
# UTILIDAD: CALCULAR ESTADO DE STOCK POR PRODUCTO
# Usa stock_minimo del producto (campo ya existente en BD)
# Regla:
#   agotado → stock == 0
#   bajo    → stock <= stock_minimo
#   medio   → stock <= stock_minimo * 2
#   alto    → stock >  stock_minimo * 2
# =========================================================
def calcular_estado_stock(stock_actual, stock_minimo):
    if stock_minimo is None or stock_minimo <= 0:
        stock_minimo = 5  # valor de seguridad si el producto no tiene stock_minimo definido

    if stock_actual == 0:
        return 'agotado'
    elif stock_actual <= stock_minimo:
        return 'bajo'
    elif stock_actual <= stock_minimo * 2:
        return 'medio'
    else:
        return 'alto'


# =========================================================
# ALMACENES
# =========================================================

@api_view(['POST'])
def crear_almacen(request):
    serializer = AlmacenSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(creado_por=get_usuario(request))
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def listar_almacenes(request):
    almacenes  = Almacen.objects.all()
    serializer = AlmacenSerializer(almacenes, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def detalle_almacen(request, pk):
    try:
        almacen = Almacen.objects.get(pk=pk)
    except Almacen.DoesNotExist:
        return Response({'error': 'Almacén no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)
    return Response(AlmacenSerializer(almacen).data)


@api_view(['PUT'])
def editar_almacen(request, pk):
    try:
        almacen = Almacen.objects.get(pk=pk)
    except Almacen.DoesNotExist:
        return Response({'error': 'Almacén no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)
    serializer = AlmacenSerializer(almacen, data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def eliminar_almacen(request, pk):
    try:
        almacen = Almacen.objects.get(pk=pk)
    except Almacen.DoesNotExist:
        return Response({'error': 'Almacén no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)
    if almacen.stocks.filter(cantidad__gt=0).exists():
        return Response(
            {'error': f'No se puede eliminar. El almacén "{almacen.nombre}" tiene productos con stock.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    almacen.delete()
    return Response({'mensaje': 'Almacén eliminado correctamente.'},
                    status=status.HTTP_200_OK)


# =========================================================
# ESTADÍSTICAS
# NOTA: Ya no usa ConfiguracionRangosStock global.
#       Cada producto usa su propio stock_minimo.
# =========================================================

@api_view(['GET'])
def estadisticas_inventario(request):
    productos         = Producto.objects.all()
    total             = productos.count()
    configurados      = productos.exclude(estado='pendiente').count()
    pendientes        = productos.filter(estado='pendiente').count()
    almacenes_activos = Almacen.objects.filter(estado='activo').count()

    stock_bajo = 0
    for p in productos.exclude(estado='pendiente'):
        stock_actual = p.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
        estado       = calcular_estado_stock(stock_actual, p.stock_minimo)
        if estado in ('bajo', 'agotado'):
            stock_bajo += 1

    return Response({
        'total_productos':        total,
        'productos_configurados': configurados,
        'productos_pendientes':   pendientes,
        'stock_bajo':             stock_bajo,
        'total_almacenes':        almacenes_activos,
    })


# =========================================================
# TABLA DE INVENTARIO CON FILTROS
# NOTA: estado_stock calculado por producto con su stock_minimo
# =========================================================

@api_view(['GET'])
def listar_inventario(request):
    productos = Producto.objects.select_related('categoria').prefetch_related('stocks__almacen')

    busqueda      = request.GET.get('busqueda', '')
    categoria     = request.GET.get('categoria', '')
    almacen       = request.GET.get('almacen', '')
    filtro_stock  = request.GET.get('stock', '')
    filtro_estado = request.GET.get('estado', '')

    if busqueda:
        productos = productos.filter(
            Q(nombre__icontains=busqueda) |
            Q(marca__icontains=busqueda)  |
            Q(sku__icontains=busqueda)
        )
    if categoria:
        productos = productos.filter(categoria__id=categoria)
    if almacen:
        productos = productos.filter(stocks__almacen__id=almacen)
    if filtro_estado == 'configurado':
        productos = productos.exclude(estado='pendiente')
    elif filtro_estado == 'pendiente':
        productos = productos.filter(estado='pendiente')

    serializer = StockInventarioSerializer(
        productos, many=True, context={'request': request}
    )

    resultado = []
    for item, producto in zip(serializer.data, productos):
        item = dict(item)

        # Productos pendientes no tienen stock real aun
        # se muestran con estado especial para no generar falsas alertas en rojo
        if producto.estado == 'pendiente':
            item['estado_stock'] = 'pendiente'
            item['stock_minimo'] = 0
        else:
            stock_actual         = item['stock_actual']
            stock_minimo         = producto.stock_minimo
            item['estado_stock'] = calcular_estado_stock(stock_actual, stock_minimo)
            item['stock_minimo'] = stock_minimo

        # El filtro de stock no aplica a productos pendientes
        if filtro_stock and item['estado_stock'] != filtro_stock:
            continue

        resultado.append(item)

    # Pendientes al final, luego ordenar por stock ascendente
    resultado.sort(key=lambda x: (x['estado_stock'] == 'pendiente', x['stock_actual']))
    return Response(resultado)


# =========================================================
# ALERTAS DE STOCK
# NOTA: Alerta cuando estado es 'bajo' o 'agotado'
#       usando stock_minimo de cada producto
# =========================================================

@api_view(['GET'])
def alertas_stock(request):
    alertas = []

    for p in Producto.objects.exclude(estado='pendiente').prefetch_related('stocks'):
        stock_actual = p.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
        estado       = calcular_estado_stock(stock_actual, p.stock_minimo)

        if estado in ('bajo', 'agotado'):
            alertas.append({
                'producto_id':  p.id,
                'sku':          p.sku,
                'nombre':       p.nombre,
                'stock_actual': stock_actual,
                'stock_minimo': p.stock_minimo,
                'tipo_alerta':  estado,
            })

    return Response(alertas)


# =========================================================
# MOVIMIENTO RÁPIDO
# =========================================================

@api_view(['POST'])
def movimiento_rapido(request):
    serializer = MovimientoRapidoSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data              = serializer.validated_data
    producto_id       = data['producto_id']
    almacen_id        = data['almacen_id']
    almacen_destino_id = data.get('almacen_destino_id')  # solo para transferencia
    cantidad          = data['cantidad']
    tipo              = data['tipo']
    observacion       = data.get('observacion', '')

    try:
        producto = Producto.objects.get(pk=producto_id)
        almacen  = Almacen.objects.get(pk=almacen_id)
    except Producto.DoesNotExist:
        return Response({'error': 'Producto no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)
    except Almacen.DoesNotExist:
        return Response({'error': 'Almacén no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)

    # ----------------------------------------------------------
    # ENTRADA: Ajuste positivo de inventario
    # No es una compra. Solo corrige o agrega unidades al almacén.
    # ----------------------------------------------------------
    if tipo == 'entrada':
        stock_obj, _ = StockAlmacen.objects.get_or_create(
            producto=producto, almacen=almacen,
            defaults={'cantidad': 0}
        )
        stock_anterior      = stock_obj.cantidad
        stock_obj.cantidad += cantidad
        stock_obj.save()

        MovimientoInventario.objects.create(
            tipo            = 'AJUSTE_POSITIVO',
            producto        = producto,
            almacen_destino = almacen,
            almacen_origen  = None,
            cantidad        = cantidad,
            observacion     = observacion or 'Entrada manual de inventario',
            creado_por      = get_usuario(request)
        )

    # ----------------------------------------------------------
    # SALIDA: Ajuste negativo de inventario
    # No es una venta. Solo retira unidades del almacén.
    # ----------------------------------------------------------
    elif tipo == 'salida':
        try:
            stock_obj = StockAlmacen.objects.get(producto=producto, almacen=almacen)
        except StockAlmacen.DoesNotExist:
            return Response({'error': 'Este producto no tiene stock en el almacén seleccionado.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if stock_obj.cantidad < cantidad:
            return Response(
                {'error': f'Stock insuficiente. Stock actual en este almacén: {stock_obj.cantidad}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        stock_anterior      = stock_obj.cantidad
        stock_obj.cantidad -= cantidad
        stock_obj.save()

        MovimientoInventario.objects.create(
            tipo           = 'AJUSTE_NEGATIVO',
            producto       = producto,
            almacen_origen = almacen,
            almacen_destino = None,
            cantidad       = cantidad,
            observacion    = observacion or 'Salida manual de inventario',
            creado_por     = get_usuario(request)
        )

    # ----------------------------------------------------------
    # TRANSFERENCIA: Mueve unidades de un almacén a otro
    # Descuenta del almacén origen y suma al almacén destino.
    # ----------------------------------------------------------
    elif tipo == 'transferencia':
        if not almacen_destino_id:
            return Response(
                {'error': 'Debe seleccionar un almacén destino para la transferencia.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if almacen_id == almacen_destino_id:
            return Response(
                {'error': 'El almacén origen y destino no pueden ser el mismo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            almacen_destino = Almacen.objects.get(pk=almacen_destino_id)
        except Almacen.DoesNotExist:
            return Response({'error': 'Almacén destino no encontrado.'},
                            status=status.HTTP_404_NOT_FOUND)

        # Verificar stock en origen
        try:
            stock_origen = StockAlmacen.objects.get(producto=producto, almacen=almacen)
        except StockAlmacen.DoesNotExist:
            return Response({'error': 'Este producto no tiene stock en el almacén origen.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if stock_origen.cantidad < cantidad:
            return Response(
                {'error': f'Stock insuficiente en almacén origen. Disponible: {stock_origen.cantidad}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Descontar del origen
        stock_anterior          = stock_origen.cantidad
        stock_origen.cantidad  -= cantidad
        stock_origen.save()

        # Sumar al destino
        stock_destino, _ = StockAlmacen.objects.get_or_create(
            producto=producto, almacen=almacen_destino,
            defaults={'cantidad': 0}
        )
        stock_destino.cantidad += cantidad
        stock_destino.save()

        nota = observacion or f'Transferencia: {almacen.nombre} → {almacen_destino.nombre}'

        # Registro de SALIDA en almacén origen
        MovimientoInventario.objects.create(
            tipo           = 'TRASLADO_SALIDA',
            producto       = producto,
            almacen_origen = almacen,
            almacen_destino = None,
            cantidad       = cantidad,
            observacion    = nota,
            creado_por     = get_usuario(request)
        )

        # Registro de ENTRADA en almacén destino
        MovimientoInventario.objects.create(
            tipo            = 'TRASLADO_ENTRADA',
            producto        = producto,
            almacen_origen  = None,
            almacen_destino = almacen_destino,
            cantidad        = cantidad,
            observacion     = nota,
            creado_por      = get_usuario(request)
        )

    else:
        return Response({'error': f'Tipo de movimiento no válido: {tipo}'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Actualizar stock total en el modelo Producto
    total_stock = producto.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
    Producto.objects.filter(pk=producto_id).update(stock=total_stock)

    return Response({
        'mensaje':        f'Movimiento "{tipo}" realizado correctamente: {cantidad} unidades de {producto.nombre}',
        'stock_anterior': stock_anterior,
        'stock_nuevo':    total_stock,
    })


# =========================================================
# STOCK POR ALMACÉN
# Devuelve la cantidad disponible de un producto en un almacén
# específico — usado por el formulario de transferencia
# =========================================================

@api_view(['GET'])
def stock_por_almacen(request):
    producto_id = request.GET.get('producto_id')
    almacen_id  = request.GET.get('almacen_id')

    if not producto_id or not almacen_id:
        return Response({'error': 'producto_id y almacen_id son requeridos.'},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        stock = StockAlmacen.objects.get(
            producto_id=producto_id,
            almacen_id=almacen_id
        )
        return Response({'cantidad': stock.cantidad})
    except StockAlmacen.DoesNotExist:
        return Response({'cantidad': 0})


# =========================================================
# EXPORTAR CSV
# NOTA: usa stock_minimo por producto, no rangos globales
# =========================================================

@api_view(['GET'])
def exportar_inventario_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="inventario.csv"'

    writer = csv.writer(response)
    writer.writerow(['SKU', 'Producto', 'Marca', 'Referencia', 'Categoría',
                     'Almacén', 'Stock Actual', 'Stock Mínimo', 'Estado Stock',
                     'Precio Compra', 'Precio Venta', 'Estado'])

    for p in Producto.objects.select_related('categoria').prefetch_related('stocks__almacen'):
        stock_actual   = p.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
        primer_stock   = p.stocks.select_related('almacen').first()
        almacen_nombre = primer_stock.almacen.nombre if primer_stock else 'Sin almacén'
        estado_stock   = calcular_estado_stock(stock_actual, p.stock_minimo)

        writer.writerow([
            p.sku, p.nombre, p.marca, p.referencia,
            p.categoria.nombre if p.categoria else '',
            almacen_nombre, stock_actual, p.stock_minimo,
            estado_stock.capitalize(),
            p.precio_compra, p.precio_venta, p.estado
        ])

    return response