from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from ventas.models import Venta, DetalleVenta
from productos.models import Producto
from inventario.models import StockAlmacen
from clientes.models import Cliente
from proveedores.models import Proveedor
from compras.models import Compra
from usuarios.models import Usuario


# =========================================================
# ENDPOINT ÚNICO DE DASHBOARD
# Devuelve todos los datos necesarios en una sola llamada
# =========================================================
@api_view(['GET'])
def datos_dashboard(request):
    ahora       = timezone.now()
    inicio_mes  = ahora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    inicio_dia  = ahora.replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_6m   = (ahora.replace(day=1) - timedelta(days=150)).replace(
                    day=1, hour=0, minute=0, second=0, microsecond=0)

    rol_usuario = request.GET.get('rol', 'Administrador')

    # ─────────────────────────────────────────────────────
    # MÉTRICAS PRINCIPALES
    # ─────────────────────────────────────────────────────
    total_productos   = Producto.objects.filter(estado='activo').count()
    productos_en_stock = Producto.objects.filter(estado='activo', stock__gt=0).count()
    total_clientes    = Cliente.objects.filter(estado='activo').count()
    total_proveedores = Proveedor.objects.filter(estado='activo').count()

    # Stock bajo = stock > 0 y stock <= stock_minimo
    from django.db.models import F
    stock_bajo = Producto.objects.filter(
        estado='activo', stock__gt=0, stock__lte=F('stock_minimo')
    ).count()

    # Ventas
    ventas_completadas = Venta.objects.filter(estado='completada')
    total_ventas       = ventas_completadas.count()

    ventas_mes = ventas_completadas.filter(fecha_creacion__gte=inicio_mes)
    total_mes  = ventas_mes.aggregate(t=Sum('total'))['t'] or 0

    ventas_dia = ventas_completadas.filter(fecha_creacion__gte=inicio_dia)
    total_dia  = ventas_dia.aggregate(t=Sum('total'))['t'] or 0

    # Compras del mes
    compras_mes   = Compra.objects.filter(fecha_compra__gte=inicio_mes.date())
    total_compras_mes = compras_mes.aggregate(t=Sum('total'))['t'] or 0

    # Margen del mes = ventas - compras
    margen_mes = float(total_mes) - float(total_compras_mes)

    # ─────────────────────────────────────────────────────
    # VENTAS POR MES — últimos 6 meses
    # ─────────────────────────────────────────────────────
    ventas_por_mes = []
    for i in range(5, -1, -1):
        fecha_ref  = ahora.replace(day=1) - timedelta(days=i * 30)
        mes_inicio = fecha_ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i == 0:
            mes_fin = ahora
        else:
            siguiente = (mes_inicio.replace(day=28) + timedelta(days=4))
            mes_fin   = siguiente.replace(day=1)

        total_m = ventas_completadas.filter(
            fecha_creacion__gte=mes_inicio,
            fecha_creacion__lt=mes_fin
        ).aggregate(t=Sum('total'))['t'] or 0

        ventas_por_mes.append({
            'mes':      mes_inicio.strftime('%b %Y'),
            'total':    float(total_m),
            'cantidad': ventas_completadas.filter(
                            fecha_creacion__gte=mes_inicio,
                            fecha_creacion__lt=mes_fin
                        ).count()
        })

    # ─────────────────────────────────────────────────────
    # MÉTODOS DE PAGO
    # ─────────────────────────────────────────────────────
    metodos = ventas_completadas.values('metodo_pago').annotate(
        total=Sum('total'), cantidad=Count('id')
    ).order_by('-total')

    metodos_pago = [
        {
            'metodo':   m['metodo_pago'].capitalize(),
            'total':    float(m['total']),
            'cantidad': m['cantidad']
        }
        for m in metodos
    ]

    # ─────────────────────────────────────────────────────
    # ESTADO DEL STOCK
    # ─────────────────────────────────────────────────────
    from django.db.models import F as Fld
    productos_activos = Producto.objects.filter(estado='activo')
    agotados     = productos_activos.filter(stock=0).count()
    stock_bajo_n = productos_activos.filter(stock__gt=0, stock__lte=Fld('stock_minimo')).count()
    stock_normal = productos_activos.filter(stock__gt=Fld('stock_minimo')).count()

    estado_stock = {
        'agotados':     agotados,
        'stock_bajo':   stock_bajo_n,
        'stock_normal': stock_normal,
    }

    # ─────────────────────────────────────────────────────
    # TOP VENDEDORES — histórico
    # ─────────────────────────────────────────────────────
    top_vendedores_qs = ventas_completadas.values(
        'vendedor__id', 'vendedor__nombre_completo'
    ).annotate(
        total=Sum('total'),
        ventas=Count('id')
    ).order_by('-total')[:5]

    top_vendedores = [
        {
            'nombre': v['vendedor__nombre_completo'],
            'total':  float(v['total']),
            'ventas': v['ventas']
        }
        for v in top_vendedores_qs
    ]

    # ─────────────────────────────────────────────────────
    # MEJOR VENDEDOR DEL MES
    # ─────────────────────────────────────────────────────
    mejor_mes_qs = ventas_mes.values(
        'vendedor__nombre_completo'
    ).annotate(
        total=Sum('total'),
        ventas=Count('id')
    ).order_by('-total').first()

    mejor_vendedor_mes = None
    if mejor_mes_qs:
        mejor_vendedor_mes = {
            'nombre': mejor_mes_qs['vendedor__nombre_completo'],
            'total':  float(mejor_mes_qs['total']),
            'ventas': mejor_mes_qs['ventas']
        }

    # ─────────────────────────────────────────────────────
    # ALERTAS DE STOCK — productos con stock <= stock_minimo
    # ─────────────────────────────────────────────────────
    alertas_qs = Producto.objects.filter(
        estado='activo', stock__gt=0, stock__lte=Fld('stock_minimo')
    ).values('id', 'nombre', 'sku', 'stock', 'stock_minimo').order_by('stock')[:8]

    alertas_stock = list(alertas_qs)

    # ─────────────────────────────────────────────────────
    # VENTAS RECIENTES — últimas 5
    # ─────────────────────────────────────────────────────
    ventas_recientes_qs = ventas_completadas.select_related(
        'cliente', 'vendedor'
    ).order_by('-fecha_creacion')[:5]

    ventas_recientes = []
    for v in ventas_recientes_qs:
        cliente_nombre = 'Cliente General'
        if v.cliente:
            if v.cliente.tipo_persona == 'natural':
                cliente_nombre = f'{v.cliente.nombres} {v.cliente.apellidos}'
            else:
                cliente_nombre = v.cliente.razon_social

        ventas_recientes.append({
            'id':             v.id,
            'numero_venta':   v.numero_venta,
            'cliente':        cliente_nombre,
            'vendedor':       v.vendedor.nombre_completo if v.vendedor else '',
            'total':          float(v.total),
            'metodo_pago':    v.metodo_pago,
            'fecha_creacion': v.fecha_creacion.isoformat(),
        })

    # ─────────────────────────────────────────────────────
    # TOP PRODUCTOS MÁS VENDIDOS
    # ─────────────────────────────────────────────────────
    top_productos_qs = DetalleVenta.objects.filter(
        venta__estado='completada'
    ).values(
        'producto__id', 'nombre_producto', 'sku_producto'
    ).annotate(
        total_vendido=Sum('cantidad'),
        total_ingresos=Sum('subtotal')
    ).order_by('-total_vendido')[:5]

    top_productos = [
        {
            'nombre':          p['nombre_producto'],
            'sku':             p['sku_producto'],
            'total_vendido':   p['total_vendido'],
            'total_ingresos':  float(p['total_ingresos'])
        }
        for p in top_productos_qs
    ]

    # ─────────────────────────────────────────────────────
    # RESPUESTA FINAL
    # ─────────────────────────────────────────────────────
    return Response({
        'metricas': {
            'total_productos':    total_productos,
            'productos_en_stock': productos_en_stock,
            'total_ventas':       total_ventas,
            'ventas_mes':         float(total_mes),
            'ventas_dia':         float(total_dia),
            'total_clientes':     total_clientes,
            'total_proveedores':  total_proveedores,
            'stock_bajo':         stock_bajo,
            'compras_mes':        float(total_compras_mes),
            'margen_mes':         margen_mes,
        },
        'ventas_por_mes':      ventas_por_mes,
        'metodos_pago':        metodos_pago,
        'estado_stock':        estado_stock,
        'top_vendedores':      top_vendedores,
        'mejor_vendedor_mes':  mejor_vendedor_mes,
        'alertas_stock':       alertas_stock,
        'ventas_recientes':    ventas_recientes,
        'top_productos':       top_productos,
    })
