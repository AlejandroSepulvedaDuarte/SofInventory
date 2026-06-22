from django.contrib import admin
from .models import Usuario, Rol, TipoDocumento, SesionAPI, IntentoFallidoLogin


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre')
    search_fields = ('codigo', 'nombre')


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('username', 'nombre_completo', 'email', 'rol', 'estado', 'cuenta_bloqueada', 'fecha_bloqueo')
    list_filter = ('estado', 'rol', 'cuenta_bloqueada', 'fecha_registro')
    search_fields = ('username', 'nombre_completo', 'email', 'numero_documento')
    readonly_fields = ('fecha_registro', 'fecha_bloqueo')
    fieldsets = (
        ('Información Personal', {
            'fields': ('tipo_documento', 'numero_documento', 'nombre_completo', 'email')
        }),
        ('Credenciales', {
            'fields': ('username', 'password')
        }),
        ('Organización', {
            'fields': ('rol', 'estado')
        }),
        ('Seguridad', {
            'fields': ('cuenta_bloqueada', 'fecha_bloqueo'),
            'description': 'La cuenta bloqueada se activa cuando hay 5 intentos fallidos de login.'
        }),
        ('Adicional', {
            'fields': ('fecha_creacion', 'observaciones', 'fecha_registro'),
            'classes': ('collapse',)
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ('tipo_documento', 'numero_documento', 'username')
        return self.readonly_fields

    actions = ['desbloquear_cuentas']

    def desbloquear_cuentas(self, request, queryset):
        updated = queryset.filter(cuenta_bloqueada=True).update(
            cuenta_bloqueada=False,
            fecha_bloqueo=None
        )
        IntentoFallidoLogin.objects.filter(usuario__in=queryset).delete()
        self.message_user(request, f'{updated} cuenta(s) desbloqueada(s) correctamente.')
    desbloquear_cuentas.short_description = 'Desbloquear cuentas seleccionadas'


@admin.register(SesionAPI)
class SesionAPIAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'creada_en', 'expira_en', 'activa', 'ultima_actividad')
    list_filter = ('activa', 'creada_en')
    search_fields = ('usuario__username', 'token')
    readonly_fields = ('token', 'creada_en', 'ultima_actividad')


@admin.register(IntentoFallidoLogin)
class IntentoFallidoLoginAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha_intento', 'ip_address')
    list_filter = ('fecha_intento', 'usuario')
    search_fields = ('usuario__username', 'ip_address')
    readonly_fields = ('usuario', 'fecha_intento', 'ip_address', 'user_agent')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    actions = ['limpiar_intentos_usuario']

    def limpiar_intentos_usuario(self, request, queryset):
        usuarios_ids = queryset.values_list('usuario_id', flat=True).distinct()
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} intento(s) fallido(s) eliminado(s).')
    limpiar_intentos_usuario.short_description = 'Limpiar intentos fallidos seleccionados'

