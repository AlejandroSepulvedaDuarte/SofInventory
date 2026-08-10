# Evidencias frontend — Login

> **Actualizado:** 8 de agosto de 2026

## Evidencias vigentes

| Archivo | Casos relacionados | Contenido verificado |
|---|---|---|
| `LOGIN-actual-escritorio-oscuro.png` | TC-LOGIN-001 | Pantalla actual de Login a 1280×720 en tema Oscuro |
| `LOGIN-error-movil-claro.png` | TC-LOGIN-002 | Mensaje genérico de credenciales inválidas a 390×844 en tema Claro; contraseña enmascarada |
| `LOGIN-acceso-exitoso-dashboard-movil.png` | TC-LOGIN-001, TC-LOGIN-005 | Redirección al Dashboard después de autenticar una cuenta administrativa existente |

El cierre de sesión también se comprobó manualmente y devolvió la navegación a Login. Bloqueo, inactivación, reemplazo y expiración se acreditan con resultados API/DB-R sanitizados; la sesión de verificación quedó cerrada al finalizar.

## Evidencias históricas

Los archivos `TC-LOGIN-001-frontend.png` a `TC-LOGIN-010-frontend.png` se conservan para trazabilidad, pero no se consideran revalidados. Algunas imágenes describen una interfaz, mensajes o defectos anteriores.

## Criterios de seguridad

- No capturar tokens, contraseñas visibles, DevTools con almacenamiento ni encabezados `Authorization`.
- Usar credenciales ficticias para errores y enmascarar siempre la contraseña.
- Los estados bloqueado/inactivo solo se prueban con cuentas ficticias en un entorno aislado; su evidencia principal es API/DB-R.
