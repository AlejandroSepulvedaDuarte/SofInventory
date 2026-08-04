from decimal import Decimal

from django.db import migrations
from django.db.models import Sum


def reconciliar_inventario(apps, schema_editor):
    Almacen = apps.get_model('inventario', 'Almacen')
    Compra = apps.get_model('compras', 'Compra')
    DetalleCompra = apps.get_model('compras', 'DetalleCompra')
    Movimiento = apps.get_model('inventario', 'MovimientoInventario')
    Producto = apps.get_model('productos', 'Producto')
    StockAlmacen = apps.get_model('inventario', 'StockAlmacen')
    Venta = apps.get_model('ventas', 'Venta')

    almacen_predeterminado = Almacen.objects.filter(
        estado='activo'
    ).order_by('pk').first()

    # Enlazar referencias genericas de compras creadas por versiones anteriores.
    for movimiento in Movimiento.objects.filter(
        referencia_tipo__iexact='COMPRA',
        referencia_id__isnull=False,
        compra__isnull=True,
    ).iterator():
        if Compra.objects.filter(pk=movimiento.referencia_id).exists():
            movimiento.compra_id = movimiento.referencia_id
            movimiento.save(update_fields=['compra'])

    # Identificar el almacen original de cada compra y reparar entradas omitidas.
    for compra in Compra.objects.filter(estado='completada').iterator():
        movimientos = Movimiento.objects.filter(
            compra_id=compra.pk,
            tipo='ENTRADA_COMPRA',
        )
        almacen = (
            Almacen.objects.filter(
                pk=movimientos.exclude(almacen_destino_id=None)
                .values_list('almacen_destino_id', flat=True)
                .first()
            ).first()
            or almacen_predeterminado
        )
        if almacen and compra.almacen_id != almacen.pk:
            compra.almacen_id = almacen.pk
            compra.save(update_fields=['almacen'])
        if not almacen:
            continue

        detalles = (
            DetalleCompra.objects.filter(compra_id=compra.pk)
            .values('producto_id')
            .annotate(cantidad_total=Sum('cantidad'))
        )
        for detalle in detalles:
            producto_id = detalle['producto_id']
            cantidad_documento = detalle['cantidad_total'] or 0
            cantidad_movida = (
                movimientos.filter(producto_id=producto_id)
                .aggregate(total=Sum('cantidad'))['total']
                or 0
            )
            faltante = cantidad_documento - cantidad_movida
            if faltante <= 0:
                continue

            detalle_costo = (
                DetalleCompra.objects.filter(
                    compra_id=compra.pk,
                    producto_id=producto_id,
                )
                .order_by('pk')
                .first()
            )
            stock, _ = StockAlmacen.objects.get_or_create(
                producto_id=producto_id,
                almacen_id=almacen.pk,
                defaults={'cantidad': 0},
            )
            stock.cantidad += faltante
            stock.save(update_fields=['cantidad'])
            movimiento = Movimiento.objects.create(
                tipo='ENTRADA_COMPRA',
                producto_id=producto_id,
                almacen_destino_id=almacen.pk,
                cantidad=faltante,
                costo_unitario=(
                    detalle_costo.costo_unitario
                    if detalle_costo
                    else Decimal('0')
                ),
                referencia_tipo='COMPRA',
                referencia_id=compra.pk,
                compra_id=compra.pk,
                observacion=(
                    f'Reconciliacion automatica compra {compra.numero_factura}'
                ),
                creado_por_id=compra.registrado_por_id,
            )
            Movimiento.objects.filter(pk=movimiento.pk).update(
                fecha=compra.fecha_registro
            )

    # Enlazar ventas antiguas a sus movimientos y conservar el almacen historico.
    for venta in Venta.objects.all().iterator():
        movimientos = Movimiento.objects.filter(
            tipo='SALIDA_VENTA',
            observacion__icontains=venta.numero_venta,
        )
        movimientos.filter(venta__isnull=True).update(
            venta_id=venta.pk,
            referencia_tipo='VENTA',
            referencia_id=venta.pk,
        )
        almacen_id = (
            movimientos.exclude(almacen_origen_id=None)
            .values_list('almacen_origen_id', flat=True)
            .first()
        )
        if almacen_id and venta.almacen_id != almacen_id:
            venta.almacen_id = almacen_id
            venta.save(update_fields=['almacen'])

    # Producto.stock se conserva como cache compatible, nunca como fuente primaria.
    for producto in Producto.objects.all().iterator():
        total = (
            StockAlmacen.objects.filter(producto_id=producto.pk)
            .aggregate(total=Sum('cantidad'))['total']
            or 0
        )
        if producto.stock != total:
            producto.stock = total
            producto.save(update_fields=['stock'])


class Migration(migrations.Migration):

    dependencies = [
        ('inventario', '0002_movimiento_referencias_constraints'),
        ('ventas', '0002_venta_almacen_constraints'),
    ]

    operations = [
        migrations.RunPython(
            reconciliar_inventario,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
