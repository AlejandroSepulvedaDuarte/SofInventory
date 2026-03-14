from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.datos_dashboard, name='datos_dashboard'),
]