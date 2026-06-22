from django.apps import AppConfig


class UsuariosConfig(AppConfig):
    name = 'usuarios'

    def ready(self):
        # Import signal handlers to seed initial user data after migrations.
        from . import signals  # noqa: F401
