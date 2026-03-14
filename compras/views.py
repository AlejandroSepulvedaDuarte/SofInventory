from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Compra, DetalleCompra
from .serializers import CompraSerializer
from productos.models import Producto, Categoria
from usuarios.models import Usuario


def generar_sku(nombre, marca, referencia):
    """Genera un SKU único basado en nombre, marca y referencia."""
    sku = f"{nombre}-{marca}-{referencia}".upper().replace(" ", "-")
    return sku


# ── REGISTRAR COMPRA ───────────────────────────────────────
@api_view(['POST'])
def registrar_compra(request):
    data = request.data

    # Validar que venga al menos un producto
    productos_data = data.get('productos', [])
    if not productos_data:
        return Response({'error': 'Debe agregar al menos un producto.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():

            # 1 — Crear la compra
            compra = Compra.objects.create(
                proveedor_id    = data['proveedor_id'],
                numero_factura  = data['numero_factura'],
                fecha_compra    = data['fecha_compra'],
                tipo_compra     = data['tipo_compra'],
                subtotal        = data['subtotal'],
                iva_total       = data['iva_total'],
                total           = data['total'],
                registrado_por_id = data['registrado_por_id'],
            )

            # 2 — Procesar cada producto
            for item in productos_data:
                nombre     = item['nombre'].strip()
                marca      = item['marca'].strip()
                referencia = item['referencia'].strip()
                sku        = generar_sku(nombre, marca, referencia)
                categoria  = Categoria.objects.get(id=item['categoria_id'])
                usuario    = Usuario.objects.get(id=data['registrado_por_id'])

                # 3 — Buscar si el producto ya existe por SKU
                producto, creado = Producto.objects.get_or_create(
                    sku=sku,
                    defaults={
                        'nombre':        nombre,
                        'marca':         marca,
                        'referencia':    referencia,
                        'unidad_medida': item['unidad_medida'],
                        'categoria':     categoria,
                        'precio_compra': item['costo_unitario'],
                        'stock':         0,
                        'estado':        'pendiente',
                        'creado_por':    usuario,
                    }
                )

                # 4 — Actualizar stock siempre
                producto.stock         += int(item['cantidad'])
                producto.precio_compra  = item['costo_unitario']
                if not creado:
                    # Si ya existía y estaba pendiente, lo dejamos pendiente
                    # Si ya estaba activo, lo dejamos activo
                    pass
                producto.save()

                # 5 — Calcular subtotal y total del detalle
                subtotal = float(item['cantidad']) * float(item['costo_unitario'])
                iva_calc = subtotal * (float(item['iva']) / 100)
                total    = subtotal + iva_calc

                # 6 — Crear detalle de compra
                DetalleCompra.objects.create(
                    compra         = compra,
                    producto       = producto,
                    cantidad       = item['cantidad'],
                    costo_unitario = item['costo_unitario'],
                    iva_porcentaje = item['iva'],
                    subtotal       = subtotal,
                    total          = total,
                )

            return Response({
                'mensaje': '✅ Compra registrada correctamente.',
                'compra_id': compra.id
            }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR COMPRAS ─────────────────────────────────────────
@api_view(['GET'])
def listar_compras(request):
    compras = Compra.objects.select_related('proveedor', 'registrado_por').all()
    serializer = CompraSerializer(compras, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# ── ANULAR COMPRA ──────────────────────────────────────────
@api_view(['PATCH'])
def anular_compra(request, id):
    try:
        compra = Compra.objects.prefetch_related('detalles__producto').get(id=id)

        # Si ya está anulada, reactivar
        if compra.estado == 'anulada':
            # Reactivar — volver a sumar el stock
            # Verificar si algún producto de esta compra tiene ventas
         for detalle in compra.detalles.all():
        # Forzar lectura fresca desde la BD
          producto = Producto.objects.get(id=detalle.producto.id)
          if producto.stock < detalle.cantidad:
             return Response({
            'error': f'No se puede anular esta compra. El producto "{producto.nombre} - {producto.marca} - {producto.referencia}" ya tiene unidades vendidas.'
         }, status=status.HTTP_400_BAD_REQUEST)

        # Verificar si algún producto de esta compra tiene ventas
        for detalle in compra.detalles.all():
            producto = detalle.producto
            # Verificar si el stock actual es menor a lo que se compró
            # significa que ya se vendieron unidades
            if producto.stock < detalle.cantidad:
                return Response({
                    'error': f'No se puede anular esta compra. El producto "{producto.nombre} - {producto.marca} - {producto.referencia}" ya tiene unidades vendidas.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Si pasa la validación — anular y descontar stock
        for detalle in compra.detalles.all():
            detalle.producto.stock -= detalle.cantidad
            detalle.producto.save()

        compra.estado = 'anulada'
        compra.save()

        return Response({
            'mensaje': 'Compra anulada correctamente.',
            'estado': compra.estado
        }, status=status.HTTP_200_OK)

    except Compra.DoesNotExist:
        return Response({'error': 'Compra no encontrada'}, status=status.HTTP_404_NOT_FOUND)

# ── VER DETALLE COMPRA ─────────────────────────────────────
@api_view(['GET'])
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