from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from inventario.models import Almacen, MovimientoInventario
from inventario.services import InventarioError, ServicioInventario
from productos.models import Producto
from proveedores.models import Proveedor
from empresa.services import obtener_snapshot_empresa
from usuarios.permissions import require_roles

from .models import Compra, DetalleCompra
from .serializers import (
    AnularCompraSerializer,
    CompraSerializer,
    RegistrarCompraSerializer,
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


def _almacen_compra(almacen_id):
    consulta = Almacen.objects.filter(estado='activo')
    if almacen_id:
        consulta = consulta.filter(pk=almacen_id)
    almacen = consulta.order_by('pk').first()
    if not almacen:
        raise InventarioError(
            'Debe seleccionar un almacen activo para registrar la compra.'
        )
    return almacen


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def registrar_compra(request):
    serializer = RegistrarCompraSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': _primer_error(serializer.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    try:
        with transaction.atomic():
            try:
                proveedor = Proveedor.objects.select_for_update().get(
                    pk=data['proveedor_id']
                )
            except Proveedor.DoesNotExist as exc:
                raise InventarioError('Proveedor no encontrado.') from exc
            if proveedor.estado.lower() != 'activo':
                raise InventarioError('El proveedor seleccionado no esta activo.')

            almacen = _almacen_compra(data.get('almacen_id'))
            compra = Compra.objects.create(
                proveedor=proveedor,
                almacen=almacen,
                numero_factura=data['numero_factura'].strip(),
                fecha_compra=data['fecha_compra'],
                tipo_compra=data['tipo_compra'],
                subtotal=Decimal('0'),
                iva_total=Decimal('0'),
                total=Decimal('0'),
                registrado_por=request.user,
                observaciones=data['observaciones'],
                empresa_snapshot=obtener_snapshot_empresa(),
            )

            subtotal_compra = Decimal('0')
            iva_total = Decimal('0')
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

                cantidad = item['cantidad']
                costo = item['costo_unitario']
                iva = item['iva']
                subtotal = costo * cantidad
                total_linea = subtotal + (subtotal * iva / Decimal('100'))

                DetalleCompra.objects.create(
                    compra=compra,
                    producto=producto,
                    nombre_producto=producto.nombre,
                    sku_producto=producto.sku,
                    cantidad=cantidad,
                    costo_unitario=costo,
                    iva_porcentaje=iva,
                    subtotal=subtotal,
                    total=total_linea,
                )
                ServicioInventario.entrada(
                    producto=producto,
                    almacen=almacen,
                    cantidad=cantidad,
                    usuario=request.user,
                    tipo='ENTRADA_COMPRA',
                    costo_unitario=costo,
                    documento=compra,
                    observacion=f'Compra {compra.numero_factura}',
                )
                producto.precio_compra = costo
                producto.iva_porcentaje = iva
                producto.save(
                    update_fields=[
                        'precio_compra',
                        'iva_porcentaje',
                        'fecha_actualizacion',
                    ]
                )
                subtotal_compra += subtotal
                iva_total += total_linea - subtotal

            compra.subtotal = subtotal_compra
            compra.iva_total = iva_total
            compra.total = subtotal_compra + iva_total
            compra.save(update_fields=['subtotal', 'iva_total', 'total'])

        return Response(
            {
                'mensaje': 'Compra registrada correctamente.',
                'compra_id': compra.id,
                'total': float(compra.total),
            },
            status=status.HTTP_201_CREATED,
        )
    except (InventarioError, IntegrityError) as exc:
        mensaje = (
            'Ya existe una compra con ese numero de factura.'
            if isinstance(exc, IntegrityError)
            else str(exc)
        )
        return Response(
            {'error': mensaje},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def listar_compras(request):
    compras = (
        Compra.objects.select_related(
            'proveedor', 'proveedor__tipo_documento', 'registrado_por', 'almacen'
        )
        .prefetch_related('detalles__producto')
        .all()
    )
    return Response(CompraSerializer(compras, many=True).data)


@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def anular_compra(request, id):
    entrada = AnularCompraSerializer(data=request.data)
    if not entrada.is_valid():
        return Response(
            {'error': _primer_error(entrada.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    motivo = entrada.validated_data['motivo'].strip() or 'Anulacion de compra'

    try:
        with transaction.atomic():
            try:
                compra = Compra.objects.select_for_update().get(pk=id)
            except Compra.DoesNotExist as exc:
                raise InventarioError('Compra no encontrada.') from exc
            if compra.estado == 'anulada':
                raise InventarioError('La compra ya esta anulada.')

            movimientos = list(
                MovimientoInventario.objects.select_for_update()
                .filter(
                    compra=compra,
                    tipo='ENTRADA_COMPRA',
                )
                .order_by('producto_id', 'pk')
            )
            if not movimientos:
                raise InventarioError(
                    'La compra no tiene movimientos de entrada auditables.'
                )

            cantidades_detalle = {}
            for detalle in compra.detalles.all():
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
                    'Los movimientos de la compra no coinciden con sus detalles.'
                )

            for movimiento in movimientos:
                ServicioInventario.revertir_entrada(
                    movimiento,
                    usuario=request.user,
                    motivo=(
                        f'Anulacion compra {compra.numero_factura}: {motivo}'
                    ),
                )

            compra.estado = 'anulada'
            compra.fecha_anulacion = timezone.now()
            compra.anulado_por = request.user
            compra.motivo_anulacion = motivo
            compra.save(
                update_fields=[
                    'estado',
                    'fecha_anulacion',
                    'anulado_por',
                    'motivo_anulacion',
                ]
            )

        return Response(
            {
                'mensaje': 'Compra anulada correctamente.',
                'estado': compra.estado,
            }
        )
    except InventarioError as exc:
        codigo = (
            status.HTTP_404_NOT_FOUND
            if str(exc) == 'Compra no encontrada.'
            else status.HTTP_400_BAD_REQUEST
        )
        return Response({'error': str(exc)}, status=codigo)


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def detalle_compra(request, id):
    try:
        compra = (
            Compra.objects.select_related(
                'proveedor', 'proveedor__tipo_documento', 'registrado_por', 'almacen',
                'anulado_por',
            )
            .prefetch_related('detalles__producto')
            .get(pk=id)
        )
    except Compra.DoesNotExist:
        return Response(
            {'error': 'Compra no encontrada.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(CompraSerializer(compra).data)
