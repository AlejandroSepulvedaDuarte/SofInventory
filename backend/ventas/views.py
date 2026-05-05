from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from decimal import Decimal

from .models import Venta, DetalleVenta
from .serializers import VentaSerializer
from productos.models import Producto
from inventario.models import Almacen, StockAlmacen, MovimientoInventario
from usuarios.permissions import require_roles


def get_usuario(request):
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return user
    return None


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
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
    metodo_pago = metodo_pago_data.get('metodo', '') if metodo_pago_data else ''
    if not metodo_pago:
        return Response({'error': 'Debe seleccionar un método de pago.'},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        almacen = Almacen.objects.get(pk=almacen_id)
    except Almacen.DoesNotExist:
        return Response({'error': 'Almacén no encontrado.'},
                        status=status.HTTP_404_NOT_FOUND)

    vendedor = get_usuario(request)
    if not vendedor:
        return Response(
            {'error': 'Debe enviar un vendedor_id valido para procesar la venta.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            subtotal_productos = Decimal('0')
            iva_total = Decimal('0')
            iva_porcentajes = set()

            for item in productos_data:
                try:
                    producto = Producto.objects.get(pk=item['producto_id'])
                except Producto.DoesNotExist:
                    raise ValueError(f'Producto ID {item["producto_id"]} no encontrado.')

                try:
                    stock_obj = StockAlmacen.objects.get(producto=producto, almacen=almacen)
                except StockAlmacen.DoesNotExist:
                    raise ValueError(
                        f'"{producto.nombre}" no tiene stock en el almacén "{almacen.nombre}".'
                    )

                cantidad = int(item['cantidad'])
                if stock_obj.cantidad < cantidad:
                    raise ValueError(
                        f'Stock insuficiente para "{producto.nombre}". '
                        f'Disponible en {almacen.nombre}: {stock_obj.cantidad} unidades.'
                    )

                precio = Decimal(str(item['precio_unitario']))
                subtotal_linea = precio * cantidad
                iva_producto = Decimal(str(producto.iva_porcentaje))

                subtotal_productos += subtotal_linea
                iva_total += subtotal_linea * (iva_producto / Decimal('100'))
                iva_porcentajes.add(float(iva_producto))

            descuento = Decimal(str(data.get('descuento', 0) or 0))
            total_venta = (subtotal_productos - descuento) + iva_total

            venta = Venta.objects.create(
                cliente_id=data.get('cliente_id') or None,
                vendedor=vendedor,
                subtotal=subtotal_productos,
                descuento=descuento,
                tipo_iva='automatico',
                iva_porcentaje=list(iva_porcentajes)[0] if len(iva_porcentajes) == 1 else 0,
                iva_monto=iva_total,
                total=total_venta,
                metodo_pago=metodo_pago,
                observaciones=data.get('observaciones', ''),
                efectivo_recibido=metodo_pago_data.get('efectivoRecibido'),
                cambio=metodo_pago_data.get('cambio'),
                numero_tarjeta=metodo_pago_data.get('numeroTarjeta'),
                aprobacion_tarjeta=metodo_pago_data.get('aprobacionTarjeta'),
                comprobante_transferencia=metodo_pago_data.get('comprobanteTransferencia'),
                otro_metodo=metodo_pago_data.get('otroMetodo'),
            )

            for item in productos_data:
                producto = Producto.objects.get(pk=item['producto_id'])
                cantidad = int(item['cantidad'])
                precio = Decimal(str(item['precio_unitario']))
                stock_obj = StockAlmacen.objects.get(producto=producto, almacen=almacen)

                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    nombre_producto=producto.nombre,
                    sku_producto=producto.sku,
                    precio_unitario=precio,
                    cantidad=cantidad,
                )

                stock_obj.cantidad -= cantidad
                stock_obj.save()

                total_stock = producto.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
                Producto.objects.filter(pk=producto.id).update(stock=total_stock)

                MovimientoInventario.objects.create(
                    tipo='SALIDA_VENTA',
                    producto=producto,
                    almacen_origen=almacen,
                    cantidad=cantidad,
                    observacion=f'Venta {venta.numero_venta}',
                    creado_por=vendedor
                )

            return Response({
                'mensaje': f'Venta {venta.numero_venta} procesada correctamente.',
                'numero_factura': venta.numero_venta,
                'total': float(venta.total),
                'venta_id': venta.id,
            }, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Error al procesar la venta: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def listar_ventas(request):
    ventas = Venta.objects.select_related('cliente', 'vendedor').prefetch_related('detalles__producto')

    fecha_desde = request.GET.get('fecha_desde')
    fecha_hasta = request.GET.get('fecha_hasta')
    busqueda = request.GET.get('busqueda', '')
    estado = request.GET.get('estado', '')

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


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def detalle_venta(request, pk):
    try:
        venta = Venta.objects.select_related('cliente', 'vendedor').prefetch_related(
            'detalles__producto'
        ).get(pk=pk)
    except Venta.DoesNotExist:
        return Response({'error': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = VentaSerializer(venta)
    return Response(serializer.data)


@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
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

    vendedor = get_usuario(request)
    if not vendedor:
        return Response(
            {'error': 'Debe enviar un vendedor_id valido para anular la venta.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            for detalle in venta.detalles.all():
                producto = detalle.producto

                movimiento = MovimientoInventario.objects.filter(
                    tipo='SALIDA_VENTA',
                    producto=producto,
                    observacion__icontains=venta.numero_venta
                ).first()

                almacen = movimiento.almacen_origen if movimiento else \
                    Almacen.objects.filter(estado='activo').order_by('id').first()

                if not almacen:
                    raise ValueError(f'No se encontró almacén para devolver "{producto.nombre}".')

                stock_obj, _ = StockAlmacen.objects.get_or_create(
                    producto=producto, almacen=almacen,
                    defaults={'cantidad': 0}
                )
                stock_obj.cantidad += detalle.cantidad
                stock_obj.save()

                total_stock = producto.stocks.aggregate(t=Sum('cantidad'))['t'] or 0
                Producto.objects.filter(pk=producto.id).update(stock=total_stock)

                MovimientoInventario.objects.create(
                    tipo='DEVOLUCION_VENTA',
                    producto=producto,
                    almacen_destino=almacen,
                    cantidad=detalle.cantidad,
                    observacion=f'Anulación venta {venta.numero_venta}: {motivo}',
                    creado_por=vendedor
                )

            venta.estado = 'anulada'
            venta.fecha_anulacion = timezone.now()
            venta.anulado_por = vendedor
            venta.motivo_anulacion = motivo
            venta.save()

            return Response({
                'mensaje': f'Venta {venta.numero_venta} anulada correctamente.',
                'estado': 'anulada'
            })

    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f'Error al anular la venta: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST)
