from django.contrib.auth.hashers import check_password, make_password
from django.core.validators import RegexValidator
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import Usuario, Rol, TipoDocumento


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
        max_length=10,
        validators=[
            RegexValidator(
                regex=r'^\d{1,10}$',
                message='El número de documento debe contener solo números y máximo 10 caracteres.'
            ),
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
        }

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