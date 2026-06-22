from django.utils import timezone
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import SesionAPI


class APITokenAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth_header = get_authorization_header(request).split()
        if not auth_header:
            return None

        if auth_header[0].decode().lower() != self.keyword.lower():
            return None

        if len(auth_header) != 2:
            raise AuthenticationFailed('Encabezado de autorizacion invalido.')

        token = auth_header[1].decode()

        try:
            sesion = SesionAPI.objects.select_related('usuario', 'usuario__rol').get(
                token=token,
                activa=True
            )
        except SesionAPI.DoesNotExist:
            raise AuthenticationFailed('Token invalido o sesion cerrada.')

        if sesion.esta_expirada():
            sesion.activa = False
            sesion.save(update_fields=['activa', 'ultima_actividad'])
            raise AuthenticationFailed('La sesion expiro. Inicie sesion nuevamente.')

        if sesion.usuario.estado != 'activo':
            sesion.activa = False
            sesion.save(update_fields=['activa', 'ultima_actividad'])
            raise AuthenticationFailed('El usuario esta inactivo.')

        sesion.ultima_actividad = timezone.now()
        sesion.save(update_fields=['ultima_actividad'])
        return (sesion.usuario, sesion)
