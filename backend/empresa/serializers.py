from django.db import transaction
from rest_framework import serializers

from catalogos.locations import validate_location
from catalogos.media import validate_uploaded_image
from usuarios.validators import normalize_semantic_text, validate_commercial_name

from .models import Empresa


class EmpresaSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    quitar_logo = serializers.BooleanField(write_only=True, required=False, default=False)
    creado_por_nombre = serializers.CharField(
        source='creado_por.nombre_completo', read_only=True, default='No disponible'
    )
    actualizado_por_nombre = serializers.CharField(
        source='actualizado_por.nombre_completo', read_only=True, default='No disponible'
    )

    class Meta:
        model = Empresa
        exclude = ['singleton']
        read_only_fields = [
            'creado_por', 'actualizado_por', 'fecha_creacion', 'fecha_actualizacion'
        ]
        extra_kwargs = {
            'nombre_comercial': {
                'error_messages': {
                    'required': 'El nombre comercial es obligatorio.',
                    'blank': 'El nombre comercial es obligatorio.',
                }
            },
            'nit': {
                'error_messages': {
                    'required': 'El NIT o identificación es obligatorio.',
                    'blank': 'El NIT o identificación es obligatorio.',
                }
            },
            'direccion': {
                'error_messages': {
                    'required': 'La dirección es obligatoria.',
                    'blank': 'La dirección es obligatoria.',
                }
            },
            'telefono': {
                'error_messages': {
                    'required': 'El teléfono es obligatorio.',
                    'blank': 'El teléfono es obligatorio.',
                }
            },
        }

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    def validate_nombre_comercial(self, value):
        return validate_commercial_name(
            value,
            empty_message='El nombre comercial es obligatorio.',
            letter_message='El nombre comercial debe contener al menos una letra.',
        )

    def validate_razon_social(self, value):
        if not value:
            return value
        return validate_commercial_name(
            value,
            empty_message='La razón social no puede estar formada solamente por espacios.',
            letter_message='La razón social debe contener al menos una letra.',
        )

    def validate_nit(self, value):
        value = normalize_semantic_text(value)
        if not value:
            raise serializers.ValidationError('El NIT o identificación es obligatorio.')
        return value

    def validate_logo(self, value):
        try:
            return validate_uploaded_image(value)
        except Exception as error:
            if hasattr(error, 'messages'):
                raise serializers.ValidationError(error.messages[0]) from error
            raise

    def validate_moneda(self, value):
        if value != 'COP':
            raise serializers.ValidationError('La moneda disponible para esta instalación es COP.')
        return value

    def validate(self, attrs):
        return validate_location(attrs, self.instance)

    def update(self, instance, validated_data):
        quitar_logo = validated_data.pop('quitar_logo', False)
        if quitar_logo and 'logo' not in validated_data:
            validated_data['logo'] = None
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data.pop('quitar_logo', None)
        return super().create(validated_data)
