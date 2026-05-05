from rest_framework import serializers
from .models import Proveedor


class ProveedorSerializer(serializers.ModelSerializer):
    creado_por_nombre    = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.nombre', read_only=True)

    class Meta:
        model = Proveedor
        fields = '__all__'

    def validate_razon_social(self, value):
        value = value.strip()
        queryset = Proveedor.objects.filter(razon_social__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un proveedor con esa razon social.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        queryset = Proveedor.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un proveedor con ese correo electronico.')
        return value

    def validate_numero_documento(self, value):
        return value.strip()

    def validate_nombre_contacto(self, value):
        return value.strip()
