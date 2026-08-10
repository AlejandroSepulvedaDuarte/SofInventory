# Módulo 02 — Login y sesiones

> **Versión documental:** 3.0.0 <br>
> **Fecha de actualización:** 8 de agosto de 2026 <br>
> **Estado:** actualizado contra el código y la interfaz actuales

## 1. Descripción

Login autentica por nombre de usuario y contraseña. El backend crea un token Bearer propio asociado a `sesiones_api`, con vigencia de 12 horas, invalida las sesiones activas anteriores del mismo usuario y rechaza cuentas inactivas o bloqueadas. El frontend conserva temporalmente token, expiración y usuario en `localStorage`, protege rutas mediante guards y elimina esa información al cerrar sesión.

La respuesta no debe exponer si un nombre de usuario inexistente o una contraseña incorrecta causaron el rechazo. Tras cinco contraseñas incorrectas para una cuenta existente, el backend bloquea la cuenta. Además, el endpoint tiene limitación de solicitudes configurable; el valor predeterminado es `5/min`.

## 2. Acceso y endpoints actuales

| Operación | Método y ruta | Acceso |
|---|---|---|
| Iniciar sesión | `POST /api/auth/login/` | Público, con limitación de solicitudes |
| Consultar sesión propia | `GET /api/auth/me/` | Sesión Bearer válida |
| Cerrar sesión | `POST /api/auth/logout/` | Sesión Bearer válida |

SofInventory no usa JWT. Nunca deben incluirse tokens completos, contraseñas ni encabezados `Authorization` en capturas o documentación.

## 3. Ambiente verificado

| Capa | Versión o condición |
|---|---|
| Backend del contenedor | Python 3.12.13, Django 6.0.4, DRF 3.17.1 |
| Base de datos operativa | PostgreSQL 15.18 |
| Frontend servido | Nginx 1.31.3, compilación Angular 19.2.21 |
| Suite frontend | Node.js 20.20.2 en contenedor temporal `node:20-alpine` |
| Verificación visual | 1280×720 y 390×844; temas Oscuro y Claro |
| Fecha | 8 de agosto de 2026 |

## 4. Resultado actual

| Verificación | Resultado |
|---|---|
| Suite backend completa | 99/99 en SQLite y 99/99 en PostgreSQL 15 aislado |
| Suite frontend completa | 24/24 pruebas aprobadas con el repositorio montado en solo lectura |
| Login con cuenta administrativa existente | Aprobado manualmente; redirección al Dashboard |
| Credenciales ficticias inexistentes | Aprobado manualmente; mensaje genérico y sin datos sensibles |
| Logout | Aprobado manualmente; regreso a Login |
| Bloqueo tras cinco fallos y cuenta inactiva | Aprobado por API/DB-R con cuentas ficticias |
| Reemplazo de sesión | Aprobado: la segunda invalidó la primera y quedó una sola activa |
| Responsive y temas del Login | Aprobado manualmente en Oscuro/escritorio y Claro/móvil |
| Expiración gestionada por frontend | Falló: backend invalida, pero devuelve 403 y el interceptor solo gestiona 401 (`BUG-LOGIN-001`) |
| Resultado del módulo | **6 aprobados, 1 fallido** |

La validación de sesiones y bloqueo se realizó también en PostgreSQL 15.18 aislado; no se usó la base operativa.

## 5. Evidencias vigentes

- [Login actual — escritorio, tema Oscuro](./evidencias/frontend/LOGIN-actual-escritorio-oscuro.png)
- [Error genérico — móvil, tema Claro](./evidencias/frontend/LOGIN-error-movil-claro.png)
- [Acceso exitoso — Dashboard móvil](./evidencias/frontend/LOGIN-acceso-exitoso-dashboard-movil.png)
- [Índice de evidencias frontend](./evidencias/frontend/README.md)

Las capturas `TC-LOGIN-001` a `TC-LOGIN-010` se conservan como evidencia histórica y no se consideran revalidadas en esta ejecución.

## 6. Documentos relacionados

- [Casos actuales de Login](./casos-login.md)
- [Usuarios](../01-modulo-usuarios/README.md)
- [Matriz general](../MATRIZ_COBERTURA.md)
- [Resultados finales](../RESULTADOS_EJECUCION_2026-08-08.md#login-y-sesiones)
- [Defectos](../DEFECTOS.md)
