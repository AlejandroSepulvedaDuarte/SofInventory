from functools import wraps

from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import BasePermission
from rest_framework.response import Response


class IsAuthenticatedUsuario(BasePermission):
    def has_permission(self, request, view):
        if request.user and getattr(request.user, 'is_authenticated', False):
            return True
        raise NotAuthenticated('Autenticacion requerida.')


def require_roles(*roles):
    allowed_roles = set(roles)

    def decorator(view_func):
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if not user or not getattr(user, 'is_authenticated', False):
                return Response(
                    {'error': 'Autenticacion requerida.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            user_role = getattr(getattr(user, 'rol', None), 'nombre', None)
            if allowed_roles and user_role not in allowed_roles:
                return Response(
                    {'error': 'No tiene permisos para realizar esta accion.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            return view_func(request, *args, **kwargs)

        return wrapped

    return decorator
