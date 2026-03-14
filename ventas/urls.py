from django.urls import path
from . import views

urlpatterns = [
    path('ventas/crear/',              views.crear_venta,   name='crear_venta'),
    path('ventas/listar/',             views.listar_ventas, name='listar_ventas'),
    path('ventas/detalle/<int:pk>/',   views.detalle_venta, name='detalle_venta'),
    path('ventas/anular/<int:pk>/',    views.anular_venta,  name='anular_venta'),
]