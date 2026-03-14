from django.urls import path
from . import views

urlpatterns = [
    path('clientes/crear/',               views.crear_cliente,        name='crear_cliente'),
    path('clientes/listar/',              views.listar_clientes,      name='listar_clientes'),
    path('clientes/editar/<int:id>/',     views.editar_cliente,       name='editar_cliente'),
    path('clientes/estado/<int:id>/',     views.cambiar_estado_cliente, name='cambiar_estado_cliente'),
    path('clientes/eliminar/<int:id>/',   views.eliminar_cliente,     name='eliminar_cliente'),
]
