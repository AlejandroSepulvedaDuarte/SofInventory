from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from .models import Venta, DetalleVenta
from .serializers import VentaSerializer
from productos.models import Producto
from usuarios.models import Usuario
from inventario.models import Almacen, StockAlmacen, MovimientoInventario


# =========================================================
# UTILIDAD: OBTENER USUARIO
# =========================================================
def get_usuario(request):
    usuario_id = request.data.get('vendedor_id')
    if usuario_id:
        try:
            return Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            pass
    return Usuario.objects.first()


# =========================================================
# CREAR VENTA
# Flujo:
# 1. Validar stock disponible en el almacén elegido
# 2. Crear cabecera de venta
# 3. Crear detalles de venta (snapshot de precio y nombre)
# 4. Descontar stock en StockAlmacen
# 5. Actualizar stock total en tabla Producto
# 6. Registrar movimiento SALIDA_VENTA en inventario
# =========================================================
@api_view(['POST'])
def crear_venta(request):
    data = request.data

    productos_data = data.get('productos', [])
    if not productos_data:
        return Response({'error': 'Debe agregar al menos un producto.'},
                        status=status.HTTP_400_BAD_REQUEST)

    almacen_id = data.get('almacen_id')
    if not almacen_id:
        return Response({'error': 'Debe seleccionar un almacén para la venta.'},
                        status=status.HTTP_400_BAD_REQUEST)

    metodo_pago_data = data.get('metodo_pago', {})
    metodo_pago      = metodo_pago_data.get('metodo', '') if metodo_pago_data else ''
    if not metodo_pago:
        return Response({'error': 'Debe seleccionar un método de pago.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        almacen = Almacen.objects.get(pk=almacen_id)
    except Almacen.DoesNotExist:
        return Response({'error': 'Almacén no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)

    try:
        vendedor = Usuario.objects.get(pk=data.get('vendedor_id'))
    except Usuario.DoesNotExist:
        vendedor = Usuario.objects.first()

    try:
        with transaction.atomic():

            # ─────────────────────────────────────────────
            # PASO 1: Validar stock en el almacén elegido
            # ─────────────────────────────────────────────
            for item in productos_data:
                try:
                    producto = Producto.objects.get(pk=item['producto_id'])
                except Producto.DoesNotExist:
                    raise ValueError(f'Producto ID {item["producto_id"]} no encontrado.')

                try:
                    stock_obj = StockAlmacen.objects.get(
                        producto=producto, almacen=almacen
                    )
                except StockAlmacen.DoesNotExist:
                    raise ValueError(
                        f'"{producto.nombre}" no tiene stock en el almacén "{almacen.nombre}".'
                    )

                if stock_obj.cantidad < int(item['cantidad']):
                    raise ValueError(
                        f'Stock insuficiente para "{producto.nombre}". '
                        f'Disponible en {almacen.nombre}: {stock_obj.cantidad} unidades.'
                    )

            # ─────────────────────────────────────────────
            # PASO 2: Crear cabecera de venta
            # ─────────────────────────────────────────────
            venta = Venta.objects.create(
                cliente_id   = data.get('cliente_id') or None,
                vendedor     = vendedor,
                subtotal     = data.get('subtotal', 0),
                descuento    = data.get('descuento', 0),
                tipo_iva     = data.get('tipo_iva', 'automatico'),
                iva_monto    = data.get('iva', 0),
                total        = data.get('total', 0),
                metodo_pago  = metodo_pago,
                observaciones = data.get('observaciones', ''),

                # Campos de pago según método
                efectivo_recibido         = metodo_pago_data.get('efectivoRecibido'),
                cambio                    = metodo_pago_data.get('cambio'),
                numero_tarjeta            = metodo_pago_data.get('numeroTarjeta'),
                aprobacion_tarjeta        = metodo_pago_data.get('aprobacionTarjeta'),
                comprobante_transferencia = metodo_pago_data.get('comprobanteTransferencia'),
                otro_metodo               = metodo_pago_data.get('otroMetodo'),
            )

            # ─────────────────────────────────────────────
            # PASOS 3, 4 y 5: Por cada producto del carrito
            # ─────────────────────────────────────────────
            for item in productos_data:
                producto  = Producto.objects.get(pk=item['producto_id'])
                cantidad  = int(item['cantidad'])
                precio    = float(item['precio_unitario'])
                stock_obj = StockAlmacen.objects.get(
                    producto=producto, almacen=almacen
                )

                # 3. Crear detalle con snapshot de nombre y precio
                DetalleVenta.objects.create(
                    venta           = venta,
                    producto        = producto,
                    nombre_producto = producto.nombre,
                    sku_producto    = producto.sku,
                    precio_unitario = precio,
                    cantidad        = cantidad,
                )

                # 4. Descontar stock en el almacén elegido
                stock_obj.cantidad -= cantidad
                stock_obj.save()

                # 5. Actualizar stock total en tabla Producto
                total_stock = producto.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
                Producto.objects.filter(pk=producto.id).update(stock=total_stock)

                # 6. Registrar movimiento SALIDA_VENTA
                MovimientoInventario.objects.create(
                    tipo           = 'SALIDA_VENTA',
                    producto       = producto,
                    almacen_origen = almacen,
                    cantidad       = cantidad,
                    observacion    = f'Venta {venta.numero_venta}',
                    creado_por     = vendedor
                )

            return Response({
                'mensaje':        f'Venta {venta.numero_venta} procesada correctamente.',
                'numero_factura': venta.numero_venta,
                'total':          float(venta.total),
                'venta_id':       venta.id,
            }, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Error al procesar la venta: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST)


# =========================================================
# LISTAR VENTAS — con filtros opcionales
# =========================================================
@api_view(['GET'])
def listar_ventas(request):
    ventas = Venta.objects.select_related('cliente', 'vendedor').prefetch_related('detalles__producto')

    fecha_desde = request.GET.get('fecha_desde')
    fecha_hasta = request.GET.get('fecha_hasta')
    busqueda    = request.GET.get('busqueda', '')
    estado      = request.GET.get('estado', '')

    if fecha_desde:
        ventas = ventas.filter(fecha_creacion__date__gte=fecha_desde)
    if fecha_hasta:
        ventas = ventas.filter(fecha_creacion__date__lte=fecha_hasta)
    if estado:
        ventas = ventas.filter(estado=estado)
    if busqueda:
        ventas = ventas.filter(
            Q(numero_venta__icontains=busqueda) |
            Q(cliente__nombres__icontains=busqueda) |
            Q(cliente__apellidos__icontains=busqueda) |
            Q(cliente__razon_social__icontains=busqueda) |
            Q(detalles__nombre_producto__icontains=busqueda)
        ).distinct()

    serializer = VentaSerializer(ventas, many=True)
    return Response(serializer.data)


# =========================================================
# DETALLE DE VENTA
# =========================================================
@api_view(['GET'])
def detalle_venta(request, pk):
    try:
        venta = Venta.objects.select_related('cliente', 'vendedor').prefetch_related(
            'detalles__producto'
        ).get(pk=pk)
    except Venta.DoesNotExist:
        return Response({'error': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = VentaSerializer(venta)
    return Response(serializer.data)


# =========================================================
# ANULAR VENTA
# Devuelve el stock al almacén origen registrado en los
# movimientos de inventario de esa venta
# =========================================================
@api_view(['PATCH'])
def anular_venta(request, pk):
    try:
        venta = Venta.objects.prefetch_related('detalles__producto').get(pk=pk)
    except Venta.DoesNotExist:
        return Response({'error': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    if venta.estado == 'anulada':
        return Response({'error': 'Esta venta ya está anulada.'}, status=status.HTTP_400_BAD_REQUEST)

    motivo = request.data.get('motivo', '').strip()
    if not motivo:
        return Response({'error': 'Debe ingresar el motivo de anulación.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        vendedor = Usuario.objects.get(pk=request.data.get('vendedor_id'))
    except Usuario.DoesNotExist:
        vendedor = Usuario.objects.first()

    try:
        with transaction.atomic():
            for detalle in venta.detalles.all():
                producto = detalle.producto

                # Buscar el movimiento SALIDA_VENTA de esta venta para saber el almacén
                movimiento = MovimientoInventario.objects.filter(
                    tipo       = 'SALIDA_VENTA',
                    producto   = producto,
                    observacion__icontains = venta.numero_venta
                ).first()

                almacen = movimiento.almacen_origen if movimiento else \
                          Almacen.objects.filter(estado='activo').order_by('id').first()

                if not almacen:
                    raise ValueError(f'No se encontró almacén para devolver "{producto.nombre}".')

                # Devolver stock al almacén
                stock_obj, _ = StockAlmacen.objects.get_or_create(
                    producto=producto, almacen=almacen,
                    defaults={'cantidad': 0}
                )
                stock_obj.cantidad += detalle.cantidad
                stock_obj.save()

                # Actualizar stock total en Producto
                total_stock = producto.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
                Producto.objects.filter(pk=producto.id).update(stock=total_stock)

                # Registrar movimiento de devolución
                MovimientoInventario.objects.create(
                    tipo            = 'DEVOLUCION_VENTA',
                    producto        = producto,
                    almacen_destino = almacen,
                    cantidad        = detalle.cantidad,
                    observacion     = f'Anulación venta {venta.numero_venta}: {motivo}',
                    creado_por      = vendedor
                )

            venta.estado          = 'anulada'
            venta.fecha_anulacion = timezone.now()
            venta.anulado_por     = vendedor
            venta.motivo_anulacion = motivo
            venta.save()

            return Response({
                'mensaje': f'Venta {venta.numero_venta} anulada correctamente.',
                'estado':  'anulada'
            })

    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Error al anular la venta: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST)
