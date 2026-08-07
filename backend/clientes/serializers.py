from rest_framework import serializers
from django.db.models import Q
from usuarios.validators import (
    document_type_code,
    normalize_semantic_text,
    validate_commercial_name,
    validate_document_number,
    validate_person_or_place,
)
from catalogos.locations import validate_location
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    tipo_documento_nombre  = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    tipo_documento_codigo  = serializers.CharField(source='tipo_documento.codigo', read_only=True)
    creado_por_nombre      = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    nombre_display         = serializers.SerializerMethodField()
    documento_display      = serializers.SerializerMethodField()
    numero_documento = serializers.CharField(
        validators=[],
        required=True,
        error_messages={
            'required': 'El número de documento es obligatorio.',
            'blank': 'El número de documento no puede estar vacío.',
        },
    )

    class Meta:
        model = Cliente
        fields = '__all__'
        extra_kwargs = {
            'tipo_cliente': {
                'error_messages': {
                    'required': 'El tipo de cliente es obligatorio.'
                }
            },
            'tipo_documento': {
                'error_messages': {
                    'required': 'El tipo de documento es obligatorio.'
                }
            },
            'numero_documento': {
                'error_messages': {
                    'required': 'El número de documento es obligatorio.',
                    'unique': 'El número de documento ya se encuentra registrado.'
                }
            },
            'email': {
                'error_messages': {
                    'unique': 'El correo electrónico ya se encuentra registrado.'
                }
            },
            'creado_por': {
                'read_only': True,
            },
            'pais': {
                'error_messages': {
                    'required': 'El país es obligatorio.'
                }
            },
            'estado': {
                'error_messages': {
                    'required': 'El estado es obligatorio.'
                }
            }
        }

    def get_nombre_display(self, obj):
        if obj.tipo_cliente == 'natural':
            return f'{obj.nombres or ""} {obj.apellidos or ""}'.strip()
        return obj.razon_social or obj.nombre_comercial or ''

    def get_documento_display(self, obj):
        tipo = obj.tipo_documento.codigo if obj.tipo_documento else ''
        numero = obj.numero_documento or ''
        return f'{tipo} {numero}'.strip()

    def validate_numero_documento(self, value):
        value = validate_document_number(value, document_type_code(self))
        # Unicidad (excluir instancia actual en edición)
        queryset = Cliente.objects.filter(numero_documento__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El número de documento ya se encuentra registrado.')
        return value

    def validate_nombres(self, value):
        if value in (None, ''):
            return value
        return validate_person_or_place(
            value,
            empty_message='Los nombres no pueden estar formados solamente por espacios.',
            number_message='Los nombres no pueden contener números.',
            invalid_message='Los nombres solo pueden contener letras, espacios, apóstrofos y guiones.',
        )

    def validate_apellidos(self, value):
        if value in (None, ''):
            return value
        return validate_person_or_place(
            value,
            empty_message='Los apellidos no pueden estar formados solamente por espacios.',
            number_message='Los apellidos no pueden contener números.',
            invalid_message='Los apellidos solo pueden contener letras, espacios, apóstrofos y guiones.',
        )

    def validate_telefono(self, value):
        if value in (None, ''):
            return value
        value = value.strip()
        if not value.isdigit():
            raise serializers.ValidationError('El teléfono debe contener solo números.')
        if len(value) > 15:
            raise serializers.ValidationError('El teléfono debe tener máximo 15 dígitos.')
        # Unicidad: no puede existir en telefono o telefono2 de otro cliente
        queryset = Cliente.objects.filter(Q(telefono__iexact=value) | Q(telefono2__iexact=value))
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El número de teléfono ya se encuentra registrado.')
        return value

    def validate_telefono2(self, value):
        if value in (None, ''):
            return value
        value = value.strip()
        if not value.isdigit():
            raise serializers.ValidationError('El teléfono alterno debe contener solo números.')
        if len(value) > 15:
            raise serializers.ValidationError('El teléfono alterno debe tener máximo 15 dígitos.')
        # Unicidad: no puede existir en telefono o telefono2 de otro cliente
        queryset = Cliente.objects.filter(Q(telefono__iexact=value) | Q(telefono2__iexact=value))
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El número de teléfono ya se encuentra registrado.')
        return value

    def validate_razon_social(self, value):
        if value in (None, ''):
            value = value or ''
        else:
            value = validate_commercial_name(
                value,
                empty_message='La razón social no puede estar formada solamente por espacios.',
                letter_message='La razón social debe contener al menos una letra.',
            )
        tipo = self.initial_data.get('tipo_cliente') or getattr(self.instance, 'tipo_cliente', None)
        if tipo == 'juridica' and not value:
            raise serializers.ValidationError('La razón social es obligatoria para persona jurídica.')

        if tipo == 'juridica' and value:
            queryset = Cliente.objects.filter(tipo_cliente='juridica', razon_social__iexact=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError('La razón social ya se encuentra registrada.')
        return value

    def validate_nombre_comercial(self, value):
        if value in (None, ''):
            value = value or ''
        else:
            value = validate_commercial_name(
                value,
                empty_message='El nombre comercial no puede estar formado solamente por espacios.',
                letter_message='El nombre comercial debe contener al menos una letra.',
            )
        tipo = self.initial_data.get('tipo_cliente') or getattr(self.instance, 'tipo_cliente', None)
        if tipo == 'juridica' and value:
            queryset = Cliente.objects.filter(tipo_cliente='juridica', nombre_comercial__iexact=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError('El nombre comercial ya se encuentra registrado.')
        return value

    def validate_email(self, value):
        if not value:
            return value
        value = value.strip().lower()
        queryset = Cliente.objects.filter(email__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El correo electrónico ya se encuentra registrado.')
        return value

    def validate(self, attrs):
        tipo_cliente = attrs.get('tipo_cliente') or getattr(self.instance, 'tipo_cliente', None)
        razon_social = attrs.get('razon_social') if 'razon_social' in attrs else getattr(self.instance, 'razon_social', None)
        nombre_comercial = attrs.get('nombre_comercial') if 'nombre_comercial' in attrs else getattr(self.instance, 'nombre_comercial', None)

        semantic_errors = {}
        for field, message in {
            'nombres': 'Los nombres no pueden estar formados solamente por espacios.',
            'apellidos': 'Los apellidos no pueden estar formados solamente por espacios.',
            'razon_social': 'La razón social no puede estar formada solamente por espacios.',
            'nombre_comercial': 'El nombre comercial no puede estar formado solamente por espacios.',
            'pais': 'El país no puede estar formado solamente por espacios.',
            'departamento': 'El departamento no puede estar formado solamente por espacios.',
            'ciudad': 'La ciudad no puede estar formada solamente por espacios.',
        }.items():
            raw_value = self.initial_data.get(field)
            if isinstance(raw_value, str) and raw_value and not raw_value.strip():
                semantic_errors[field] = message

        if tipo_cliente == 'natural':
            if not normalize_semantic_text(attrs.get('nombres', getattr(self.instance, 'nombres', ''))):
                semantic_errors['nombres'] = 'Los nombres son obligatorios.'
            if not normalize_semantic_text(attrs.get('apellidos', getattr(self.instance, 'apellidos', ''))):
                semantic_errors['apellidos'] = 'Los apellidos son obligatorios.'
        elif tipo_cliente == 'juridica' and not normalize_semantic_text(razon_social):
            semantic_errors['razon_social'] = 'La razón social es obligatoria para persona jurídica.'

        if semantic_errors:
            raise serializers.ValidationError(semantic_errors)

        attrs = validate_location(attrs, self.instance)

        # Verificar que los teléfonos no sean iguales
        telefono_val = attrs.get('telefono') if 'telefono' in attrs else getattr(self.instance, 'telefono', None)
        telefono2_val = attrs.get('telefono2') if 'telefono2' in attrs else getattr(self.instance, 'telefono2', None)
        if telefono_val and telefono2_val and str(telefono_val).strip() == str(telefono2_val).strip():
            raise serializers.ValidationError({'telefono2': 'Los teléfonos no pueden ser iguales.'})

        if tipo_cliente == 'juridica' and razon_social and nombre_comercial:
            if razon_social.strip().lower() == nombre_comercial.strip().lower():
                raise serializers.ValidationError({'nombre_comercial': 'El nombre comercial no debe ser igual a la razón social.'})
        return attrs
