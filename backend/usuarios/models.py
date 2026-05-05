import secrets
from datetime import timedelta

from django.db import models
from django.contrib.auth.hashers import make_password
from django.utils import timezone


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
        if not self.password.startswith('pbkdf2_'):
            self.password = make_password(self.password)
        super().save(*args, **kwargs)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return self.estado == 'activo'

    def __str__(self):
        return f"{self.username} - {self.rol.nombre}"

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-fecha_registro']


class SesionAPI(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='sesiones_api'
    )
    token = models.CharField(max_length=80, unique=True, editable=False)
    creada_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()
    ultima_actividad = models.DateTimeField(auto_now=True)
    activa = models.BooleanField(default=True)
    user_agent = models.CharField(max_length=255, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(48)
        if not self.expira_en:
            self.expira_en = timezone.now() + timedelta(hours=12)
        super().save(*args, **kwargs)

    def esta_expirada(self):
        return timezone.now() >= self.expira_en

    def renovar(self, horas=12):
        self.expira_en = timezone.now() + timedelta(hours=horas)
        self.activa = True
        self.save(update_fields=['expira_en', 'activa', 'ultima_actividad'])

    def __str__(self):
        return f'{self.usuario.username} - {self.token[:10]}...'

    class Meta:
        db_table = 'sesiones_api'
        verbose_name = 'Sesion API'
        verbose_name_plural = 'Sesiones API'
        ordering = ['-creada_en']
