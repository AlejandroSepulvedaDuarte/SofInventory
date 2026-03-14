from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/login/',                     views.login,                  name='login'),
    # Usuarios
    path('usuarios/crear/',                 views.crear_usuario,          name='crear_usuario'),
    path('usuarios/listar/',                views.listar_usuarios,        name='listar_usuarios'),
    path('usuarios/editar/<int:id>/',       views.editar_usuario,         name='editar_usuario'),
    path('usuarios/eliminar/<int:id>/',     views.eliminar_usuario,       name='eliminar_usuario'),
    path('usuarios/estado/<int:id>/',       views.cambiar_estado,         name='cambiar_estado'),
    # Catálogos
    path('roles/listar/',                   views.listar_roles,           name='listar_roles'),
    path('tipos-documento/listar/',         views.listar_tipos_documento, name='listar_tipos_documento'),
    path('roles/reporte/', views.reporte_roles, name='reporte_roles'),
    
]