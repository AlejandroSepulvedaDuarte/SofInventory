from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.hashers import check_password
from django.utils import timezone

from .models import Usuario, Rol, TipoDocumento, SesionAPI, IntentoFallidoLogin
from .permissions import require_roles
from .serializers import UsuarioSerializer, RolSerializer, TipoDocumentoSerializer, LoginSerializer


def serializar_usuario_publico(user):
    return {
        'id': user.id,
        'username': user.username,
        'nombre': user.nombre_completo,
        'rol': user.rol.nombre,
        'estado': user.estado,
        'email': user.email,
    }


def obtener_ip_cliente(request):
    """Obtiene la dirección IP del cliente."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'error': 'Datos invalidos'}, status=status.HTTP_400_BAD_REQUEST)

    username = serializer.validated_data['username']
    password = serializer.validated_data['password']
    ip_address = obtener_ip_cliente(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]

    try:
        user = Usuario.objects.select_related('rol').get(username=username)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario o contrasena incorrectos'}, status=status.HTTP_401_UNAUTHORIZED)

    if user.cuenta_bloqueada:
        return Response({
            'error': 'Cuenta bloqueada. Contacte al administrador para desbloquearla.',
            'cuenta_bloqueada': True
        }, status=status.HTTP_403_FORBIDDEN)

    if user.estado == 'inactivo':
        return Response({'error': 'Usuario inactivo. Contacte al administrador.'}, status=status.HTTP_403_FORBIDDEN)

    if not check_password(password, user.password):
        IntentoFallidoLogin.objects.create(
            usuario=user,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        intentos_count = IntentoFallidoLogin.objects.filter(usuario=user).count()
        
        if intentos_count >= 5:
            user.cuenta_bloqueada = True
            user.fecha_bloqueo = timezone.now()
            user.save(update_fields=['cuenta_bloqueada', 'fecha_bloqueo'])
            IntentoFallidoLogin.objects.filter(usuario=user).delete()
            
            return Response({
                'error': f'Cuenta bloqueada tras {intentos_count} intentos fallidos. Contacte al administrador.',
                'cuenta_bloqueada': True
            }, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'error': 'Usuario o contrasena incorrectos',
            'intentos_fallidos': intentos_count,
            'intentos_restantes': 5 - intentos_count
        }, status=status.HTTP_401_UNAUTHORIZED)

    IntentoFallidoLogin.objects.filter(usuario=user).delete()

    SesionAPI.objects.filter(usuario=user, activa=True).update(activa=False)
    sesion = SesionAPI.objects.create(
        usuario=user,
        user_agent=user_agent,
    )

    return Response({
        'mensaje': f'Bienvenido {user.nombre_completo}',
        'access_token': sesion.token,
        'expires_at': sesion.expira_en.isoformat(),
        'usuario': serializar_usuario_publico(user),
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def me(request):
    return Response({'usuario': serializar_usuario_publico(request.user)}, status=status.HTTP_200_OK)


@api_view(['POST'])
def logout(request):
    sesion = getattr(request, 'auth', None)
    if sesion:
        sesion.activa = False
        sesion.save(update_fields=['activa', 'ultima_actividad'])
    return Response({'mensaje': 'Sesion cerrada correctamente.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@require_roles('Administrador')
def crear_usuario(request):
    data = request.data.copy()
    data.pop('rol_solicitante', None)
    data.pop('solicitante_id', None)

    serializer = UsuarioSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response({'mensaje': 'Usuario creado exitosamente'}, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@require_roles('Administrador')
def listar_usuarios(request):
    usuarios = Usuario.objects.select_related('rol', 'tipo_documento').all()
    serializer = UsuarioSerializer(usuarios, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def listar_roles(request):
    roles = Rol.objects.all()
    serializer = RolSerializer(roles, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def listar_tipos_documento(request):
    tipos = TipoDocumento.objects.all()
    serializer = TipoDocumentoSerializer(tipos, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@require_roles('Administrador')
def eliminar_usuario(request, id):
    try:
        user = Usuario.objects.get(id=id)

        if user.rol.nombre == 'Administrador':
            total_admins = Usuario.objects.filter(rol__nombre='Administrador').count()
            if total_admins <= 1:
                return Response(
                    {'error': 'No se puede eliminar al unico administrador del sistema.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        SesionAPI.objects.filter(usuario=user, activa=True).update(activa=False)
        user.delete()
        return Response({'mensaje': 'Usuario eliminado correctamente'}, status=status.HTTP_200_OK)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@require_roles('Administrador')
def cambiar_estado(request, id):
    try:
        user = Usuario.objects.get(id=id)
        user.estado = 'inactivo' if user.estado == 'activo' else 'activo'
        user.save()

        if user.estado == 'inactivo':
            SesionAPI.objects.filter(usuario=user, activa=True).update(activa=False)

        return Response({
            'mensaje': f'Estado cambiado a {user.estado}',
            'estado': user.estado
        }, status=status.HTTP_200_OK)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@require_roles('Administrador')
def desbloquear_usuario(request, id):
    """Desbloquea una cuenta de usuario. Solo administradores pueden llamar este endpoint."""
    try:
        user = Usuario.objects.get(id=id)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    if not user.cuenta_bloqueada:
        return Response({'mensaje': 'La cuenta no está bloqueada', 'cuenta_bloqueada': False}, status=status.HTTP_200_OK)

    # Limpiar intentos fallidos y desbloquear
    IntentoFallidoLogin.objects.filter(usuario=user).delete()
    user.cuenta_bloqueada = False
    user.fecha_bloqueo = None
    user.save(update_fields=['cuenta_bloqueada', 'fecha_bloqueo'])

    # Opcional: invalidar sesiones existentes por seguridad (no estrictamente necesario al desbloquear)
    SesionAPI.objects.filter(usuario=user, activa=True).update(activa=False)

    return Response({'mensaje': 'Cuenta desbloqueada correctamente', 'cuenta_bloqueada': False}, status=status.HTTP_200_OK)


@api_view(['PUT'])
@require_roles('Administrador')
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


@api_view(['GET'])
@require_roles('Administrador')
def reporte_roles(request):
    roles = Rol.objects.all()
    reporte = []
    for rol in roles:
        usuarios = Usuario.objects.filter(rol=rol).select_related('tipo_documento')
        reporte.append({
            'id': rol.id,
            'nombre': rol.nombre,
            'descripcion': rol.descripcion or '',
            'total': usuarios.count(),
            'activos': usuarios.filter(estado='activo').count(),
            'inactivos': usuarios.filter(estado='inactivo').count(),
            'usuarios': [
                {
                    'id': u.id,
                    'nombre_completo': u.nombre_completo,
                    'username': u.username,
                    'estado': u.estado,
                }
                for u in usuarios
            ]
        })
    return Response(reporte, status=status.HTTP_200_OK)
