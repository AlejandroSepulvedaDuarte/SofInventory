from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    tipo_documento_nombre  = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    tipo_documento_codigo  = serializers.CharField(source='tipo_documento.codigo', read_only=True)
    creado_por_nombre      = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    nombre_display         = serializers.SerializerMethodField()
    documento_display      = serializers.SerializerMethodField()

    class Meta:
        model  = Cliente
        fields = '__all__'

    def get_nombre_display(self, obj):
        if obj.tipo_cliente == 'natural':
            return f'{obj.nombres or ""} {obj.apellidos or ""}'.strip()
        return obj.razon_social or obj.nombre_comercial or ''

    def get_documento_display(self, obj):
        tipo = obj.tipo_documento.codigo if obj.tipo_documento else ''
        numero = obj.numero_documento or ''
        return f'{tipo} {numero}'.strip()
