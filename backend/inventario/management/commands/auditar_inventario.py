from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum

from compras.models import DetalleCompra
from inventario.models import MovimientoInventario, StockAlmacen
from inventario.services import ServicioInventario
from productos.models import Producto
from ventas.models import DetalleVenta


class Command(BaseCommand):
    help = (
        'Audita cache, stock por almacen y movimientos de documentos '
        'completados. No modifica datos salvo con --corregir-cache.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--corregir-cache',
            action='store_true',
            help='Sincroniza Producto.stock desde StockAlmacen.',
        )
        parser.add_argument(
            '--estricto',
            action='store_true',
            help='Finaliza con error si encuentra inconsistencias.',
        )

    def handle(self, *args, **options):
        if options['corregir_cache']:
            ServicioInventario.reconciliar_cache()

        errores = []
        for producto in Producto.objects.order_by('pk'):
            total = (
                StockAlmacen.objects.filter(producto=producto)
                .aggregate(total=Sum('cantidad'))['total']
                or 0
            )
            if producto.stock != total:
                errores.append(
                    f'{producto.sku}: cache={producto.stock}, almacenes={total}'
                )

        compras = (
            DetalleCompra.objects.filter(compra__estado='completada')
            .values('compra_id', 'producto_id')
            .annotate(cantidad=Sum('cantidad'))
        )
        for detalle in compras:
            movido = (
                MovimientoInventario.objects.filter(
                    compra_id=detalle['compra_id'],
                    producto_id=detalle['producto_id'],
                    tipo='ENTRADA_COMPRA',
                ).aggregate(total=Sum('cantidad'))['total']
                or 0
            )
            if movido != detalle['cantidad']:
                errores.append(
                    f'Compra {detalle["compra_id"]}, producto '
                    f'{detalle["producto_id"]}: detalle={detalle["cantidad"]}, '
                    f'movimientos={movido}'
                )

        ventas = (
            DetalleVenta.objects.filter(venta__estado='completada')
            .values('venta_id', 'producto_id')
            .annotate(cantidad=Sum('cantidad'))
        )
        for detalle in ventas:
            movido = (
                MovimientoInventario.objects.filter(
                    venta_id=detalle['venta_id'],
                    producto_id=detalle['producto_id'],
                    tipo='SALIDA_VENTA',
                ).aggregate(total=Sum('cantidad'))['total']
                or 0
            )
            if movido != detalle['cantidad']:
                errores.append(
                    f'Venta {detalle["venta_id"]}, producto '
                    f'{detalle["producto_id"]}: detalle={detalle["cantidad"]}, '
                    f'movimientos={movido}'
                )

        if errores:
            for error in errores:
                self.stderr.write(self.style.ERROR(error))
            mensaje = f'Auditoria finalizada con {len(errores)} inconsistencia(s).'
            if options['estricto']:
                raise CommandError(mensaje)
            self.stdout.write(self.style.WARNING(mensaje))
            return

        self.stdout.write(
            self.style.SUCCESS('Inventario consistente: 0 inconsistencias.')
        )
