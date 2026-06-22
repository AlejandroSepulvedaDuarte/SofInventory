from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction

from .models import Compra, DetalleCompra
from .serializers import CompraSerializer
from productos.models import Producto
from inventario.models import Almacen, StockAlmacen, MovimientoInventario
from usuarios.permissions import require_roles


@api_view(['POST'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def registrar_compra(request):
    data = request.data

    numero_factura = str(data.get('numero_factura', '')).strip()
    if not numero_factura.isdigit():
        return Response(
            {'error': 'El numero de factura solo puede contener numeros.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    productos_data = data.get('productos', [])
    if not productos_data:
        return Response({'error': 'Debe agregar al menos un producto.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            compra = Compra.objects.create(
                proveedor_id=data['proveedor_id'],
                numero_factura=numero_factura,
                fecha_compra=data['fecha_compra'],
                tipo_compra=data['tipo_compra'],
                subtotal=data['subtotal'],
                iva_total=data['iva_total'],
                total=data['total'],
                registrado_por=request.user,
            )

            usuario = request.user
            almacen_principal = Almacen.objects.filter(estado='activo').order_by('id').first()

            for item in productos_data:
                producto_id = item.get('producto_id')
                if not producto_id:
                    raise ValueError('Cada detalle de compra debe incluir producto_id.')

                try:
                    producto = Producto.objects.get(id=producto_id)
                except Producto.DoesNotExist:
                    raise ValueError(f'Producto ID {producto_id} no encontrado.')

                cantidad = int(item['cantidad'])
                costo_unitario = item['costo_unitario']
                iva_porcentaje = item.get('iva', 0)

                producto.stock += cantidad
                producto.precio_compra = costo_unitario
                producto.iva_porcentaje = iva_porcentaje
                producto.save()

                if producto.estado != 'pendiente' and almacen_principal:
                    stock_obj, _ = StockAlmacen.objects.get_or_create(
                        producto=producto,
                        almacen=almacen_principal,
                        defaults={'cantidad': 0}
                    )
                    stock_obj.cantidad += cantidad
                    stock_obj.save()

                    MovimientoInventario.objects.create(
                        tipo='ENTRADA_COMPRA',
                        producto=producto,
                        almacen_destino=almacen_principal,
                        cantidad=cantidad,
                        costo_unitario=costo_unitario,
                        referencia_tipo='COMPRA',
                        referencia_id=compra.id,
                        observacion=f'Compra {compra.numero_factura}',
                        creado_por=usuario
                    )

                subtotal = float(cantidad) * float(costo_unitario)
                iva_calc = subtotal * (float(iva_porcentaje) / 100)
                total = subtotal + iva_calc

                DetalleCompra.objects.create(
                    compra=compra,
                    producto=producto,
                    cantidad=cantidad,
                    costo_unitario=costo_unitario,
                    iva_porcentaje=iva_porcentaje,
                    subtotal=subtotal,
                    total=total,
                )

            return Response({
                'mensaje': 'Compra registrada correctamente.',
                'compra_id': compra.id
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def listar_compras(request):
    compras = Compra.objects.select_related('proveedor', 'registrado_por').all()
    serializer = CompraSerializer(compras, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def anular_compra(request, id):
    try:
        compra = Compra.objects.prefetch_related('detalles__producto').get(id=id)

        if compra.estado == 'anulada':
            return Response({'error': 'La compra ya está anulada.'}, status=status.HTTP_400_BAD_REQUEST)

        for detalle in compra.detalles.all():
            producto = detalle.producto
            if producto.stock < detalle.cantidad:
                return Response({
                    'error': (
                        f'No se puede anular esta compra. El producto '
                        f'"{producto.nombre} - {producto.marca} - {producto.referencia}" '
                        f'ya tiene unidades comprometidas.'
                    )
                }, status=status.HTTP_400_BAD_REQUEST)

        for detalle in compra.detalles.all():
            producto = detalle.producto
            producto.stock -= detalle.cantidad
            producto.save()

            movimiento = MovimientoInventario.objects.filter(
                referencia_tipo='COMPRA',
                referencia_id=compra.id,
                producto=producto,
                tipo='ENTRADA_COMPRA'
            ).first()

            if movimiento and movimiento.almacen_destino:
                stock_obj = StockAlmacen.objects.filter(
                    producto=producto,
                    almacen=movimiento.almacen_destino
                ).first()
                if stock_obj:
                    stock_obj.cantidad = max(0, stock_obj.cantidad - detalle.cantidad)
                    stock_obj.save()

        compra.estado = 'anulada'
        compra.save()

        return Response({
            'mensaje': 'Compra anulada correctamente.',
            'estado': compra.estado
        }, status=status.HTTP_200_OK)

    except Compra.DoesNotExist:
        return Response({'error': 'Compra no encontrada'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@require_roles('Administrador', 'Supervisor', 'Bodega')
def detalle_compra(request, id):
    try:
        compra = Compra.objects.select_related(
            'proveedor', 'registrado_por'
        ).prefetch_related(
            'detalles__producto'
        ).get(id=id)
        serializer = CompraSerializer(compra)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Compra.DoesNotExist:
        return Response({'error': 'Compra no encontrada'}, status=status.HTTP_404_NOT_FOUND)
