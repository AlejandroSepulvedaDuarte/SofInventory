from django.db.models import Sum
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from productos.models import Producto
from usuarios.validators import validate_commercial_name, validate_person_or_place

from .models import Almacen, MovimientoInventario


class AlmacenSerializer(serializers.ModelSerializer):
    total_productos = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    porcentaje_uso = serializers.SerializerMethodField()

    class Meta:
        model = Almacen
        fields = [
            'id', 'nombre', 'codigo', 'direccion', 'responsable',
            'telefono', 'capacidad', 'estado', 'notas',
            'total_productos', 'total_stock', 'porcentaje_uso',
            'fecha_creacion', 'fecha_actualizacion',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']
        extra_kwargs = {
            'nombre': {
                'validators': [
                    UniqueValidator(
                        queryset=Almacen.objects.all(),
                        message='Ya existe un almacén con este nombre.',
                    )
                ],
                'error_messages': {
                    'required': 'El nombre es obligatorio.',
                    'blank': 'El nombre no puede estar vacío.',
                    'unique': 'Ya existe un almacén con este nombre.',
                    'max_length': 'El nombre no puede superar 100 caracteres.',
                }
            },
            'codigo': {
                'validators': [
                    UniqueValidator(
                        queryset=Almacen.objects.all(),
                        message='Ya existe un almacén con este código.',
                    )
                ],
                'error_messages': {
                    'required': 'El código es obligatorio.',
                    'blank': 'El código no puede estar vacío.',
                    'unique': 'Ya existe un almacén con este código.',
                    'max_length': 'El código no puede superar 10 caracteres.',
                }
            },
            'estado': {
                'error_messages': {
                    'invalid_choice': 'Selecciona un estado válido.',
                }
            },
        }

    def get_total_productos(self, obj):
        return obj.stocks.filter(cantidad__gt=0).count()

    def get_total_stock(self, obj):
        return obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0

    def get_porcentaje_uso(self, obj):
        if not obj.capacidad:
            return 0
        total = obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0
        return min(100, round((total / obj.capacidad) * 100))

    def validate_codigo(self, value):
        value = value.upper().strip()
        if len(value) < 2 or len(value) > 10:
            raise serializers.ValidationError(
                'El código debe tener entre 2 y 10 caracteres.'
            )
        queryset = Almacen.objects.filter(codigo__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe un almacén con este código.'
            )
        return value

    def validate_nombre(self, value):
        value = validate_commercial_name(
            value,
            empty_message='El nombre del almacén es obligatorio.',
            letter_message='El nombre del almacén debe contener al menos una letra.',
        )
        queryset = Almacen.objects.filter(nombre__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe un almacén con este nombre.'
            )
        return value

    def validate_responsable(self, value):
        if value in (None, ''):
            return value
        return validate_person_or_place(
            value,
            empty_message='El responsable no puede estar formado solamente por espacios.',
            number_message='El nombre del responsable no puede contener números.',
            invalid_message='El nombre del responsable solo puede contener letras, espacios, apóstrofos y guiones.',
        )

    def validate_capacidad(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                'La capacidad no puede ser negativa.'
            )
        return value

    def validate(self, attrs):
        raw_responsible = self.initial_data.get('responsable')
        if isinstance(raw_responsible, str) and raw_responsible and not raw_responsible.strip():
            raise serializers.ValidationError({
                'responsable': 'El responsable no puede estar formado solamente por espacios.'
            })
        return attrs


class StockInventarioSerializer(serializers.ModelSerializer):
    producto_id = serializers.IntegerField(source='id')
    categoria_id = serializers.IntegerField(source='categoria.id')
    categoria_nombre = serializers.CharField(source='categoria.nombre')
    categoria_tipo = serializers.CharField(source='categoria.tipo_control')
    imagen_url = serializers.SerializerMethodField()
    stock_actual = serializers.SerializerMethodField()
    almacen_id = serializers.SerializerMethodField()
    almacen_nombre = serializers.SerializerMethodField()
    estado_stock = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'producto_id', 'nombre', 'marca', 'referencia', 'sku',
            'unidad_medida', 'precio_compra', 'precio_venta',
            'iva_porcentaje', 'estado', 'stock_minimo', 'imagen_url',
            'categoria_id', 'categoria_nombre', 'categoria_tipo',
            'stock_actual', 'almacen_id', 'almacen_nombre', 'estado_stock',
        ]

    def get_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.imagen and request:
            return request.build_absolute_uri(obj.imagen.url)
        return None

    def get_stock_actual(self, obj):
        if hasattr(obj, 'stock_actual_calculado'):
            return obj.stock_actual_calculado
        return obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0

    def _stocks_visibles(self, obj):
        almacen_id = self.context.get('almacen_id')
        stocks = [stock for stock in obj.stocks.all() if stock.cantidad > 0]
        if almacen_id:
            stocks = [
                stock for stock in stocks
                if stock.almacen_id == int(almacen_id)
            ]
        return stocks

    def get_almacen_id(self, obj):
        stocks = self._stocks_visibles(obj)
        return stocks[0].almacen_id if len(stocks) == 1 else None

    def get_almacen_nombre(self, obj):
        stocks = self._stocks_visibles(obj)
        if not stocks:
            return 'Sin almacén'
        return ', '.join(sorted({stock.almacen.nombre for stock in stocks}))

    def get_estado_stock(self, obj):
        if obj.estado == 'pendiente':
            return 'pendiente'
        actual = self.get_stock_actual(obj)
        minimo = obj.stock_minimo
        if actual == 0:
            return 'agotado'
        if minimo > 0 and actual <= minimo:
            return 'bajo'
        if minimo > 0 and actual <= minimo * 2:
            return 'medio'
        return 'alto'


class MovimientoRapidoSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField(
        min_value=1,
        error_messages={
            'required': 'Selecciona un producto.',
            'invalid': 'Selecciona un producto válido.',
            'min_value': 'Selecciona un producto válido.',
        },
    )
    almacen_id = serializers.IntegerField(
        min_value=1,
        error_messages={
            'required': 'Selecciona un almacén.',
            'invalid': 'Selecciona un almacén válido.',
            'min_value': 'Selecciona un almacén válido.',
        },
    )
    almacen_destino_id = serializers.IntegerField(
        min_value=1, required=False, allow_null=True
    )
    cantidad = serializers.IntegerField(
        min_value=1,
        error_messages={
            'required': 'La cantidad es obligatoria.',
            'invalid': 'La cantidad debe ser un número entero válido.',
            'min_value': 'La cantidad debe ser mayor que cero.',
        },
    )
    tipo = serializers.ChoiceField(
        choices=['entrada', 'salida', 'transferencia']
    )
    observacion = serializers.CharField(
        required=False, allow_blank=True, max_length=1000
    )
    motivo = serializers.CharField(
        required=False, allow_blank=True, max_length=1000,
        write_only=True,
    )

    def validate(self, attrs):
        if not attrs.get('observacion') and attrs.get('motivo'):
            attrs['observacion'] = attrs['motivo']
        attrs.pop('motivo', None)
        if attrs['tipo'] == 'transferencia':
            destino = attrs.get('almacen_destino_id')
            if not destino:
                raise serializers.ValidationError(
                    'Selecciona un almacén destino.'
                )
            if destino == attrs['almacen_id']:
                raise serializers.ValidationError(
                    'El almacén de origen y el de destino deben ser diferentes.'
                )
        return attrs


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre')
    producto_sku = serializers.CharField(source='producto.sku')
    almacen_origen_nombre = serializers.CharField(
        source='almacen_origen.nombre', allow_null=True
    )
    almacen_destino_nombre = serializers.CharField(
        source='almacen_destino.nombre', allow_null=True
    )
    creado_por_nombre = serializers.CharField(
        source='creado_por.nombre_completo'
    )

    class Meta:
        model = MovimientoInventario
        fields = [
            'id', 'tipo', 'producto', 'producto_nombre', 'producto_sku',
            'almacen_origen', 'almacen_origen_nombre',
            'almacen_destino', 'almacen_destino_nombre',
            'cantidad', 'costo_unitario', 'referencia_tipo',
            'referencia_id', 'compra', 'venta', 'traslado',
            'movimiento_revertido', 'observacion', 'fecha',
            'creado_por', 'creado_por_nombre',
        ]
