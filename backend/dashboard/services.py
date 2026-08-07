from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db.models import (
    Count, DecimalField, ExpressionWrapper, F, IntegerField, OuterRef, Q,
    Subquery, Sum, Value,
)
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone

from clientes.models import Cliente
from compras.models import Compra
from inventario.models import MovimientoInventario
from productos.models import Producto
from proveedores.models import Proveedor
from ventas.models import DetalleVenta, Venta


DINERO = DecimalField(max_digits=24, decimal_places=2)
MESES = ('ene', 'feb', 'mar', 'abr', 'may', 'jun',
         'jul', 'ago', 'sep', 'oct', 'nov', 'dic')


@dataclass(frozen=True)
class VentanaPeriodo:
    inicio: datetime
    fin: datetime
    inicio_anterior: datetime
    fin_anterior: datetime
    etiqueta_anterior: str


def _inicio_dia(fecha: date, zona: ZoneInfo) -> datetime:
    return datetime.combine(fecha, time.min, tzinfo=zona)


def _sumar_meses(fecha: date, meses: int) -> date:
    indice = fecha.year * 12 + fecha.month - 1 + meses
    anio, mes_cero = divmod(indice, 12)
    mes = mes_cero + 1
    return date(anio, mes, min(fecha.day, monthrange(anio, mes)[1]))


def _ventanas_periodo(ahora: datetime, zona: ZoneInfo) -> dict[str, VentanaPeriodo]:
    hoy = timezone.localtime(ahora, zona).date()
    inicio_hoy = _inicio_dia(hoy, zona)
    lunes = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)
    mes_anterior = _sumar_meses(inicio_mes, -1)
    inicio_anio = date(hoy.year, 1, 1)
    return {
        'hoy': VentanaPeriodo(
            inicio_hoy, _inicio_dia(hoy + timedelta(days=1), zona),
            _inicio_dia(hoy - timedelta(days=1), zona), inicio_hoy, 'ayer',
        ),
        'semana': VentanaPeriodo(
            _inicio_dia(lunes, zona), _inicio_dia(lunes + timedelta(days=7), zona),
            _inicio_dia(lunes - timedelta(days=7), zona), _inicio_dia(lunes, zona),
            'la semana anterior',
        ),
        'mes': VentanaPeriodo(
            _inicio_dia(inicio_mes, zona),
            _inicio_dia(_sumar_meses(inicio_mes, 1), zona),
            _inicio_dia(mes_anterior, zona), _inicio_dia(inicio_mes, zona),
            'el mes anterior',
        ),
        'anio': VentanaPeriodo(
            _inicio_dia(inicio_anio, zona), _inicio_dia(date(hoy.year + 1, 1, 1), zona),
            _inicio_dia(date(hoy.year - 1, 1, 1), zona), _inicio_dia(inicio_anio, zona),
            'el ano anterior',
        ),
    }


def _filtro(campo: str, inicio: datetime, fin: datetime, es_date=False) -> Q:
    if es_date:
        return Q(**{f'{campo}__gte': inicio.date(), f'{campo}__lt': fin.date()})
    return Q(**{f'{campo}__gte': inicio, f'{campo}__lt': fin})


def _numero(valor) -> float:
    return float(valor or Decimal('0'))


def _comparacion(valor: Decimal, anterior: Decimal, etiqueta: str) -> dict:
    valor = valor or Decimal('0')
    anterior = anterior or Decimal('0')
    if anterior == 0:
        return {
            'disponible': False, 'porcentaje': None, 'direccion': 'sin_datos',
            'valor_anterior': _numero(anterior),
            'texto': f'Sin datos de {etiqueta} para comparar',
        }
    porcentaje = ((valor - anterior) / abs(anterior)) * Decimal('100')
    if porcentaje > 0:
        direccion, texto = 'sube', f'{abs(porcentaje):.1f}% mas que {etiqueta}'
    elif porcentaje < 0:
        direccion, texto = 'baja', f'{abs(porcentaje):.1f}% menos que {etiqueta}'
    else:
        direccion, texto = 'igual', f'Igual que {etiqueta}'
    return {
        'disponible': True,
        'porcentaje': float(porcentaje.quantize(Decimal('0.1'))),
        'direccion': direccion,
        'valor_anterior': _numero(anterior),
        'texto': texto,
    }


def _resumen_operaciones(queryset, ventanas, *, campo_fecha, es_date) -> dict:
    campos = {}
    for clave, ventana in ventanas.items():
        actual = _filtro(campo_fecha, ventana.inicio, ventana.fin, es_date)
        anterior = _filtro(
            campo_fecha, ventana.inicio_anterior, ventana.fin_anterior, es_date
        )
        campos[f'{clave}_valor'] = Sum('total', filter=actual, default=Decimal('0'))
        campos[f'{clave}_cantidad'] = Count('id', filter=actual)
        campos[f'{clave}_anterior'] = Sum(
            'total', filter=anterior, default=Decimal('0')
        )
        campos[f'{clave}_cantidad_anterior'] = Count('id', filter=anterior)
    campos['total_valor'] = Sum('total', default=Decimal('0'))
    campos['total_cantidad'] = Count('id')
    datos = queryset.aggregate(**campos)

    periodos = {}
    for clave, ventana in ventanas.items():
        valor = datos[f'{clave}_valor'] or Decimal('0')
        anterior = datos[f'{clave}_anterior'] or Decimal('0')
        periodos[clave] = {
            'valor': _numero(valor),
            'cantidad': datos[f'{clave}_cantidad'],
            'cantidad_anterior': datos[f'{clave}_cantidad_anterior'],
            'comparacion': _comparacion(valor, anterior, ventana.etiqueta_anterior),
        }
    periodos['total'] = {
        'valor': _numero(datos['total_valor']),
        'cantidad': datos['total_cantidad'],
        'cantidad_anterior': None,
        'comparacion': {
            'disponible': False, 'porcentaje': None, 'direccion': 'acumulado',
            'valor_anterior': None, 'texto': 'Acumulado historico',
        },
    }
    return periodos


def _resumen_margen(ventas, ventanas) -> dict:
    costo_linea = ExpressionWrapper(
        F('cantidad') * F('costo_unitario'), output_field=DINERO
    )
    costo_historico = (
        MovimientoInventario.objects.filter(
            venta_id=OuterRef('pk'), tipo='SALIDA_VENTA'
        ).values('venta_id').annotate(total=Sum(costo_linea)).values('total')[:1]
    )
    ventas = ventas.annotate(
        costo_venta=Subquery(costo_historico, output_field=DINERO)
    )
    ingreso_neto = ExpressionWrapper(
        F('subtotal') - F('descuento'), output_field=DINERO
    )
    margen = ExpressionWrapper(ingreso_neto - F('costo_venta'), output_field=DINERO)

    campos = {}
    for clave, ventana in ventanas.items():
        rango = _filtro('fecha_creacion', ventana.inicio, ventana.fin)
        rango_anterior = _filtro(
            'fecha_creacion', ventana.inicio_anterior, ventana.fin_anterior
        )
        auditables = rango & Q(costo_venta__isnull=False)
        auditables_anteriores = rango_anterior & Q(costo_venta__isnull=False)
        campos[f'{clave}_valor'] = Sum(
            margen, filter=auditables, default=Decimal('0')
        )
        campos[f'{clave}_ingreso'] = Sum(
            ingreso_neto, filter=auditables, default=Decimal('0')
        )
        campos[f'{clave}_costo'] = Sum(
            'costo_venta', filter=auditables, default=Decimal('0')
        )
        campos[f'{clave}_cantidad'] = Count('id', filter=auditables)
        campos[f'{clave}_sin_costo'] = Count(
            'id', filter=rango & Q(costo_venta__isnull=True)
        )
        campos[f'{clave}_anterior'] = Sum(
            margen, filter=auditables_anteriores, default=Decimal('0')
        )
    datos = ventas.aggregate(**campos)
    return {
        clave: {
            'valor': _numero(datos[f'{clave}_valor']),
            'ingreso_neto_sin_iva': _numero(datos[f'{clave}_ingreso']),
            'costo_ventas': _numero(datos[f'{clave}_costo']),
            'cantidad': datos[f'{clave}_cantidad'],
            'operaciones_sin_costo': datos[f'{clave}_sin_costo'],
            'comparacion': _comparacion(
                datos[f'{clave}_valor'], datos[f'{clave}_anterior'],
                ventana.etiqueta_anterior,
            ),
        }
        for clave, ventana in ventanas.items()
    }


def _mapa_diario(queryset, campo: str, zona: ZoneInfo, es_date=False) -> dict:
    if es_date:
        filas = queryset.values(fecha=F(campo)).annotate(
            valor=Sum('total'), cantidad=Count('id')
        ).order_by('fecha')
    else:
        filas = queryset.annotate(
            fecha=TruncDate(campo, tzinfo=zona)
        ).values('fecha').annotate(
            valor=Sum('total'), cantidad=Count('id')
        ).order_by('fecha')
    return {
        fila['fecha']: {'valor': _numero(fila['valor']), 'cantidad': fila['cantidad']}
        for fila in filas
    }


def _serie_diaria(inicio: date, fin: date, ventas: dict, compras: dict) -> dict:
    fechas, cursor = [], inicio
    while cursor <= fin:
        fechas.append(cursor)
        cursor += timedelta(days=1)
    return {
        'labels': [f'{dia.day:02d} {MESES[dia.month - 1]}' for dia in fechas],
        'ventas': [ventas.get(dia, {}).get('valor', 0) for dia in fechas],
        'compras': [compras.get(dia, {}).get('valor', 0) for dia in fechas],
        'cantidad_ventas': [ventas.get(dia, {}).get('cantidad', 0) for dia in fechas],
        'cantidad_compras': [compras.get(dia, {}).get('cantidad', 0) for dia in fechas],
    }


def _graficas_operaciones(ventas, compras, ahora, zona) -> dict:
    hoy = timezone.localtime(ahora, zona).date()
    inicio_anio = date(hoy.year, 1, 1)
    inicio = min(inicio_anio, hoy - timedelta(days=6))
    fin = hoy + timedelta(days=1)
    ventas_diarias = _mapa_diario(
        ventas.filter(
            fecha_creacion__gte=_inicio_dia(inicio, zona),
            fecha_creacion__lt=_inicio_dia(fin, zona),
        ), 'fecha_creacion', zona,
    )
    compras_diarias = _mapa_diario(
        compras.filter(fecha_compra__gte=inicio, fecha_compra__lt=fin),
        'fecha_compra', zona, es_date=True,
    )
    siete_dias = _serie_diaria(
        hoy - timedelta(days=6), hoy, ventas_diarias, compras_diarias
    )
    mes = _serie_diaria(hoy.replace(day=1), hoy, ventas_diarias, compras_diarias)
    anio = {
        'labels': [MESES[num - 1].capitalize() for num in range(1, hoy.month + 1)],
        'ventas': [], 'compras': [], 'cantidad_ventas': [], 'cantidad_compras': [],
    }
    for numero_mes in range(1, hoy.month + 1):
        ventas_mes = [d for f, d in ventas_diarias.items()
                      if f.year == hoy.year and f.month == numero_mes]
        compras_mes = [d for f, d in compras_diarias.items()
                       if f.year == hoy.year and f.month == numero_mes]
        anio['ventas'].append(sum(d['valor'] for d in ventas_mes))
        anio['compras'].append(sum(d['valor'] for d in compras_mes))
        anio['cantidad_ventas'].append(sum(d['cantidad'] for d in ventas_mes))
        anio['cantidad_compras'].append(sum(d['cantidad'] for d in compras_mes))
    return {'siete_dias': siete_dias, 'mes': mes, 'anio': anio}


def _ventas_seis_meses(ventas, ahora, zona) -> list[dict]:
    hoy = timezone.localtime(ahora, zona).date()
    mes_actual = hoy.replace(day=1)
    meses = [_sumar_meses(mes_actual, n) for n in range(-5, 1)]
    filas = ventas.filter(
        fecha_creacion__gte=_inicio_dia(meses[0], zona),
        fecha_creacion__lt=_inicio_dia(_sumar_meses(mes_actual, 1), zona),
    ).annotate(
        periodo=TruncMonth('fecha_creacion', tzinfo=zona)
    ).values('periodo').annotate(total=Sum('total'), cantidad=Count('id'))
    por_mes = {(f['periodo'].year, f['periodo'].month): f for f in filas}
    return [{
        'mes': f'{MESES[mes.month - 1].capitalize()} {mes.year}',
        'total': _numero(por_mes.get((mes.year, mes.month), {}).get('total')),
        'cantidad': por_mes.get((mes.year, mes.month), {}).get('cantidad', 0),
    } for mes in meses]


def construir_dashboard(ahora: datetime | None = None) -> dict:
    ahora = ahora or timezone.now()
    zona = ZoneInfo(settings.TIME_ZONE)
    ventanas = _ventanas_periodo(ahora, zona)
    ventas = Venta.objects.filter(estado='completada')
    compras = Compra.objects.filter(estado='completada')
    ventas_periodos = _resumen_operaciones(
        ventas, ventanas, campo_fecha='fecha_creacion', es_date=False
    )
    compras_periodos = _resumen_operaciones(
        compras, ventanas, campo_fecha='fecha_compra', es_date=True
    )
    margen_periodos = _resumen_margen(ventas, ventanas)

    productos = Producto.objects.filter(estado='activo').annotate(
        stock_actual=Coalesce(
            Sum('stocks__cantidad'), Value(0), output_field=IntegerField()
        )
    )
    total_productos = productos.count()
    productos_en_stock = productos.filter(stock_actual__gt=0).count()
    stock_bajo = productos.filter(
        stock_actual__gt=0, stock_minimo__gt=0,
        stock_actual__lte=F('stock_minimo'),
    ).count()
    total_clientes = Cliente.objects.filter(estado='activo').count()
    total_proveedores = Proveedor.objects.filter(estado__iexact='activo').count()
    estado_stock = {
        'agotados': productos.filter(stock_actual=0).count(),
        'stock_bajo': stock_bajo,
        'stock_normal': productos.filter(stock_actual__gt=F('stock_minimo')).count(),
    }

    metodos_pago = [{
        'metodo': f['metodo_pago'].capitalize(), 'total': _numero(f['total']),
        'cantidad': f['cantidad'],
    } for f in ventas.values('metodo_pago').annotate(
        total=Sum('total'), cantidad=Count('id')
    ).order_by('-total')]
    top_vendedores = [{
        'nombre': f['vendedor__nombre_completo'], 'total': _numero(f['total']),
        'ventas': f['ventas'],
    } for f in ventas.values(
        'vendedor__id', 'vendedor__nombre_completo'
    ).annotate(total=Sum('total'), ventas=Count('id')).order_by('-total')[:5]]

    ventas_mes = ventas.filter(
        fecha_creacion__gte=ventanas['mes'].inicio,
        fecha_creacion__lt=ventanas['mes'].fin,
    )
    mejor = ventas_mes.values('vendedor__nombre_completo').annotate(
        total=Sum('total'), ventas=Count('id')
    ).order_by('-total').first()
    mejor_vendedor = None if not mejor else {
        'nombre': mejor['vendedor__nombre_completo'],
        'total': _numero(mejor['total']), 'ventas': mejor['ventas'],
    }
    alertas = [{
        'id': f['id'], 'nombre': f['nombre'], 'sku': f['sku'],
        'stock': f['stock_actual'], 'stock_minimo': f['stock_minimo'],
    } for f in productos.filter(
        stock_actual__lte=F('stock_minimo')
    ).values(
        'id', 'nombre', 'sku', 'stock_actual', 'stock_minimo'
    ).order_by('stock_actual')[:8]]

    recientes = []
    for venta in ventas.select_related('cliente', 'vendedor').order_by('-fecha_creacion')[:5]:
        nombre_cliente = 'Cliente General'
        if venta.cliente:
            if venta.cliente.tipo_cliente == 'natural':
                nombre_cliente = ' '.join(
                    p for p in (venta.cliente.nombres, venta.cliente.apellidos) if p
                ) or 'Cliente sin nombre'
            else:
                nombre_cliente = (venta.cliente.razon_social
                                  or venta.cliente.nombre_comercial
                                  or 'Cliente sin nombre')
        recientes.append({
            'id': venta.id, 'numero_venta': venta.numero_venta,
            'cliente': nombre_cliente, 'vendedor': venta.vendedor.nombre_completo,
            'total': _numero(venta.total), 'metodo_pago': venta.metodo_pago,
            'fecha_creacion': timezone.localtime(venta.fecha_creacion, zona).isoformat(),
        })
    top_productos = [{
        'nombre': f['nombre_producto'], 'sku': f['sku_producto'],
        'total_vendido': f['total_vendido'],
        'total_ingresos': _numero(f['total_ingresos']),
    } for f in DetalleVenta.objects.filter(
        venta__estado='completada'
    ).values(
        'producto__id', 'nombre_producto', 'sku_producto'
    ).annotate(
        total_vendido=Sum('cantidad'), total_ingresos=Sum('subtotal')
    ).order_by('-total_vendido')[:5]]

    return {
        'version': 2,
        'metricas': {
            'total_productos': total_productos,
            'productos_en_stock': productos_en_stock,
            'total_ventas': ventas_periodos['total']['cantidad'],
            'ventas_mes': ventas_periodos['mes']['valor'],
            'ventas_dia': ventas_periodos['hoy']['valor'],
            'total_clientes': total_clientes,
            'total_proveedores': total_proveedores,
            'stock_bajo': stock_bajo,
            'compras_mes': compras_periodos['mes']['valor'],
            'margen_mes': margen_periodos['mes']['valor'],
        },
        'periodos': {
            'ventas': ventas_periodos,
            'compras': compras_periodos,
            'margen': margen_periodos,
        },
        'graficas': {'operaciones': _graficas_operaciones(
            ventas, compras, ahora, zona
        )},
        'ventas_por_mes': _ventas_seis_meses(ventas, ahora, zona),
        'metodos_pago': metodos_pago,
        'estado_stock': estado_stock,
        'top_vendedores': top_vendedores,
        'mejor_vendedor_mes': mejor_vendedor,
        'alertas_stock': alertas,
        'ventas_recientes': recientes,
        'top_productos': top_productos,
        'reglas_calculo': {
            'zona_horaria': settings.TIME_ZONE,
            'inicio_semana': 'lunes',
            'ventas': 'Suma de Venta.total con estado completada.',
            'compras': 'Suma de Compra.total con estado completada, por fecha_compra.',
            'margen': (
                'Suma de (Venta.subtotal - Venta.descuento) menos '
                'SALIDA_VENTA.cantidad * SALIDA_VENTA.costo_unitario. '
                'El IVA no se considera ingreso ni costo.'
            ),
            'excluidos': {
                'ventas': ['anulada'],
                'compras': ['pendiente', 'anulada'],
                'margen': [
                    'ventas anuladas',
                    'ventas sin movimiento SALIDA_VENTA auditable',
                ],
            },
        },
    }
