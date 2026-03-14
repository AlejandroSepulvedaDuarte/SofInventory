from rest_framework import serializers
from .models import Categoria, Producto


class CategoriaSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model = Categoria
        fields = '__all__'
        extra_kwargs = {
            'creado_por': {'write_only': True}
        }


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre     = serializers.CharField(source='categoria.nombre',       read_only=True)
    categoria_tipo       = serializers.CharField(source='categoria.tipo_control', read_only=True)
    creado_por_nombre    = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    imagen_url           = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = '__all__'

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None