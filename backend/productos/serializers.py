from django.db.models import Sum
from rest_framework import serializers
from .models import Categoria, Producto


class CategoriaSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model = Categoria
        fields = '__all__'
        extra_kwargs = {
            'creado_por': {'write_only': True, 'required': False}
        }


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre     = serializers.CharField(source='categoria.nombre',       read_only=True)
    categoria_tipo       = serializers.CharField(source='categoria.tipo_control', read_only=True)
    creado_por_nombre    = serializers.CharField(source='creado_por.nombre_completo', read_only=True)
    imagen_url           = serializers.SerializerMethodField()
    stock                = serializers.SerializerMethodField()

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

    def get_stock(self, obj):
        if hasattr(obj, 'stock_actual_calculado'):
            return obj.stock_actual_calculado
        return obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0


class ProductoEscrituraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'nombre', 'marca', 'referencia', 'unidad_medida', 'categoria',
            'precio_compra', 'precio_venta', 'iva_porcentaje',
            'stock_minimo', 'descripcion', 'observaciones',
            'especificaciones', 'imagen',
        ]

    def validate_precio_compra(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El precio de compra no puede ser negativo.'
            )
        return value

    def validate_precio_venta(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El precio de venta no puede ser negativo.'
            )
        return value

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El stock minimo no puede ser negativo.'
            )
        return value

    def validate_iva_porcentaje(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                'El IVA debe estar entre 0 y 100.'
            )
        return value
