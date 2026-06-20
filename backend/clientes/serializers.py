from rest_framework import serializers
from django.db.models import Q
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    tipo_documento_nombre  = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    tipo_documento_codigo  = serializers.CharField(source='tipo_documento.codigo', read_only=True)
    creado_por_nombre      = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    nombre_display         = serializers.SerializerMethodField()
    documento_display      = serializers.SerializerMethodField()
    numero_documento = serializers.CharField(validators=[], required=True, error_messages={'required': 'El número de documento es obligatorio.'})

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
        value = (value or '').strip()
        if not value.isdigit():
            raise serializers.ValidationError('No se permiten letras en el número de documento.')
        if len(value) < 6 or len(value) > 10:
            raise serializers.ValidationError('El número de documento debe tener entre 6 y 10 dígitos.')
        # Unicidad (excluir instancia actual en edición)
        queryset = Cliente.objects.filter(numero_documento__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('El número de documento ya se encuentra registrado.')
        return value

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
        value = (value or '').strip()
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
        value = (value or '').strip()
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

        # Verificar que los teléfonos no sean iguales
        telefono_val = attrs.get('telefono') if 'telefono' in attrs else getattr(self.instance, 'telefono', None)
        telefono2_val = attrs.get('telefono2') if 'telefono2' in attrs else getattr(self.instance, 'telefono2', None)
        if telefono_val and telefono2_val and str(telefono_val).strip() == str(telefono2_val).strip():
            raise serializers.ValidationError({'telefono2': 'Los teléfonos no pueden ser iguales.'})

        if tipo_cliente == 'juridica' and razon_social and nombre_comercial:
            if razon_social.strip().lower() == nombre_comercial.strip().lower():
                raise serializers.ValidationError({'nombre_comercial': 'El nombre comercial no debe ser igual a la razón social.'})
        return attrs
