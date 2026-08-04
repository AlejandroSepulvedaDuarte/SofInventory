# Arquitectura de inventario

## Fuente de verdad

`StockAlmacen.cantidad` es la fuente de verdad operativa. `Producto.stock` se
conserva como una cache de compatibilidad para la interfaz y consumidores
anteriores; solo `ServicioInventario` puede sincronizarla.

## Invariantes

- Toda cantidad de stock o movimiento es positiva o cero segun corresponda.
- Ningun `StockAlmacen` puede quedar negativo.
- Una compra completada tiene una entrada enlazada por cada producto.
- Una venta completada tiene una salida enlazada por cada producto.
- Una anulacion crea movimientos compensatorios; no elimina el historial.
- Una transferencia actualiza origen, destino, traslado y movimientos en una
  unica transaccion.
- Las filas se bloquean con `select_for_update()` antes de modificar stock.
- Los productos repetidos de una venta se consolidan antes de validar.

## Operaciones

Las views de compras, ventas e inventario delegan en
`inventario.services.ServicioInventario`:

- `entrada`
- `salida`
- `transferir`
- `revertir_entrada`
- `revertir_salida`
- `reconciliar_cache`

No se debe modificar `Producto.stock` ni `StockAlmacen.cantidad` directamente
desde nuevas views, signals o serializers.

## Auditoria

El siguiente comando es de solo lectura:

```bash
python manage.py auditar_inventario --estricto
```

La cache puede recalcularse de forma controlada con:

```bash
python manage.py auditar_inventario --corregir-cache --estricto
```

Este segundo modo no inventa movimientos ni corrige documentos incompletos;
solo sincroniza la cache desde las existencias por almacen.
