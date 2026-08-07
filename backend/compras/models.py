from django.db import models
from usuarios.models import Usuario
from proveedores.models import Proveedor
from productos.models import Producto


# ==============================
# TABLA: COMPRAS
# ==============================
class Compra(models.Model):

    TIPO_COMPRA_CHOICES = [
        ('Contado',  'Contado'),
        ('Credito',  'Crédito'),
    ]

    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente'),
        ('completada', 'Completada'),
        ('anulada',    'Anulada'),
    ]

    proveedor        = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='compras')
    numero_factura   = models.CharField(max_length=50, unique=True)
    fecha_compra     = models.DateField()
    tipo_compra      = models.CharField(max_length=10, choices=TIPO_COMPRA_CHOICES)
    subtotal         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    iva_total        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total            = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado           = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='completada')
    almacen          = models.ForeignKey(
        'inventario.Almacen',
        on_delete=models.PROTECT,
        related_name='compras',
        blank=True,
        null=True,
    )
    registrado_por   = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name='compras_registradas',
        blank=True,
        null=True,
    )
    fecha_registro   = models.DateTimeField(auto_now_add=True)
    fecha_anulacion  = models.DateTimeField(blank=True, null=True)
    anulado_por      = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name='compras_anuladas',
        blank=True,
        null=True,
    )
    motivo_anulacion = models.TextField(blank=True, null=True)
    observaciones     = models.TextField(blank=True, null=True)
    empresa_snapshot = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Compra {self.numero_factura} - {self.proveedor.razon_social}"

    class Meta:
        db_table = 'compras'
        verbose_name = 'Compra'
        verbose_name_plural = 'Compras'
        ordering = ['-fecha_registro']
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(subtotal__gte=0) &
                    models.Q(iva_total__gte=0) &
                    models.Q(total__gte=0)
                ),
                name='compras_totales_no_negativos',
            ),
        ]


# ==============================
# TABLA: DETALLE COMPRA
# ==============================
class DetalleCompra(models.Model):

    compra           = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='detalles')
    producto         = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles_compra')
    nombre_producto  = models.CharField(max_length=150, blank=True, default='')
    sku_producto     = models.CharField(max_length=200, blank=True, default='')
    cantidad         = models.IntegerField()
    costo_unitario   = models.DecimalField(max_digits=12, decimal_places=2)
    iva_porcentaje   = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    subtotal         = models.DecimalField(max_digits=12, decimal_places=2)
    total            = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.producto.nombre} x {self.cantidad}"

    class Meta:
        db_table = 'detalle_compras'
        verbose_name = 'Detalle de Compra'
        verbose_name_plural = 'Detalles de Compra'
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(cantidad__gt=0) &
                    models.Q(costo_unitario__gte=0) &
                    models.Q(iva_porcentaje__gte=0) &
                    models.Q(iva_porcentaje__lte=100) &
                    models.Q(subtotal__gte=0) &
                    models.Q(total__gte=0)
                ),
                name='compras_detalle_valores_validos',
            ),
        ]
