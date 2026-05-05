from django.urls import path
from . import views

urlpatterns = [
    path('proveedores/crear/',               views.crear_proveedor,         name='crear_proveedor'),
    path('proveedores/listar/',              views.listar_proveedores,      name='listar_proveedores'),
    path('proveedores/eliminar/<int:id>/',   views.eliminar_proveedor,      name='eliminar_proveedor'),
    path('proveedores/editar/<int:id>/',     views.editar_proveedor,        name='editar_proveedor'),
    path('proveedores/estado/<int:id>/',     views.cambiar_estado_proveedor, name='cambiar_estado_proveedor'),
]