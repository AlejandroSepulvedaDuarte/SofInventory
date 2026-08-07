from django.urls import path

from . import views


urlpatterns = [
    path(
        'catalogos/ubicaciones/colombia/',
        views.colombia_catalog,
        name='catalogo_ubicaciones_colombia',
    ),
]
