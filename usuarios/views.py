from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from .models import Usuario, Rol, TipoDocumento
from .serializers import UsuarioSerializer, RolSerializer, TipoDocumentoSerializer, LoginSerializer


# ── LOGIN ──────────────────────────────────────────────────
@api_view(['POST'])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': 'Datos inválidos'}, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data['username']
    password = serializer.validated_data['password']

    try:
        user = Usuario.objects.select_related('rol').get(username=username)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario o contraseña incorrectos'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.estado == 'inactivo':
        return Response({'error': 'Usuario inactivo. Contacte al administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if not check_password(password, user.password):
        return Response({'error': 'Usuario o contraseña incorrectos'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response({
        'mensaje': f'Bienvenido {user.nombre_completo}',
        'usuario': {
            'id':       user.id,
            'username': user.username,
            'nombre':   user.nombre_completo,
            'rol':      user.rol.nombre,
            'estado':   user.estado,
        }
    }, status=status.HTTP_200_OK)


# ── CREAR USUARIO ──────────────────────────────────────────
@api_view(['POST'])
def crear_usuario(request):
    rol_solicitante = request.data.get('rol_solicitante')
    if rol_solicitante != 'Administrador':
        return Response({'error': 'Solo los administradores pueden crear usuarios.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    data.pop('rol_solicitante', None)

    serializer = UsuarioSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Usuario creado exitosamente'}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── LISTAR USUARIOS ────────────────────────────────────────
@api_view(['GET'])
def listar_usuarios(request):
    usuarios = Usuario.objects.select_related('rol', 'tipo_documento').all()
    serializer = UsuarioSerializer(usuarios, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── LISTAR ROLES ───────────────────────────────────────────
@api_view(['GET'])
def listar_roles(request):
    roles = Rol.objects.all()
    serializer = RolSerializer(roles, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ── LISTAR TIPOS DOCUMENTO ─────────────────────────────────
@api_view(['GET'])
def listar_tipos_documento(request):
    tipos = TipoDocumento.objects.all()
    serializer = TipoDocumentoSerializer(tipos, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

# ── ELIMINAR USUARIO ───────────────────────────────────────
@api_view(['DELETE'])
def eliminar_usuario(request, id):
    try:
        user = Usuario.objects.get(id=id)
        
        # Protección: no eliminar al último administrador
        if user.rol.nombre == 'Administrador':
            total_admins = Usuario.objects.filter(rol__nombre='Administrador').count()
            if total_admins <= 1:
                return Response({'error': 'No se puede eliminar al único administrador del sistema.'}, status=status.HTTP_400_BAD_REQUEST)

        user.delete()
        return Response({'mensaje': 'Usuario eliminado correctamente'}, status=status.HTTP_200_OK)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

# ── CAMBIAR ESTADO ─────────────────────────────────────────
@api_view(['PATCH'])
def cambiar_estado(request, id):
    try:
        user = Usuario.objects.get(id=id)
        user.estado = 'inactivo' if user.estado == 'activo' else 'activo'
        user.save()
        return Response({
            'mensaje': f'Estado cambiado a {user.estado}',
            'estado': user.estado
        }, status=status.HTTP_200_OK)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)


# ── EDITAR USUARIO ─────────────────────────────────────────
@api_view(['PUT'])
def editar_usuario(request, id):
    try:
        user = Usuario.objects.get(id=id)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    serializer = UsuarioSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Usuario actualizado correctamente'}, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ── REPORTE DE ROLES ───────────────────────────────────────
@api_view(['GET'])
def reporte_roles(request):
    roles = Rol.objects.all()
    reporte = []
    for rol in roles:
        usuarios = Usuario.objects.filter(rol=rol).select_related('tipo_documento')
        reporte.append({
            'id':          rol.id,
            'nombre':      rol.nombre,
            'descripcion': rol.descripcion or '',
            'total':       usuarios.count(),
            'activos':     usuarios.filter(estado='activo').count(),
            'inactivos':   usuarios.filter(estado='inactivo').count(),
            'usuarios': [
                {
                    'id':              u.id,
                    'nombre_completo': u.nombre_completo,
                    'username':        u.username,
                    'estado':          u.estado,
                }
                for u in usuarios
            ]
        })
    return Response(reporte, status=status.HTTP_200_OK)