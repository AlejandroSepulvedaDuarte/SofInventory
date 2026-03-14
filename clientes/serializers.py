from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    tipo_documento_nombre  = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    tipo_documento_codigo  = serializers.CharField(source='tipo_documento.codigo', read_only=True)
    creado_por_nombre      = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model  = Cliente
        fields = '__all__'