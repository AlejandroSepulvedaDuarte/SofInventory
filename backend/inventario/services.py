from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from productos.models import Producto

from .models import (
    Almacen,
    MovimientoInventario,
    StockAlmacen,
    Traslado,
    TrasladoDetalle,
)


class InventarioError(ValueError):
    """Error de negocio que debe exponerse al cliente como una respuesta 400."""


class ServicioInventario:
    """Unica puerta de escritura para existencias y movimientos de inventario."""

    TIPOS_ENTRADA = {
        'ENTRADA_COMPRA',
        'AJUSTE_POSITIVO',
        'TRASLADO_ENTRADA',
        'DEVOLUCION_VENTA',
    }
    TIPOS_SALIDA = {
        'SALIDA_VENTA',
        'AJUSTE_NEGATIVO',
        'TRASLADO_SALIDA',
        'DEVOLUCION_COMPRA',
    }

    @staticmethod
    def _id(instancia_o_id):
        return getattr(instancia_o_id, 'pk', instancia_o_id)

    @classmethod
    def _bloquear_producto(cls, producto):
        try:
            return Producto.objects.select_for_update().get(pk=cls._id(producto))
        except Producto.DoesNotExist as exc:
            raise InventarioError('Producto no encontrado.') from exc

    @classmethod
    def _bloquear_almacen(cls, almacen, permitir_no_activo=False):
        try:
            almacen_obj = Almacen.objects.select_for_update().get(
                pk=cls._id(almacen)
            )
        except Almacen.DoesNotExist as exc:
            raise InventarioError('Almacen no encontrado.') from exc

        if not permitir_no_activo and almacen_obj.estado != 'activo':
            raise InventarioError(
                f'El almacen "{almacen_obj.nombre}" no esta activo.'
            )
        return almacen_obj

    @staticmethod
    def _validar_cantidad(cantidad):
        try:
            cantidad = int(cantidad)
        except (TypeError, ValueError) as exc:
            raise InventarioError('La cantidad debe ser un numero entero.') from exc
        if cantidad <= 0:
            raise InventarioError('La cantidad debe ser mayor a cero.')
        return cantidad

    @staticmethod
    def _stock_bloqueado(producto, almacen, crear=False):
        consulta = StockAlmacen.objects.select_for_update()
        try:
            return consulta.get(producto=producto, almacen=almacen)
        except StockAlmacen.DoesNotExist:
            if not crear:
                raise InventarioError(
                    f'El producto "{producto.nombre}" no tiene stock '
                    f'en el almacen "{almacen.nombre}".'
                )

        try:
            with transaction.atomic():
                return StockAlmacen.objects.create(
                    producto=producto,
                    almacen=almacen,
                    cantidad=0,
                )
        except IntegrityError:
            return consulta.get(producto=producto, almacen=almacen)

    @staticmethod
    def _validar_capacidad(almacen, incremento):
        if almacen.capacidad is None:
            return
        actual = (
            StockAlmacen.objects.filter(almacen=almacen)
            .aggregate(total=Sum('cantidad'))['total']
            or 0
        )
        if actual + incremento > almacen.capacidad:
            raise InventarioError(
                f'La operacion supera la capacidad del almacen '
                f'"{almacen.nombre}".'
            )

    @staticmethod
    def _sincronizar_cache(producto):
        total = (
            StockAlmacen.objects.filter(producto=producto)
            .aggregate(total=Sum('cantidad'))['total']
            or 0
        )
        Producto.objects.filter(pk=producto.pk).update(stock=total)
        producto.stock = total
        return total

    @staticmethod
    def _referencia(documento):
        if documento is None:
            return {}
        nombre = documento._meta.model_name
        if nombre == 'compra':
            return {
                'compra': documento,
                'referencia_tipo': 'COMPRA',
                'referencia_id': documento.pk,
            }
        if nombre == 'venta':
            return {
                'venta': documento,
                'referencia_tipo': 'VENTA',
                'referencia_id': documento.pk,
            }
        if nombre == 'traslado':
            return {
                'traslado': documento,
                'referencia_tipo': 'TRASLADO',
                'referencia_id': documento.pk,
            }
        raise InventarioError('Tipo de documento de inventario no soportado.')

    @classmethod
    @transaction.atomic
    def entrada(
        cls,
        *,
        producto,
        almacen,
        cantidad,
        usuario,
        tipo='AJUSTE_POSITIVO',
        costo_unitario=Decimal('0'),
        documento=None,
        observacion='',
        movimiento_revertido=None,
        permitir_almacen_no_activo=False,
    ):
        if tipo not in cls.TIPOS_ENTRADA:
            raise InventarioError('Tipo de entrada de inventario no valido.')

        cantidad = cls._validar_cantidad(cantidad)
        producto = cls._bloquear_producto(producto)
        almacen = cls._bloquear_almacen(
            almacen,
            permitir_no_activo=permitir_almacen_no_activo,
        )
        cls._validar_capacidad(almacen, cantidad)
        stock = cls._stock_bloqueado(producto, almacen, crear=True)
        stock_anterior = stock.cantidad
        stock.cantidad += cantidad
        stock.save(update_fields=['cantidad', 'ultima_actualizacion'])

        movimiento = MovimientoInventario.objects.create(
            tipo=tipo,
            producto=producto,
            almacen_destino=almacen,
            cantidad=cantidad,
            costo_unitario=costo_unitario or Decimal('0'),
            observacion=observacion,
            creado_por=usuario,
            movimiento_revertido=movimiento_revertido,
            **cls._referencia(documento),
        )
        total = cls._sincronizar_cache(producto)
        return movimiento, stock_anterior, stock.cantidad, total

    @classmethod
    @transaction.atomic
    def validar_disponibilidad(cls, *, producto, almacen, cantidad):
        cantidad = cls._validar_cantidad(cantidad)
        producto = cls._bloquear_producto(producto)
        almacen = cls._bloquear_almacen(almacen)
        stock = cls._stock_bloqueado(producto, almacen, crear=False)
        if stock.cantidad < cantidad:
            raise InventarioError(
                f'El producto "{producto.nombre}" no tiene suficiente stock. '
                f'Disponible en {almacen.nombre}: {stock.cantidad} unidades.'
            )
        return stock.cantidad

    @classmethod
    @transaction.atomic
    def salida(
        cls,
        *,
        producto,
        almacen,
        cantidad,
        usuario,
        tipo='AJUSTE_NEGATIVO',
        costo_unitario=Decimal('0'),
        documento=None,
        observacion='',
        movimiento_revertido=None,
        permitir_almacen_no_activo=False,
    ):
        if tipo not in cls.TIPOS_SALIDA:
            raise InventarioError('Tipo de salida de inventario no valido.')

        cantidad = cls._validar_cantidad(cantidad)
        producto = cls._bloquear_producto(producto)
        almacen = cls._bloquear_almacen(
            almacen,
            permitir_no_activo=permitir_almacen_no_activo,
        )
        stock = cls._stock_bloqueado(producto, almacen, crear=False)
        if stock.cantidad < cantidad:
            raise InventarioError(
                f'El producto "{producto.nombre}" no tiene suficiente stock. '
                f'Disponible en {almacen.nombre}: {stock.cantidad} unidades.'
            )

        stock_anterior = stock.cantidad
        stock.cantidad -= cantidad
        stock.save(update_fields=['cantidad', 'ultima_actualizacion'])
        movimiento = MovimientoInventario.objects.create(
            tipo=tipo,
            producto=producto,
            almacen_origen=almacen,
            cantidad=cantidad,
            costo_unitario=costo_unitario or Decimal('0'),
            observacion=observacion,
            creado_por=usuario,
            movimiento_revertido=movimiento_revertido,
            **cls._referencia(documento),
        )
        total = cls._sincronizar_cache(producto)
        return movimiento, stock_anterior, stock.cantidad, total

    @classmethod
    @transaction.atomic
    def transferir(
        cls,
        *,
        producto,
        almacen_origen,
        almacen_destino,
        cantidad,
        usuario,
        observacion='',
    ):
        cantidad = cls._validar_cantidad(cantidad)
        producto = cls._bloquear_producto(producto)
        origen_id = cls._id(almacen_origen)
        destino_id = cls._id(almacen_destino)
        if origen_id == destino_id:
            raise InventarioError(
                'El almacen origen y destino no pueden ser el mismo.'
            )

        almacenes = {
            almacen.pk: almacen
            for almacen in Almacen.objects.select_for_update()
            .filter(pk__in=sorted([origen_id, destino_id]))
            .order_by('pk')
        }
        if len(almacenes) != 2:
            raise InventarioError('Almacen origen o destino no encontrado.')
        origen = almacenes[origen_id]
        destino = almacenes[destino_id]
        if origen.estado != 'activo' or destino.estado != 'activo':
            raise InventarioError(
                'Los almacenes de la transferencia deben estar activos.'
            )

        stocks = {
            stock.almacen_id: stock
            for stock in StockAlmacen.objects.select_for_update()
            .filter(producto=producto, almacen_id__in=[origen_id, destino_id])
            .order_by('almacen_id')
        }
        stock_origen = stocks.get(origen_id)
        if not stock_origen or stock_origen.cantidad < cantidad:
            disponible = stock_origen.cantidad if stock_origen else 0
            raise InventarioError(
                f'Stock insuficiente en almacen origen. Disponible: {disponible}.'
            )

        stock_destino = stocks.get(destino_id)
        if not stock_destino:
            stock_destino = cls._stock_bloqueado(producto, destino, crear=True)
        cls._validar_capacidad(destino, cantidad)

        traslado = Traslado.objects.create(
            almacen_origen=origen,
            almacen_destino=destino,
            estado='COMPLETADO',
            observacion=observacion,
            fecha_completado=timezone.now(),
            creado_por=usuario,
        )
        TrasladoDetalle.objects.create(
            traslado=traslado,
            producto=producto,
            cantidad=cantidad,
        )

        stock_anterior = stock_origen.cantidad
        stock_origen.cantidad -= cantidad
        stock_destino.cantidad += cantidad
        stock_origen.save(update_fields=['cantidad', 'ultima_actualizacion'])
        stock_destino.save(update_fields=['cantidad', 'ultima_actualizacion'])

        nota = observacion or (
            f'Transferencia: {origen.nombre} -> {destino.nombre}'
        )
        salida = MovimientoInventario.objects.create(
            tipo='TRASLADO_SALIDA',
            producto=producto,
            almacen_origen=origen,
            cantidad=cantidad,
            observacion=nota,
            creado_por=usuario,
            **cls._referencia(traslado),
        )
        entrada = MovimientoInventario.objects.create(
            tipo='TRASLADO_ENTRADA',
            producto=producto,
            almacen_destino=destino,
            cantidad=cantidad,
            observacion=nota,
            creado_por=usuario,
            **cls._referencia(traslado),
        )
        total = cls._sincronizar_cache(producto)
        return traslado, salida, entrada, stock_anterior, total

    @classmethod
    @transaction.atomic
    def revertir_entrada(cls, movimiento, *, usuario, motivo):
        movimiento = (
            MovimientoInventario.objects.select_for_update()
            .get(pk=cls._id(movimiento))
        )
        if movimiento.tipo != 'ENTRADA_COMPRA' or not movimiento.almacen_destino:
            raise InventarioError(
                'El movimiento no es una entrada de compra reversible.'
            )
        if MovimientoInventario.objects.filter(
            movimiento_revertido=movimiento
        ).exists():
            raise InventarioError('El movimiento ya fue revertido.')

        return cls.salida(
            producto=movimiento.producto,
            almacen=movimiento.almacen_destino,
            cantidad=movimiento.cantidad,
            usuario=usuario,
            tipo='DEVOLUCION_COMPRA',
            costo_unitario=movimiento.costo_unitario,
            documento=movimiento.compra,
            observacion=motivo,
            movimiento_revertido=movimiento,
            permitir_almacen_no_activo=True,
        )

    @classmethod
    @transaction.atomic
    def revertir_salida(cls, movimiento, *, usuario, motivo):
        movimiento = (
            MovimientoInventario.objects.select_for_update()
            .get(pk=cls._id(movimiento))
        )
        if movimiento.tipo != 'SALIDA_VENTA' or not movimiento.almacen_origen:
            raise InventarioError(
                'El movimiento no es una salida de venta reversible.'
            )
        if MovimientoInventario.objects.filter(
            movimiento_revertido=movimiento
        ).exists():
            raise InventarioError('El movimiento ya fue revertido.')

        return cls.entrada(
            producto=movimiento.producto,
            almacen=movimiento.almacen_origen,
            cantidad=movimiento.cantidad,
            usuario=usuario,
            tipo='DEVOLUCION_VENTA',
            costo_unitario=movimiento.costo_unitario,
            documento=movimiento.venta,
            observacion=motivo,
            movimiento_revertido=movimiento,
            permitir_almacen_no_activo=True,
        )

    @classmethod
    @transaction.atomic
    def reconciliar_cache(cls, producto=None):
        productos = Producto.objects.select_for_update()
        if producto is not None:
            productos = productos.filter(pk=cls._id(producto))

        resultado = {}
        for producto_obj in productos.order_by('pk'):
            resultado[producto_obj.pk] = cls._sincronizar_cache(producto_obj)
        return resultado
