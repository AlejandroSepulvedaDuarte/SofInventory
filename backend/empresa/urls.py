from django.urls import path

from .views import configuracion_empresa


urlpatterns = [
    path('empresa/', configuracion_empresa, name='configuracion_empresa'),
]
