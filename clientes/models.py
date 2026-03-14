from django.db import models
from usuarios.models import Usuario, TipoDocumento


class Cliente(models.Model):

    TIPO_CLIENTE_CHOICES = [
        ('natural',  'Persona Natural'),
        ('juridica', 'Persona Jurídica'),
    ]

    CATEGORIA_CHOICES = [
        ('general',     'General'),
        ('minorista',   'Minorista'),
        ('mayorista',   'Mayorista'),
        ('corporativo', 'Corporativo'),
    ]

    ESTADO_CHOICES = [
        ('activo',    'Activo'),
        ('inactivo',  'Inactivo'),
        ('bloqueado', 'Bloqueado'),
    ]

    # Tipo de cliente
    tipo_cliente     = models.CharField(max_length=10, choices=TIPO_CLIENTE_CHOICES)
    categoria        = models.CharField(max_length=15, choices=CATEGORIA_CHOICES, default='general')

    # Documento — reutilizamos la tabla tipo_documento que ya existe
    tipo_documento   = models.ForeignKey(TipoDocumento, on_delete=models.PROTECT)
    numero_documento = models.CharField(max_length=20, unique=True)

    # Datos persona natural
    nombres          = models.CharField(max_length=100, blank=True, null=True)
    apellidos        = models.CharField(max_length=100, blank=True, null=True)

    # Datos persona jurídica
    razon_social     = models.CharField(max_length=150, blank=True, null=True)
    nombre_comercial = models.CharField(max_length=150, blank=True, null=True)

    # Contacto
    email            = models.EmailField(blank=True, null=True)
    telefono         = models.CharField(max_length=20, blank=True, null=True)
    telefono2        = models.CharField(max_length=20, blank=True, null=True)

    # Ubicación
    direccion        = models.TextField(blank=True, null=True)
    ciudad           = models.CharField(max_length=100, blank=True, null=True)
    departamento     = models.CharField(max_length=100, blank=True, null=True)
    pais             = models.CharField(max_length=100, default='Colombia')
    codigo_postal    = models.CharField(max_length=20, blank=True, null=True)

    # Estado y notas
    estado           = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='activo')
    notas            = models.TextField(blank=True, null=True)

    # Auditoría
    creado_por       = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name='clientes_creados')
    fecha_creacion   = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.tipo_cliente == 'natural':
            return f"{self.nombres} {self.apellidos} - {self.numero_documento}"
        return f"{self.razon_social} - {self.numero_documento}"

    class Meta:
        db_table = 'clientes'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['fecha_creacion']
