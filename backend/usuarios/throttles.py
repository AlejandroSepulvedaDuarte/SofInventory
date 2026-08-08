"""Throttles personalizados para el API."""

from django.conf import settings
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Limita los intentos de inicio de sesión anónimos por IP.

    La tasa se configura con LOGIN_THROTTLE_RATE (por defecto 5/min) para
    reducir la fuerza bruta y mitigar el bloqueo intencional de cuentas.
    """

    scope = 'login'

    def get_rate(self):
        return getattr(settings, 'LOGIN_THROTTLE_RATE', '5/min')
