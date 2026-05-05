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
    registrado_por   = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='compras_registradas')
    fecha_registro   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Compra {self.numero_factura} - {self.proveedor.razon_social}"

    class Meta:
        db_table = 'compras'
        verbose_name = 'Compra'
        verbose_name_plural = 'Compras'
        ordering = ['-fecha_registro']


# ==============================
# TABLA: DETALLE COMPRA
# ==============================
class DetalleCompra(models.Model):

    compra           = models.ForeignKey(Compra, on_delete=models.CASCADE, related_name='detalles')
    producto         = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='detalles_compra')
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
