from django.db import models
from usuarios.models import Usuario
from productos.models import Producto


# ==============================
# TABLA: ALMACENES
# ==============================
class Almacen(models.Model):

    ESTADO_CHOICES = [
        ('activo',        'Activo'),
        ('inactivo',      'Inactivo'),
        ('mantenimiento', 'En Mantenimiento'),
    ]

    nombre              = models.CharField(max_length=100, unique=True)
    codigo              = models.CharField(max_length=10, unique=True)
    direccion           = models.TextField(blank=True, null=True)
    responsable         = models.CharField(max_length=100, blank=True, null=True)
    telefono            = models.CharField(max_length=20, blank=True, null=True)
    capacidad           = models.IntegerField(blank=True, null=True)
    estado              = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='activo')
    notas               = models.TextField(blank=True, null=True)
    creado_por          = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='almacenes_creados')
    fecha_creacion      = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    class Meta:
        db_table = 'almacenes'
        verbose_name = 'Almacén'
        verbose_name_plural = 'Almacenes'
        ordering = ['nombre']


# ==============================
# TABLA: STOCK POR ALMACÉN
# ==============================
class StockAlmacen(models.Model):

    producto            = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='stocks')
    almacen             = models.ForeignKey(Almacen,  on_delete=models.PROTECT, related_name='stocks')
    cantidad            = models.IntegerField(default=0)
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.producto.nombre} | {self.almacen.nombre}: {self.cantidad}"

    class Meta:
        db_table      = 'stock_almacen'
        verbose_name  = 'Stock por Almacén'
        verbose_name_plural = 'Stocks por Almacén'
        unique_together = ('producto', 'almacen')


# ==============================
# TABLA: MOVIMIENTOS DE INVENTARIO
# ==============================
class MovimientoInventario(models.Model):

    TIPO_CHOICES = [
        ('ENTRADA_COMPRA',    'Entrada por Compra'),
        ('SALIDA_VENTA',      'Salida por Venta'),
        ('TRASLADO_ENTRADA',  'Traslado - Entrada'),
        ('TRASLADO_SALIDA',   'Traslado - Salida'),
        ('AJUSTE_POSITIVO',   'Ajuste Positivo'),
        ('AJUSTE_NEGATIVO',   'Ajuste Negativo'),
        ('DEVOLUCION_COMPRA', 'Devolución a Proveedor'),
        ('DEVOLUCION_VENTA',  'Devolución de Cliente'),
    ]

    tipo            = models.CharField(max_length=25, choices=TIPO_CHOICES)
    producto        = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='movimientos')
    almacen_origen  = models.ForeignKey(Almacen, on_delete=models.PROTECT,
                                        related_name='movimientos_salida',
                                        blank=True, null=True)
    almacen_destino = models.ForeignKey(Almacen, on_delete=models.PROTECT,
                                        related_name='movimientos_entrada',
                                        blank=True, null=True)
    cantidad        = models.IntegerField()
    costo_unitario  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    referencia_tipo = models.CharField(max_length=50, blank=True, null=True)
    referencia_id   = models.PositiveIntegerField(blank=True, null=True)
    observacion     = models.TextField(blank=True, null=True)
    fecha           = models.DateTimeField(auto_now_add=True)
    creado_por      = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='movimientos_creados')

    def __str__(self):
        return f"{self.tipo} | {self.producto.nombre} | cant: {self.cantidad}"

    class Meta:
        db_table = 'movimientos_inventario'
        verbose_name = 'Movimiento de Inventario'
        verbose_name_plural = 'Movimientos de Inventario'
        ordering = ['-fecha']


# ==============================
# TABLA: TRASLADOS
# ==============================
class Traslado(models.Model):

    ESTADO_CHOICES = [
        ('PENDIENTE',   'Pendiente'),
        ('EN_TRANSITO', 'En Tránsito'),
        ('COMPLETADO',  'Completado'),
        ('ANULADO',     'Anulado'),
    ]

    almacen_origen   = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name='traslados_salida')
    almacen_destino  = models.ForeignKey(Almacen, on_delete=models.PROTECT, related_name='traslados_entrada')
    estado           = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='PENDIENTE')
    observacion      = models.TextField(blank=True, null=True)
    fecha_solicitud  = models.DateTimeField(auto_now_add=True)
    fecha_completado = models.DateTimeField(blank=True, null=True)
    creado_por       = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='traslados_creados')

    def __str__(self):
        return f"Traslado #{self.id} | {self.almacen_origen} → {self.almacen_destino}"

    class Meta:
        db_table = 'traslados'
        verbose_name = 'Traslado'
        verbose_name_plural = 'Traslados'
        ordering = ['-fecha_solicitud']


class TrasladoDetalle(models.Model):

    traslado = models.ForeignKey(Traslado, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT)
    cantidad = models.IntegerField()

    def __str__(self):
        return f"{self.producto.nombre} x{self.cantidad}"

    class Meta:
        db_table = 'traslados_detalle'


# ==============================
# TABLA: CONFIGURACIÓN RANGOS STOCK
# ==============================
class ConfiguracionRangosStock(models.Model):

    stock_bajo          = models.IntegerField(default=5)
    stock_medio         = models.IntegerField(default=20)
    stock_alto          = models.IntegerField(default=21)
    actualizado_por     = models.ForeignKey(Usuario, on_delete=models.PROTECT,
                                            related_name='rangos_actualizados')
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Rangos: bajo={self.stock_bajo}, medio={self.stock_medio}, alto={self.stock_alto}"

    class Meta:
        db_table = 'configuracion_rangos_stock'
        verbose_name = 'Configuración de Rangos de Stock'
