from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Cliente
from .serializers import ClienteSerializer
from usuarios.models import TipoDocumento, Usuario

# ── CREAR CLIENTE ──────────────────────────────────────────
@api_view(['POST'])
def crear_cliente(request):
    data = request.data

    # Validar documento duplicado
    if Cliente.objects.filter(numero_documento=data.get('numero_documento')).exists():
        return Response({'error': 'Ya existe un cliente con ese número de documento.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        tipo_documento = TipoDocumento.objects.get(id=data['tipo_documento_id'])
        creado_por     = Usuario.objects.get(id=data['creado_por_id'])

        cliente = Cliente.objects.create(
            tipo_cliente     = data['tipo_cliente'],
            categoria        = data.get('categoria', 'general'),
            tipo_documento   = tipo_documento,
            numero_documento = data['numero_documento'],
            nombres          = data.get('nombres', ''),
            apellidos        = data.get('apellidos', ''),
            razon_social     = data.get('razon_social', ''),
            nombre_comercial = data.get('nombre_comercial', ''),
            email            = data.get('email', ''),
            telefono         = data.get('telefono', ''),
            telefono2        = data.get('telefono2', ''),
            direccion        = data.get('direccion', ''),
            ciudad           = data.get('ciudad', ''),
            departamento     = data.get('departamento', ''),
            pais             = data.get('pais', 'Colombia'),
            codigo_postal    = data.get('codigo_postal', ''),
            estado           = data.get('estado', 'activo'),
            notas            = data.get('notas', ''),
            creado_por       = creado_por,
        )

        return Response({
            'mensaje': '✅ Cliente creado correctamente.',
            'cliente': ClienteSerializer(cliente).data
        }, status=status.HTTP_201_CREATED)

    except TipoDocumento.DoesNotExist:
        return Response({'error': 'Tipo de documento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR CLIENTES ────────────────────────────────────────
@api_view(['GET'])
def listar_clientes(request):
    estado = request.query_params.get('estado', None)
    if estado:
        clientes = Cliente.objects.select_related('tipo_documento', 'creado_por').filter(estado=estado)
    else:
        clientes = Cliente.objects.select_related('tipo_documento', 'creado_por').all()
    serializer = ClienteSerializer(clientes, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── EDITAR CLIENTE ─────────────────────────────────────────
@api_view(['PUT'])
def editar_cliente(request, id):
    try:
        cliente = Cliente.objects.get(id=id)
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    data = request.data

    # Validar documento duplicado en edición
    if Cliente.objects.filter(numero_documento=data.get('numero_documento')).exclude(id=id).exists():
        return Response({'error': 'Ya existe otro cliente con ese número de documento.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        tipo_documento = TipoDocumento.objects.get(id=data['tipo_documento_id'])
    except TipoDocumento.DoesNotExist:
        return Response({'error': 'Tipo de documento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    cliente.tipo_cliente     = data.get('tipo_cliente',     cliente.tipo_cliente)
    cliente.categoria        = data.get('categoria',        cliente.categoria)
    cliente.tipo_documento   = tipo_documento
    cliente.numero_documento = data.get('numero_documento', cliente.numero_documento)
    cliente.nombres          = data.get('nombres',          cliente.nombres)
    cliente.apellidos        = data.get('apellidos',        cliente.apellidos)
    cliente.razon_social     = data.get('razon_social',     cliente.razon_social)
    cliente.nombre_comercial = data.get('nombre_comercial', cliente.nombre_comercial)
    cliente.email            = data.get('email',            cliente.email)
    cliente.telefono         = data.get('telefono',         cliente.telefono)
    cliente.telefono2        = data.get('telefono2',        cliente.telefono2)
    cliente.direccion        = data.get('direccion',        cliente.direccion)
    cliente.ciudad           = data.get('ciudad',           cliente.ciudad)
    cliente.departamento     = data.get('departamento',     cliente.departamento)
    cliente.pais             = data.get('pais',             cliente.pais)
    cliente.codigo_postal    = data.get('codigo_postal',    cliente.codigo_postal)
    cliente.estado           = data.get('estado',           cliente.estado)
    cliente.notas            = data.get('notas',            cliente.notas)
    cliente.save()

    return Response({
        'mensaje': '✅ Cliente actualizado correctamente.',
        'cliente': ClienteSerializer(cliente).data
    }, status=status.HTTP_200_OK)


# ── CAMBIAR ESTADO CLIENTE ─────────────────────────────────
@api_view(['PATCH'])
def cambiar_estado_cliente(request, id):
    try:
        cliente = Cliente.objects.get(id=id)
        nuevo_estado = request.data.get('estado')
        if nuevo_estado not in ['activo', 'inactivo', 'bloqueado']:
            return Response({'error': 'Estado inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        cliente.estado = nuevo_estado
        cliente.save()
        return Response({'mensaje': f'Cliente {nuevo_estado} correctamente.', 'estado': cliente.estado})
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)


# ── ELIMINAR CLIENTE ───────────────────────────────────────
@api_view(['DELETE'])
def eliminar_cliente(request, id):
    try:
        cliente = Cliente.objects.get(id=id)
        cliente.delete()
        return Response({'mensaje': 'Cliente eliminado correctamente.'}, status=status.HTTP_200_OK)
    except Cliente.DoesNotExist:
        return Response({'error': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
