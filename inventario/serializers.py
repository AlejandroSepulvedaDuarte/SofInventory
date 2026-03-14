from rest_framework import serializers
from django.db.models import Sum
from .models import Almacen, StockAlmacen, MovimientoInventario
from productos.models import Producto


# ==============================
# SERIALIZER: ALMACÉN
# ==============================
class AlmacenSerializer(serializers.ModelSerializer):

    total_productos = serializers.SerializerMethodField()
    total_stock     = serializers.SerializerMethodField()
    porcentaje_uso  = serializers.SerializerMethodField()

    class Meta:
        model  = Almacen
        fields = [
            'id', 'nombre', 'codigo', 'direccion', 'responsable',
            'telefono', 'capacidad', 'estado', 'notas',
            'total_productos', 'total_stock', 'porcentaje_uso',
            'fecha_creacion', 'fecha_actualizacion'
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_actualizacion']

    def get_total_productos(self, obj):
        return obj.stocks.values('producto').distinct().count()

    def get_total_stock(self, obj):
        return obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0

    def get_porcentaje_uso(self, obj):
        if not obj.capacidad or obj.capacidad == 0:
            return 0
        total = obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0
        return min(100, round((total / obj.capacidad) * 100))

    def validate_codigo(self, value):
        value = value.upper().strip()
        if len(value) < 2 or len(value) > 10:
            raise serializers.ValidationError('El código debe tener entre 2 y 10 caracteres.')
        return value

    def validate_nombre(self, value):
        return value.strip()


# ==============================
# SERIALIZER: INVENTARIO / STOCK
# ==============================
class StockInventarioSerializer(serializers.ModelSerializer):

    producto_id      = serializers.IntegerField(source='id')
    categoria_id     = serializers.IntegerField(source='categoria.id')
    categoria_nombre = serializers.CharField(source='categoria.nombre')
    categoria_tipo   = serializers.CharField(source='categoria.tipo_control')
    imagen_url       = serializers.SerializerMethodField()
    stock_actual     = serializers.SerializerMethodField()
    almacen_id       = serializers.SerializerMethodField()
    almacen_nombre   = serializers.SerializerMethodField()
    estado_stock     = serializers.SerializerMethodField()

    class Meta:
        model  = Producto
        fields = [
            'producto_id', 'nombre', 'marca', 'referencia', 'sku',
            'unidad_medida', 'precio_compra', 'precio_venta', 'estado',
            'imagen_url', 'categoria_id', 'categoria_nombre', 'categoria_tipo',
            'stock_actual', 'almacen_id', 'almacen_nombre', 'estado_stock'
        ]

    def get_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.imagen and request:
            return request.build_absolute_uri(obj.imagen.url)
        return None

    def get_stock_actual(self, obj):
        return obj.stocks.aggregate(total=Sum('cantidad'))['total'] or 0

    def get_almacen_id(self, obj):
        stock = obj.stocks.select_related('almacen').first()
        return stock.almacen.id if stock else None

    def get_almacen_nombre(self, obj):
        stock = obj.stocks.select_related('almacen').first()
        return stock.almacen.nombre if stock else 'Sin almacén'

    def get_estado_stock(self, obj):
        return None


# ==============================
# SERIALIZER: MOVIMIENTO RÁPIDO
# ==============================
class MovimientoRapidoSerializer(serializers.Serializer):
    producto_id        = serializers.IntegerField()
    almacen_id         = serializers.IntegerField()
    almacen_destino_id = serializers.IntegerField(required=False, allow_null=True)  # solo para transferencia
    cantidad           = serializers.IntegerField(min_value=1)
    tipo               = serializers.ChoiceField(choices=['entrada', 'salida', 'transferencia'])
    observacion        = serializers.CharField(required=False, allow_blank=True)