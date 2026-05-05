
from django.urls import path
from . import views

urlpatterns = [
    # Almacenes
    path('almacenes/listar/',            views.listar_almacenes,        name='listar_almacenes'),
    path('almacenes/crear/',             views.crear_almacen,           name='crear_almacen'),
    path('almacenes/detalle/<int:pk>/',  views.detalle_almacen,         name='detalle_almacen'),
    path('almacenes/editar/<int:pk>/',   views.editar_almacen,          name='editar_almacen'),
    path('almacenes/eliminar/<int:pk>/', views.eliminar_almacen,        name='eliminar_almacen'),

    # Inventario / Stock
    path('stock/listar/',                views.listar_inventario,       name='listar_inventario'),
    path('stock/estadisticas/',          views.estadisticas_inventario, name='estadisticas_inventario'),
    path('stock/alertas/',               views.alertas_stock,           name='alertas_stock'),
    path('stock/movimiento/',            views.movimiento_rapido,       name='movimiento_rapido'),
    path('stock/por-almacen/',           views.stock_por_almacen,       name='stock_por_almacen'),
    path('stock/exportar/',              views.exportar_inventario_csv, name='exportar_inventario_csv'),
]