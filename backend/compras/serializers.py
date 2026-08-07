from rest_framework import serializers

from .models import Compra, DetalleCompra


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(
        source='producto.nombre', read_only=True
    )
    producto_marca = serializers.CharField(
        source='producto.marca', read_only=True
    )
    producto_referencia = serializers.CharField(
        source='producto.referencia', read_only=True
    )
    producto_unidad = serializers.CharField(
        source='producto.unidad_medida', read_only=True
    )

    class Meta:
        model = DetalleCompra
        fields = '__all__'


class CompraSerializer(serializers.ModelSerializer):
    detalles = DetalleCompraSerializer(many=True, read_only=True)
    proveedor_nombre = serializers.CharField(
        source='proveedor.razon_social', read_only=True
    )
    registrado_por_nombre = serializers.SerializerMethodField()
    almacen_nombre = serializers.CharField(
        source='almacen.nombre', read_only=True, allow_null=True
    )
    proveedor_documento = serializers.SerializerMethodField()
    anulado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Compra
        fields = '__all__'
        read_only_fields = [
            'registrado_por', 'anulado_por', 'fecha_anulacion', 'empresa_snapshot'
        ]

    def get_proveedor_documento(self, obj):
        codigo = getattr(obj.proveedor.tipo_documento, 'codigo', '')
        return f'{codigo} {obj.proveedor.numero_documento}'.strip()

    def get_registrado_por_nombre(self, obj):
        return (
            obj.registrado_por.nombre_completo
            if obj.registrado_por
            else 'No disponible'
        )

    def get_anulado_por_nombre(self, obj):
        return obj.anulado_por.nombre_completo if obj.anulado_por else ''


class DetalleCompraEntradaSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField(min_value=1)
    costo_unitario = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0
    )
    iva = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=0, max_value=100,
        required=False, default=0,
    )


class RegistrarCompraSerializer(serializers.Serializer):
    proveedor_id = serializers.IntegerField(min_value=1)
    almacen_id = serializers.IntegerField(
        min_value=1, required=False, allow_null=True
    )
    numero_factura = serializers.RegexField(
        regex=r'^\d+$',
        max_length=50,
        error_messages={'invalid': 'El numero de factura solo puede contener numeros.'},
    )
    fecha_compra = serializers.DateField()
    tipo_compra = serializers.ChoiceField(choices=['Contado', 'Credito'])
    productos = DetalleCompraEntradaSerializer(many=True, allow_empty=False)
    observaciones = serializers.CharField(
        required=False, allow_blank=True, default='', max_length=2000
    )

    def validate_productos(self, productos):
        ids = [item['producto_id'] for item in productos]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                'Un producto no puede aparecer mas de una vez en la misma compra.'
            )
        return productos


class AnularCompraSerializer(serializers.Serializer):
    motivo = serializers.CharField(
        required=False,
        allow_blank=True,
        default='Anulacion de compra',
        max_length=1000,
    )
