from django.db import models
from django.contrib.auth.hashers import make_password


# ==============================
# TABLA: TIPOS_DOCUMENTO
# ==============================
class TipoDocumento(models.Model):
    codigo = models.CharField(max_length=5, unique=True)
    nombre = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

    class Meta:
        db_table = 'tipos_documento'
        verbose_name = 'Tipo de Documento'
        verbose_name_plural = 'Tipos de Documento'
        ordering = ['nombre']


# ==============================
# TABLA: ROLES
# ==============================
class Rol(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'roles'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['nombre']


# ==============================
# TABLA: USUARIOS
# ==============================
class Usuario(models.Model):

    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
    ]

    tipo_documento = models.ForeignKey(
        TipoDocumento,
        on_delete=models.PROTECT,
        related_name='usuarios'
    )

    numero_documento = models.CharField(max_length=20, unique=True)
    nombre_completo = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True)
    password = models.CharField(max_length=255)
    rol = models.ForeignKey(
        Rol,
        on_delete=models.PROTECT,
        related_name='usuarios'
    )
    estado = models.CharField(
        max_length=10,
        choices=ESTADO_CHOICES,
        default='activo'
    )
    fecha_creacion = models.DateField()
    observaciones = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Hashea la contraseña solo si no está encriptada
        if not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} - {self.rol.nombre}"

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-fecha_registro']
