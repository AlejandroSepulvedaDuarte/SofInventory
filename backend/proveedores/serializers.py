from rest_framework import serializers
from .models import Proveedor


class ProveedorSerializer(serializers.ModelSerializer):
    creado_por_nombre    = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.nombre', read_only=True)

    class Meta:
        model = Proveedor
        fields = '__all__'
        extra_kwargs = {
            'creado_por': {'read_only': True},
            'numero_documento': {
                'error_messages': {
                    'unique': 'El número de documento ya se encuentra registrado.'
                }
            },
            'email': {
                'error_messages': {
                    'unique': 'El correo electrónico ya se encuentra registrado.'
                }
            }
        }

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
        value = value.strip()
        # Debe contener solo dígitos
        if not value.isdigit():
            raise serializers.ValidationError('El número de documento debe contener solo dígitos.')
        # Máximo 10 dígitos
        if len(value) > 10:
            raise serializers.ValidationError('El número de documento debe tener máximo 10 dígitos.')
        # Unicidad (ignorando la instancia actual en edición)
        queryset = Proveedor.objects.filter(numero_documento__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El número de documento ya se encuentra registrado.')
        return value

    def validate_nombre_contacto(self, value):
        return value.strip()

    def validate_telefono(self, value):
        value = value.strip()
        if not value.isdigit():
            raise serializers.ValidationError('El teléfono debe contener solo números.')
        # opcional: longitud máxima coherente con modelo
        if len(value) > 20:
            raise serializers.ValidationError('El teléfono debe tener máximo 20 dígitos.')
        return value
