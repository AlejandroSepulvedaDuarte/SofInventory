from rest_framework import serializers
from .models import Venta, DetalleVenta


class DetalleVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DetalleVenta
        fields = [
            'id', 'producto', 'nombre_producto', 'sku_producto',
            'precio_unitario', 'cantidad', 'subtotal'
        ]


class VentaSerializer(serializers.ModelSerializer):
    detalles       = DetalleVentaSerializer(many=True, read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    vendedor_nombre = serializers.SerializerMethodField()

    class Meta:
        model  = Venta
        fields = [
            'id', 'numero_venta', 'cliente', 'cliente_nombre',
            'vendedor', 'vendedor_nombre',
            'subtotal', 'descuento', 'tipo_iva', 'iva_porcentaje',
            'iva_monto', 'total', 'metodo_pago',
            'efectivo_recibido', 'cambio',
            'numero_tarjeta', 'aprobacion_tarjeta',
            'comprobante_transferencia', 'otro_metodo',
            'observaciones', 'estado',
            'fecha_creacion', 'detalles'
        ]

    def get_cliente_nombre(self, obj):
        if not obj.cliente:
            return 'Cliente General'
        c = obj.cliente
        if c.tipo_persona == 'natural':
            return f'{c.nombres} {c.apellidos}'
        return c.razon_social

    def get_vendedor_nombre(self, obj):
        if obj.vendedor:
            return obj.vendedor.nombre_completo
        return ''