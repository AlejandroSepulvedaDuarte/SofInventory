from django.urls import path
from . import views

urlpatterns = [
    # Categorías
    path('categorias/crear/',             views.crear_categoria,   name='crear_categoria'),
    path('categorias/listar/',            views.listar_categorias, name='listar_categorias'),
    path('categorias/eliminar/<int:id>/', views.eliminar_categoria, name='eliminar_categoria'),
    
    # Productos
    path('productos/listar/',             views.listar_productos,   name='listar_productos'),
    path('productos/configurar/<int:id>/', views.configurar_producto, name='configurar_producto'),
    path('productos/editar/<int:id>/',    views.editar_producto,    name='editar_producto'),
    
    # 🔴 CORREGIDO: Ahora usa views.cambiar_estado_producto
    path('productos/cambiar-estado/<int:producto_id>/', views.cambiar_estado_producto, name='cambiar_estado_producto'),
]