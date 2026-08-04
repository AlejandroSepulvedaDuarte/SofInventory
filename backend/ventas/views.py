from decimal import Decimal

from clientes.models import Cliente
from django.db import IntegrityError, transaction
from django.utils import timezone
from inventario.models import Almacen, MovimientoInventario
from inventario.services import InventarioError, ServicioInventario
from productos.models import Producto
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from usuarios.permissions import require_roles

from .models import DetalleVenta, Venta
from .serializers import (
    AnularVentaSerializer,
    RegistrarVentaSerializer,
    VentaSerializer,
)


def _primer_error(errores):
    for campo, mensajes in errores.items():
        if isinstance(mensajes, dict):
            return _primer_error(mensajes)
        if isinstance(mensajes, list) and mensajes:
            primer = mensajes[0]
            if isinstance(primer, dict):
                return _primer_error(primer)
            return str(primer)
        return f'{campo}: {mensajes}'
    return 'Los datos enviados no son validos.'


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def crear_venta(request):
    serializer = RegistrarVentaSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': _primer_error(serializer.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    data = serializer.validated_data

    try:
        with transaction.atomic():
            try:
                almacen = Almacen.objects.select_for_update().get(
                    pk=data['almacen_id']
                )
            except Almacen.DoesNotExist as exc:
                raise InventarioError('Almacen no encontrado.') from exc
            if almacen.estado != 'activo':
                raise InventarioError(
                    'El almacen seleccionado no esta disponible para ventas.'
                )

            cliente = None
            if data.get('cliente_id'):
                try:
                    cliente = Cliente.objects.get(pk=data['cliente_id'])
                except Cliente.DoesNotExist as exc:
                    raise InventarioError('Cliente no encontrado.') from exc
                if cliente.estado != 'activo':
                    raise InventarioError('El cliente seleccionado no esta activo.')

            items = []
            subtotal_productos = Decimal('0')
            iva_total = Decimal('0')
            iva_porcentajes = set()
            for item in sorted(
                data['productos'], key=lambda detalle: detalle['producto_id']
            ):
                try:
                    producto = Producto.objects.select_for_update().get(
                        pk=item['producto_id']
                    )
                except Producto.DoesNotExist as exc:
                    raise InventarioError(
                        f'Producto ID {item["producto_id"]} no encontrado.'
                    ) from exc
                if producto.estado != 'activo':
                    raise InventarioError(
                        f'El producto "{producto.nombre}" no esta activo para venta.'
                    )

                precio = producto.precio_venta
                cantidad = item['cantidad']
                ServicioInventario.validar_disponibilidad(
                    producto=producto,
                    almacen=almacen,
                    cantidad=cantidad,
                )
                subtotal_linea = precio * cantidad
                iva_producto = producto.iva_porcentaje
                subtotal_productos += subtotal_linea
                iva_total += (
                    subtotal_linea * iva_producto / Decimal('100')
                )
                iva_porcentajes.add(iva_producto)
                items.append((producto, cantidad, precio))

            descuento = data['descuento']
            if descuento > subtotal_productos:
                raise InventarioError(
                    'El descuento no puede superar el subtotal de la venta.'
                )
            total_venta = subtotal_productos - descuento + iva_total
            pago = data['metodo_pago']
            efectivo_recibido = pago.get('efectivoRecibido')
            if pago['metodo'] == 'efectivo':
                if efectivo_recibido is None:
                    raise InventarioError(
                        'Debe indicar el efectivo recibido.'
                    )
                if efectivo_recibido < total_venta:
                    raise InventarioError(
                        'El efectivo recibido es menor que el total de la venta.'
                    )
                cambio = efectivo_recibido - total_venta
            else:
                cambio = None

            venta = Venta.objects.create(
                cliente=cliente,
                vendedor=request.user,
                almacen=almacen,
                subtotal=subtotal_productos,
                descuento=descuento,
                tipo_iva='automatico',
                iva_porcentaje=(
                    next(iter(iva_porcentajes))
                    if len(iva_porcentajes) == 1
                    else Decimal('0')
                ),
                iva_monto=iva_total,
                total=total_venta,
                metodo_pago=pago['metodo'],
                observaciones=data['observaciones'],
                efectivo_recibido=efectivo_recibido,
                cambio=cambio,
                numero_tarjeta=pago.get('numeroTarjeta'),
                aprobacion_tarjeta=pago.get('aprobacionTarjeta'),
                comprobante_transferencia=pago.get(
                    'comprobanteTransferencia'
                ),
                otro_metodo=pago.get('otroMetodo'),
            )

            for producto, cantidad, precio in items:
                DetalleVenta.objects.create(
                    venta=venta,
                    producto=producto,
                    nombre_producto=producto.nombre,
                    sku_producto=producto.sku,
                    precio_unitario=precio,
                    cantidad=cantidad,
                )
                ServicioInventario.salida(
                    producto=producto,
                    almacen=almacen,
                    cantidad=cantidad,
                    usuario=request.user,
                    tipo='SALIDA_VENTA',
                    costo_unitario=producto.precio_compra,
                    documento=venta,
                    observacion=f'Venta {venta.numero_venta}',
                )

        return Response(
            {
                'mensaje': f'Venta {venta.numero_venta} procesada correctamente.',
                'numero_factura': venta.numero_venta,
                'total': float(venta.total),
                'venta_id': venta.id,
            },
            status=status.HTTP_201_CREATED,
        )
    except (InventarioError, IntegrityError) as exc:
        mensaje = (
            'No fue posible guardar la venta por un conflicto de integridad.'
            if isinstance(exc, IntegrityError)
            else str(exc)
        )
        return Response({'error': mensaje}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def listar_ventas(request):
    ventas = (
        Venta.objects.select_related('cliente', 'vendedor', 'almacen')
        .prefetch_related('detalles')
        .all()
    )
    busqueda = request.GET.get('busqueda', '').strip()
    estado_venta = request.GET.get('estado', '').strip()
    if busqueda:
        ventas = ventas.filter(numero_venta__icontains=busqueda)
    if estado_venta:
        ventas = ventas.filter(estado=estado_venta)
    return Response(VentaSerializer(ventas, many=True).data)


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def detalle_venta(request, pk):
    try:
        venta = (
            Venta.objects.select_related(
                'cliente', 'vendedor', 'almacen', 'anulado_por'
            )
            .prefetch_related('detalles')
            .get(pk=pk)
        )
    except Venta.DoesNotExist:
        return Response(
            {'error': 'Venta no encontrada.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(VentaSerializer(venta).data)


@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor', 'Vendedor')
def anular_venta(request, pk):
    entrada = AnularVentaSerializer(data=request.data)
    if not entrada.is_valid():
        return Response(
            {'error': _primer_error(entrada.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    motivo = entrada.validated_data['motivo'].strip()

    try:
        with transaction.atomic():
            try:
                venta = Venta.objects.select_for_update().get(pk=pk)
            except Venta.DoesNotExist as exc:
                raise InventarioError('Venta no encontrada.') from exc
            if venta.estado == 'anulada':
                raise InventarioError('Esta venta ya esta anulada.')

            movimientos = list(
                MovimientoInventario.objects.select_for_update()
                .filter(
                    venta=venta,
                    tipo='SALIDA_VENTA',
                )
                .order_by('producto_id', 'pk')
            )
            if not movimientos:
                raise InventarioError(
                    'La venta no tiene movimientos de salida auditables.'
                )

            cantidades_detalle = {}
            for detalle in venta.detalles.all():
                cantidades_detalle[detalle.producto_id] = (
                    cantidades_detalle.get(detalle.producto_id, 0)
                    + detalle.cantidad
                )
            cantidades_movimiento = {}
            for movimiento in movimientos:
                cantidades_movimiento[movimiento.producto_id] = (
                    cantidades_movimiento.get(movimiento.producto_id, 0)
                    + movimiento.cantidad
                )
            if cantidades_detalle != cantidades_movimiento:
                raise InventarioError(
                    'Los movimientos de la venta no coinciden con sus detalles.'
                )

            for movimiento in movimientos:
                ServicioInventario.revertir_salida(
                    movimiento,
                    usuario=request.user,
                    motivo=f'Anulacion venta {venta.numero_venta}: {motivo}',
                )

            venta.estado = 'anulada'
            venta.fecha_anulacion = timezone.now()
            venta.anulado_por = request.user
            venta.motivo_anulacion = motivo
            venta.save(
                update_fields=[
                    'estado',
                    'fecha_anulacion',
                    'anulado_por',
                    'motivo_anulacion',
                ]
            )

        return Response(
            {
                'mensaje': f'Venta {venta.numero_venta} anulada correctamente.',
                'estado': 'anulada',
            }
        )
    except InventarioError as exc:
        codigo = (
            status.HTTP_404_NOT_FOUND
            if str(exc) == 'Venta no encontrada.'
            else status.HTTP_400_BAD_REQUEST
        )
        return Response({'error': str(exc)}, status=codigo)
