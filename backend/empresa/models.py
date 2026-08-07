from django.core.exceptions import ValidationError
from django.db import models

from catalogos.media import safe_image_upload_path
from usuarios.models import Usuario


def company_logo_path(instance, filename):
    return safe_image_upload_path('empresa/logos', filename)


class Empresa(models.Model):
    singleton = models.BooleanField(default=True, unique=True, editable=False)
    nombre_comercial = models.CharField(max_length=150)
    razon_social = models.CharField(max_length=180, blank=True, null=True)
    nit = models.CharField(max_length=30)
    digito_verificacion = models.CharField(max_length=2, blank=True, null=True)
    logo = models.ImageField(upload_to=company_logo_path, blank=True, null=True)
    direccion = models.CharField(max_length=220)
    pais = models.CharField(max_length=100, default='Colombia')
    departamento = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100)
    telefono = models.CharField(max_length=30)
    email = models.EmailField(blank=True, null=True)
    sitio_web = models.URLField(blank=True, null=True)
    mensaje_comprobante = models.CharField(
        max_length=250,
        default='Gracias por su compra.',
    )
    moneda = models.CharField(max_length=3, default='COP')
    prefijo_ventas = models.CharField(max_length=10, blank=True, null=True)
    creado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name='configuraciones_empresa_creadas',
        blank=True,
        null=True,
    )
    actualizado_por = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        related_name='configuraciones_empresa_actualizadas',
        blank=True,
        null=True,
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.pk is None and Empresa.objects.exists():
            raise ValidationError('Solo puede existir una configuración de empresa.')

    def save(self, *args, **kwargs):
        self.singleton = True
        self.full_clean(exclude=['logo'])
        return super().save(*args, **kwargs)

    def comprobante_snapshot(self):
        return {
            'nombre_comercial': self.nombre_comercial,
            'razon_social': self.razon_social or '',
            'nit': self.nit,
            'digito_verificacion': self.digito_verificacion or '',
            'direccion': self.direccion,
            'pais': self.pais,
            'departamento': self.departamento,
            'ciudad': self.ciudad,
            'telefono': self.telefono,
            'email': self.email or '',
            'mensaje_comprobante': self.mensaje_comprobante or '',
        }

    def __str__(self):
        return self.nombre_comercial

    class Meta:
        db_table = 'configuracion_empresa'
        verbose_name = 'Configuración de la empresa'
        verbose_name_plural = 'Configuración de la empresa'
