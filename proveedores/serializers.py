from rest_framework import serializers
from .models import Proveedor


class ProveedorSerializer(serializers.ModelSerializer):
    creado_por_nombre    = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.nombre', read_only=True)

    class Meta:
        model = Proveedor
        fields = '__all__'