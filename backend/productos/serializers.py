from django.db.models import Sum
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from catalogos.media import safe_image_upload_path, validate_uploaded_image
from usuarios.validators import normalize_semantic_text, validate_commercial_name
from .models import Categoria, Producto


class CategoriaSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.CharField(source='creado_por.nombre_completo', read_only=True)

    class Meta:
        model = Categoria
        fields = '__all__'
        extra_kwargs = {
            'creado_por': {'write_only': True, 'required': False},
            'nombre': {
                'validators': [
                    UniqueValidator(
                        queryset=Categoria.objects.all(),
                        message='Ya existe una categoría con este nombre.',
                    )
                ],
                'error_messages': {
                    'required': 'El nombre es obligatorio.',
                    'blank': 'El nombre no puede estar vacío.',
                    'unique': 'Ya existe una categoría con este nombre.',
                }
            },
            'tipo_control': {
                'error_messages': {
                    'required': 'Selecciona un tipo de control.',
                    'invalid_choice': 'Selecciona un tipo de control válido.',
                }
            },
        }

    def validate_nombre(self, value):
        value = validate_commercial_name(
            value,
            empty_message='El nombre de la categoría es obligatorio.',
            letter_message=(
                'El nombre de la categoría no puede estar compuesto solamente por números.'
                if normalize_semantic_text(value).isdigit()
                else 'El nombre de la categoría debe contener al menos una letra.'
            ),
        )
        queryset = Categoria.objects.filter(nombre__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe una categoría con este nombre.'
            )
        return value


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
    quitar_imagen = serializers.BooleanField(
        write_only=True, required=False, default=False
    )

    class Meta:
        model = Producto
        fields = [
            'nombre', 'marca', 'referencia', 'unidad_medida', 'categoria',
            'precio_compra', 'precio_venta', 'iva_porcentaje',
            'stock_minimo', 'descripcion', 'observaciones',
            'especificaciones', 'imagen', 'quitar_imagen',
        ]
        extra_kwargs = {
            'nombre': {'error_messages': {'required': 'El nombre es obligatorio.', 'blank': 'El nombre no puede estar vacío.'}},
            'marca': {'error_messages': {'required': 'La marca es obligatoria.', 'blank': 'La marca no puede estar vacía.'}},
            'referencia': {'error_messages': {'required': 'La referencia es obligatoria.', 'blank': 'La referencia no puede estar vacía.'}},
            'categoria': {'error_messages': {'required': 'Selecciona una categoría.', 'null': 'Selecciona una categoría.', 'does_not_exist': 'La categoría seleccionada no existe.'}},
        }

    def validate_nombre(self, value):
        return validate_commercial_name(
            value,
            empty_message='El nombre del producto es obligatorio.',
            letter_message='El nombre del producto debe contener al menos una letra.',
        )

    def validate_marca(self, value):
        return validate_commercial_name(
            value,
            empty_message='La marca es obligatoria.',
            letter_message='La marca debe contener al menos una letra.',
        )

    def validate_referencia(self, value):
        return normalize_semantic_text(value)

    def validate_imagen(self, value):
        try:
            validate_uploaded_image(value)
        except Exception as error:
            if hasattr(error, 'messages'):
                raise serializers.ValidationError(error.messages[0]) from error
            raise
        value.name = safe_image_upload_path('productos', value.name).split('/')[-1]
        return value

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

    def update(self, instance, validated_data):
        quitar_imagen = validated_data.pop('quitar_imagen', False)
        if quitar_imagen and 'imagen' not in validated_data:
            validated_data['imagen'] = None
        return super().update(instance, validated_data)

    def create(self, validated_data):
        validated_data.pop('quitar_imagen', None)
        return super().create(validated_data)
