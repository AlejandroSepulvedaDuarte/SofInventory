"""Configuración aislada para ejecutar la suite sin depender de PostgreSQL."""

from .settings import *  # noqa: F403


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# La suite hace muchos logins; solo los tests de throttling reducen esta tasa.
LOGIN_THROTTLE_RATE = '10000/min'
