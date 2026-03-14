from rest_framework import serializers
from .models import Compra, DetalleCompra


class DetalleCompraSerializer(serializers.ModelSerializer):
    producto_nombre    = serializers.CharField(source='producto.nombre',        read_only=True)
    producto_marca     = serializers.CharField(source='producto.marca',         read_only=True)
    producto_referencia = serializers.CharField(source='producto.referencia',   read_only=True)
    producto_unidad    = serializers.CharField(source='producto.unidad_medida', read_only=True)

    class Meta:
        model = DetalleCompra
        fields = '__all__'


class CompraSerializer(serializers.ModelSerializer):
    detalles              = DetalleCompraSerializer(many=True, read_only=True)
    proveedor_nombre      = serializers.CharField(source='proveedor.razon_social',       read_only=True)
    registrado_por_nombre = serializers.CharField(source='registrado_por.nombre_completo', read_only=True)

    class Meta:
        model = Compra
        fields = '__all__'