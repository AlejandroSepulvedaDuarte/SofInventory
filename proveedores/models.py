from django.db import models
from usuarios.models import Usuario, TipoDocumento

class Proveedor(models.Model):

    TIPO_PROVEEDOR_CHOICES = [
        ('Bienes',    'Bienes (Productos)'),
        ('Servicios', 'Servicios'),
        ('Mixto',     'Mixto'),
    ]

    ESTADO_CHOICES = [
        ('Activo',   'Activo'),
        ('Inactivo', 'Inactivo'),
    ]

    tipo_documento   = models.ForeignKey(TipoDocumento, on_delete=models.PROTECT, related_name='proveedores')
    numero_documento = models.CharField(max_length=20, unique=True)
    razon_social     = models.CharField(max_length=150)
    nombre_contacto  = models.CharField(max_length=100)
    cargo_contacto   = models.CharField(max_length=100, blank=True, null=True)
    email            = models.EmailField(unique=True)
    telefono         = models.CharField(max_length=20)
    direccion        = models.CharField(max_length=200)
    pais             = models.CharField(max_length=100)
    departamento     = models.CharField(max_length=100)
    ciudad           = models.CharField(max_length=100)
    tipo_proveedor   = models.CharField(max_length=10, choices=TIPO_PROVEEDOR_CHOICES)
    estado           = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='Activo')
    observaciones    = models.TextField(blank=True, null=True)
    creado_por       = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='proveedores_creados')
    fecha_registro   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.razon_social} - {self.numero_documento}"

    class Meta:
        db_table = 'proveedores'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['razon_social']