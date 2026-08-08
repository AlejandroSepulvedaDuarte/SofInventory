"""
Validadores de contraseña en español basados en los oficiales de Django.

Se usan en AUTH_PASSWORD_VALIDATORS y, a través de
django.contrib.auth.password_validation.validate_password, en la creación
y actualización de usuarios por el API (UsuarioSerializer).

Los mensajes se fijan en __init__ porque los validadores de Django los
asignan ahí, lo que de otra forma anularía cualquier atributo de clase.
"""

from django.contrib.auth.password_validation import (
    CommonPasswordValidator as DjangoCommonPasswordValidator,
    MinimumLengthValidator as DjangoMinimumLengthValidator,
    NumericPasswordValidator as DjangoNumericPasswordValidator,
    UserAttributeSimilarityValidator as DjangoUserAttributeSimilarityValidator,
)


class UserAttributeSimilarityValidator(DjangoUserAttributeSimilarityValidator):
    def get_error_message(self):
        return 'La contraseña es demasiado similar a tu %(verbose_name)s.'


class MinimumLengthValidator(DjangoMinimumLengthValidator):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.message = 'La contraseña es demasiado corta. Debe contener al menos %(min_length)d caracteres.'


class CommonPasswordValidator(DjangoCommonPasswordValidator):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.message = 'La contraseña es demasiado común.'


class NumericPasswordValidator(DjangoNumericPasswordValidator):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.message = 'La contraseña no puede ser completamente numérica.'
