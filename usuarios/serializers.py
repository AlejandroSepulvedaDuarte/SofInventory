from rest_framework import serializers
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

    class Meta:
        model = Usuario
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }



class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()