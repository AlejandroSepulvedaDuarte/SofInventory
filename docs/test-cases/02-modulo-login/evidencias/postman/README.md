# Evidencias API — Login y sesiones

> **Actualizado:** 8 de agosto de 2026

No se generaron capturas nuevas de Postman. Las pruebas actuales se ejecutaron con el cliente de pruebas de Django dentro del contenedor backend.

## Contrato actual

| Operación | Método y ruta | Resultado principal |
|---|---|---|
| Login válido | `POST /api/auth/login/` | 200, token propio, expiración y usuario público |
| Credenciales inválidas | `POST /api/auth/login/` | 401 genérico dentro del límite |
| Cuenta inactiva o bloqueada | `POST /api/auth/login/` | 403 controlado |
| Límite de solicitudes | `POST /api/auth/login/` | 429 cuando se supera la tasa |
| Perfil | `GET /api/auth/me/` | 200 con sesión válida; rechazo sin sesión |
| Logout | `POST /api/auth/logout/` | 200 e invalidación de la sesión actual |

## Reglas para futuras evidencias

- Sustituir cualquier token por `<token-redactado>`.
- No mostrar contraseñas, cookies, encabezados completos ni datos personales.
- Para sesión única y logout, preferir aserciones automatizadas y consultas agregadas de solo lectura.
- Registrar la discrepancia 401/403 de expiración hasta que el contrato frontend/backend quede definido.

Los archivos `TC-LOGIN-001-postman.png` a `TC-LOGIN-010-postman.png` son históricos y no prueban el estado actual por sí solos.
