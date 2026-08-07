from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from usuarios.validators import (
    document_type_code,
    validate_commercial_name,
    validate_document_number,
    validate_job_title,
    validate_person_or_place,
)
from catalogos.locations import validate_location
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
                'validators': [
                    UniqueValidator(
                        queryset=Proveedor.objects.all(),
                        message='El número de documento ya se encuentra registrado.',
                    )
                ],
                'error_messages': {
                    'required': 'El número de documento es obligatorio.',
                    'blank': 'El número de documento no puede estar vacío.',
                    'unique': 'El número de documento ya se encuentra registrado.'
                }
            },
            'razon_social': {
                'error_messages': {
                    'required': 'La razón social es obligatoria.',
                    'blank': 'La razón social no puede estar formada solamente por espacios.',
                }
            },
            'nombre_contacto': {
                'error_messages': {
                    'required': 'El nombre de contacto es obligatorio.',
                    'blank': 'El nombre de contacto no puede estar formado solamente por espacios.',
                }
            },
            'pais': {
                'error_messages': {
                    'required': 'El país es obligatorio.',
                    'blank': 'El país no puede estar formado solamente por espacios.',
                }
            },
            'departamento': {
                'error_messages': {
                    'required': 'El departamento es obligatorio.',
                    'blank': 'El departamento no puede estar formado solamente por espacios.',
                }
            },
            'ciudad': {
                'error_messages': {
                    'required': 'La ciudad es obligatoria.',
                    'blank': 'La ciudad no puede estar formada solamente por espacios.',
                }
            },
            'email': {
                'validators': [
                    UniqueValidator(
                        queryset=Proveedor.objects.all(),
                        message='El correo electrónico ya se encuentra registrado.',
                    )
                ],
                'error_messages': {
                    'unique': 'El correo electrónico ya se encuentra registrado.',
                    'required': 'El correo electrónico es obligatorio.',
                    'blank': 'El correo electrónico no puede estar vacío.',
                    'invalid': 'El formato del correo electrónico no es válido.',
                }
            },
            'telefono': {
                'error_messages': {
                    'required': 'El teléfono es obligatorio.',
                    'blank': 'El teléfono no puede estar vacío.',
                    'max_length': 'El teléfono debe tener máximo 20 dígitos.',
                }
            },
        }

    def validate_razon_social(self, value):
        value = validate_commercial_name(
            value,
            empty_message='La razón social es obligatoria.',
            letter_message='La razón social debe contener al menos una letra.',
        )
        queryset = Proveedor.objects.filter(razon_social__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un proveedor con esa razón social.')
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        queryset = Proveedor.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un proveedor con ese correo electrónico.')
        return value

    def validate_numero_documento(self, value):
        value = validate_document_number(value, document_type_code(self))
        # Unicidad (ignorando la instancia actual en edición)
        queryset = Proveedor.objects.filter(numero_documento__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El número de documento ya se encuentra registrado.')
        return value

    def validate_nombre_contacto(self, value):
        return validate_person_or_place(
            value,
            empty_message='El nombre de contacto es obligatorio.',
            number_message='El nombre de contacto no puede contener números.',
            invalid_message='El nombre de contacto solo puede contener letras, espacios, apóstrofos y guiones.',
        )

    def validate_cargo_contacto(self, value):
        if value in (None, ''):
            return value
        return validate_job_title(value)

    def validate_telefono(self, value):
        value = value.strip()
        if not value.isdigit():
            raise serializers.ValidationError('El teléfono debe contener solo números.')
        # opcional: longitud máxima coherente con modelo
        if len(value) > 20:
            raise serializers.ValidationError('El teléfono debe tener máximo 20 dígitos.')
        return value

    def validate(self, attrs):
        raw_job_title = self.initial_data.get('cargo_contacto')
        if isinstance(raw_job_title, str) and raw_job_title and not raw_job_title.strip():
            raise serializers.ValidationError({
                'cargo_contacto': 'El cargo no puede estar formado solamente por espacios.'
            })
        return validate_location(attrs, self.instance)
