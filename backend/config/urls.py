"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
    path('api/', include('productos.urls')),
    path('api/', include('proveedores.urls')),
    path('api/', include('compras.urls')),
    path('api/', include('clientes.urls')),
    path('api/inventario/', include('inventario.urls')),
    path('api/', include('ventas.urls')),
    path('api/', include('dashboard.urls')),
]

if settings.FRONTEND_DIR:
    from config.views import frontend_spa
    urlpatterns += [
        re_path(r'^(?!(?:api|admin)/)(?P<path>.*)$', frontend_spa),
    ]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)