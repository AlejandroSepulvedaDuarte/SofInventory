from django.contrib.auth.hashers import check_password, make_password
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import EventoAuditoriaUsuario, Usuario, Rol, TipoDocumento
from .validators import (
    document_type_code,
    validate_document_number,
    validate_person_or_place,
    validate_username_value,
)


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = '__all__'


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.nombre', read_only=True)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    username = serializers.CharField(
        max_length=50,
        error_messages={
            'required': 'El nombre de usuario es obligatorio.',
            'blank': 'El nombre de usuario no puede estar vacío.',
            'max_length': 'El nombre de usuario no puede superar 50 caracteres.',
        },
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message='El nombre de usuario ya se encuentra registrado.'
            )
        ]
    )
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message='El correo electrónico ya se encuentra registrado.'
            )
        ]
    )
    numero_documento = serializers.CharField(
        max_length=20,
        error_messages={
            'required': 'El número de documento es obligatorio.',
            'blank': 'El número de documento no puede estar vacío.',
            'max_length': 'El número de documento no puede superar 20 caracteres.',
        },
        validators=[
            UniqueValidator(
                queryset=Usuario.objects.all(),
                message='El número de documento ya se encuentra registrado.'
            )
        ]
    )

    class Meta:
        model = Usuario
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'nombre_completo': {
                'error_messages': {
                    'required': 'El nombre completo es obligatorio.',
                    'blank': 'El nombre completo no puede estar formado solamente por espacios.',
                    'max_length': 'El nombre completo no puede superar 150 caracteres.',
                }
            },
        }

    def validate_nombre_completo(self, value):
        return validate_person_or_place(
            value,
            empty_message='El nombre completo es obligatorio.',
            number_message='El nombre completo no puede contener números.',
            invalid_message='El nombre solo puede contener letras, espacios, apóstrofos y guiones.',
        )

    def validate_username(self, value):
        return validate_username_value(value)

    def validate_numero_documento(self, value):
        normalized = validate_document_number(value, document_type_code(self))
        queryset = Usuario.objects.filter(numero_documento__iexact=normalized)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'El número de documento ya se encuentra registrado.'
            )
        return normalized

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if self.instance is None:
            if not password:
                raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
            if not confirm_password:
                raise serializers.ValidationError({'confirm_password': 'Confirma la contraseña.'})

        if password:
            if password != confirm_password:
                raise serializers.ValidationError({'confirm_password': 'Las contraseñas no coinciden.'})

            existing_users = Usuario.objects.exclude(pk=self.instance.pk) if self.instance else Usuario.objects.all()
            for usuario in existing_users:
                if check_password(password, usuario.password):
                    raise serializers.ValidationError({
                        'password': 'Esta contraseña ya está en uso por otro usuario. Elige una contraseña diferente.'
                    })

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class EventoAuditoriaUsuarioSerializer(serializers.ModelSerializer):
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model = EventoAuditoriaUsuario
        fields = '__all__'
