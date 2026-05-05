from django.db import models
from clientes.models import Cliente
from productos.models import Producto
from usuarios.models import Usuario


# ======================================================
# TABLA: VENTAS (cabecera)
# ======================================================
class Venta(models.Model):

    TIPO_IVA_CHOICES = [
        ('automatico', 'Automático 19%'),
        ('manual',     'Manual'),
    ]

    METODO_PAGO_CHOICES = [
        ('efectivo',      'Efectivo'),
        ('debito',        'Tarjeta Débito'),
        ('credito',       'Tarjeta Crédito'),
        ('transferencia', 'Transferencia'),
        ('nequi',         'Nequi'),
        ('daviplata',     'DaviPlata'),
        ('otro',          'Otro'),
    ]

    ESTADO_CHOICES = [
        ('completada', 'Completada'),
        ('anulada',    'Anulada'),
    ]

    # Identificación
    numero_venta     = models.CharField(max_length=20, unique=True, editable=False)

    # Relaciones
    cliente          = models.ForeignKey(
                            Cliente, on_delete=models.PROTECT,
                            null=True, blank=True,
                            related_name='ventas',
                            help_text='Null = Cliente General'
                        )
    vendedor         = models.ForeignKey(
                            Usuario, on_delete=models.PROTECT,
                            related_name='ventas_realizadas'
                        )

    # Totales
    subtotal         = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    descuento        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    tipo_iva         = models.CharField(max_length=10, choices=TIPO_IVA_CHOICES, default='automatico')
    iva_porcentaje   = models.DecimalField(max_digits=5,  decimal_places=2, default=19)
    iva_monto        = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total            = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Pago
    metodo_pago      = models.CharField(max_length=15, choices=METODO_PAGO_CHOICES)

    # Campos específicos de efectivo
    efectivo_recibido = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    cambio            = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    # Campos específicos de tarjeta
    numero_tarjeta    = models.CharField(max_length=4,   null=True, blank=True)
    aprobacion_tarjeta = models.CharField(max_length=50, null=True, blank=True)

    # Campos específicos de transferencia / nequi / daviplata
    comprobante_transferencia = models.CharField(max_length=100, null=True, blank=True)

    # Otro método
    otro_metodo       = models.CharField(max_length=100, null=True, blank=True)

    # Info adicional
    observaciones     = models.TextField(null=True, blank=True)
    estado            = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='completada')

    # Preparado para facturación electrónica DIAN (futuro)
    # cufe            = models.CharField(max_length=200, null=True, blank=True)
    # xml_dian        = models.TextField(null=True, blank=True)
    # enviado_dian    = models.BooleanField(default=False)
    # numero_factura_dian = models.CharField(max_length=20, null=True, blank=True)

    # Auditoría
    fecha_creacion    = models.DateTimeField(auto_now_add=True)
    fecha_anulacion   = models.DateTimeField(null=True, blank=True)
    anulado_por       = models.ForeignKey(
                            Usuario, on_delete=models.PROTECT,
                            null=True, blank=True,
                            related_name='ventas_anuladas'
                        )
    motivo_anulacion  = models.TextField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Generar número de venta automático: VTA-00001
        if not self.numero_venta:
            ultimo = Venta.objects.order_by('-id').first()
            siguiente = (ultimo.id + 1) if ultimo else 1
            self.numero_venta = f'VTA-{siguiente:05d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero_venta} - {self.total} - {self.estado}"

    class Meta:
        db_table        = 'ventas'
        verbose_name    = 'Venta'
        verbose_name_plural = 'Ventas'
        ordering        = ['-fecha_creacion']


# ======================================================
# TABLA: DETALLE DE VENTA (líneas del carrito)
# ======================================================
class DetalleVenta(models.Model):

    venta            = models.ForeignKey(
                            Venta, on_delete=models.CASCADE,
                            related_name='detalles'
                        )
    producto         = models.ForeignKey(
                            Producto, on_delete=models.PROTECT,
                            related_name='detalles_venta'
                        )

    # Se guarda el precio AL MOMENTO de la venta (no el precio actual)
    precio_unitario  = models.DecimalField(max_digits=12, decimal_places=2)
    cantidad         = models.IntegerField()
    subtotal         = models.DecimalField(max_digits=14, decimal_places=2)

    # Snapshot del nombre por si el producto cambia después
    nombre_producto  = models.CharField(max_length=150)
    sku_producto     = models.CharField(max_length=200)

    def save(self, *args, **kwargs):
        self.subtotal = self.precio_unitario * self.cantidad
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.venta.numero_venta} - {self.nombre_producto} x{self.cantidad}"

    class Meta:
        db_table     = 'detalle_ventas'
        verbose_name = 'Detalle de Venta'
        verbose_name_plural = 'Detalles de Venta'