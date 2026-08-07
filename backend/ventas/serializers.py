from rest_framework import serializers

from .models import DetalleVenta, Venta


class DetalleVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleVenta
        fields = [
            'id', 'producto', 'nombre_producto', 'sku_producto',
            'precio_unitario', 'cantidad', 'subtotal',
            'iva_porcentaje', 'iva_monto', 'total',
        ]


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True, read_only=True)
    cliente_nombre = serializers.SerializerMethodField()
    vendedor_nombre = serializers.SerializerMethodField()
    almacen_nombre = serializers.CharField(
        source='almacen.nombre', read_only=True, allow_null=True
    )
    cliente_documento = serializers.SerializerMethodField()
    anulado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            'id', 'numero_venta', 'cliente', 'cliente_nombre', 'cliente_documento',
            'vendedor', 'vendedor_nombre', 'almacen', 'almacen_nombre',
            'subtotal', 'descuento', 'tipo_iva', 'iva_porcentaje',
            'iva_monto', 'total', 'metodo_pago',
            'efectivo_recibido', 'cambio',
            'numero_tarjeta', 'aprobacion_tarjeta',
            'comprobante_transferencia', 'otro_metodo',
            'observaciones', 'estado', 'fecha_creacion',
            'fecha_anulacion', 'anulado_por', 'anulado_por_nombre', 'motivo_anulacion',
            'empresa_snapshot',
            'detalles',
        ]
        read_only_fields = [
            'vendedor', 'anulado_por', 'fecha_anulacion', 'empresa_snapshot'
        ]

    def get_cliente_nombre(self, obj):
        if not obj.cliente:
            return 'Cliente General'
        cliente = obj.cliente
        if cliente.tipo_cliente == 'natural':
            return f'{cliente.nombres or ""} {cliente.apellidos or ""}'.strip()
        return (
            cliente.razon_social
            or cliente.nombre_comercial
            or 'Cliente sin nombre'
        )

    def get_vendedor_nombre(self, obj):
        return obj.vendedor.nombre_completo if obj.vendedor else 'No disponible'

    def get_cliente_documento(self, obj):
        if not obj.cliente:
            return ''
        codigo = getattr(obj.cliente.tipo_documento, 'codigo', '')
        return f'{codigo} {obj.cliente.numero_documento}'.strip()

    def get_anulado_por_nombre(self, obj):
        return obj.anulado_por.nombre_completo if obj.anulado_por else ''


class DetalleVentaEntradaSerializer(serializers.Serializer):
    producto_id = serializers.IntegerField(min_value=1)
    cantidad = serializers.IntegerField()
    precio_unitario = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=0,
        required=False,
        error_messages={
            'min_value': 'El precio unitario no puede ser negativo.',
        },
    )

    def validate_cantidad(self, cantidad):
        if cantidad <= 0:
            raise serializers.ValidationError(
                'La cantidad ingresada debe ser mayor a 0.'
            )
        return cantidad


class MetodoPagoSerializer(serializers.Serializer):
    metodo = serializers.ChoiceField(choices=[opcion[0] for opcion in Venta.METODO_PAGO_CHOICES])
    efectivoRecibido = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=0,
        required=False, allow_null=True,
    )
    cambio = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=0,
        required=False, allow_null=True,
    )
    numeroTarjeta = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=4
    )
    aprobacionTarjeta = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=50
    )
    comprobanteTransferencia = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=100
    )
    otroMetodo = serializers.CharField(
        required=False, allow_blank=True, allow_null=True, max_length=100
    )


class RegistrarVentaSerializer(serializers.Serializer):
    cliente_id = serializers.IntegerField(
        min_value=1, required=False, allow_null=True
    )
    almacen_id = serializers.IntegerField(min_value=1)
    descuento = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=0,
        required=False, default=0,
    )
    observaciones = serializers.CharField(
        required=False, allow_blank=True, default=''
    )
    productos = DetalleVentaEntradaSerializer(many=True, allow_empty=False)
    metodo_pago = MetodoPagoSerializer()

    def validate_productos(self, productos):
        # Se consolidan cantidades para tolerar clientes antiguos que repiten lineas.
        consolidados = {}
        for item in productos:
            producto_id = item['producto_id']
            if producto_id not in consolidados:
                consolidados[producto_id] = dict(item)
                continue
            consolidados[producto_id]['cantidad'] += item['cantidad']
        return list(consolidados.values())


class AnularVentaSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=1, max_length=1000)
