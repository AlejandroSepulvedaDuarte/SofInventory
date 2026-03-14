from django.db import models
from usuarios.models import Usuario


# ==============================
# TABLA: CATEGORÍAS
# ==============================
class Categoria(models.Model):

    TIPO_CONTROL_CHOICES = [
        ('GENERAL',      'General'),
        ('HERRAMIENTA',  'Herramienta'),
        ('ELECTRICO',    'Eléctrico'),
        ('LIQUIDO',      'Líquido'),
        ('TORNILLERIA',  'Tornillería'),
    ]

    nombre           = models.CharField(max_length=100, unique=True)
    tipo_control     = models.CharField(max_length=20, choices=TIPO_CONTROL_CHOICES, default='GENERAL')
    descripcion      = models.TextField(blank=True, null=True)
    creado_por       = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='categorias_creadas')
    fecha_creacion   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} - {self.tipo_control}"

    class Meta:
        db_table = 'categorias'
        verbose_name = 'Categoría'
        verbose_name_plural = 'Categorías'
        ordering = ['nombre']


# ==============================
# TABLA: PRODUCTOS
# ==============================
class Producto(models.Model):

    UNIDAD_CHOICES = [
        ('Unidad',  'Unidad'),
        ('Caja',    'Caja'),
        ('Metro',   'Metro'),
        ('Litro',   'Litro'),
        ('Galon',   'Galón'),
        ('Rollo',   'Rollo'),
        ('Bulto',   'Bulto'),
        ('Kilo',    'Kilo'),
    ]

    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente por configurar'),
        ('activo',     'Activo'),
        ('inactivo',   'Inactivo'),
    ]

    # Identificación única del producto
    sku              = models.CharField(max_length=200, unique=True)
    nombre           = models.CharField(max_length=150)
    marca            = models.CharField(max_length=100)
    referencia       = models.CharField(max_length=100)
    unidad_medida    = models.CharField(max_length=10, choices=UNIDAD_CHOICES, default='Unidad')

    # Clasificación
    categoria        = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos')

    # Precios
    precio_compra    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    precio_venta     = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Stock
    stock            = models.IntegerField(default=0)
    stock_minimo     = models.IntegerField(default=0)
    descripcion      = models.TextField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    especificaciones = models.JSONField(blank=True, null=True)
    # Estado
    estado           = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='pendiente')

    # Auditoría
    creado_por       = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='productos_creados')
    fecha_creacion   = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)

    def __str__(self):
        return f"{self.nombre} - {self.marca} - {self.referencia}"

    class Meta:
        db_table = 'productos'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        ordering = ['nombre']