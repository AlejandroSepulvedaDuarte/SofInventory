from django.urls import path
from . import views

urlpatterns = [
    path('compras/registrar/',          views.registrar_compra, name='registrar_compra'),
    path('compras/listar/',             views.listar_compras,   name='listar_compras'),
    path('compras/detalle/<int:id>/',   views.detalle_compra,   name='detalle_compra'),
    path('compras/anular/<int:id>/',    views.anular_compra,    name='anular_compra'),
]