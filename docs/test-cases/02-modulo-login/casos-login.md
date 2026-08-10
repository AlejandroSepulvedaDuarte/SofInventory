# Casos de prueba — Login y sesiones

> **Prefijo:** TC-LOGIN · **Cobertura mínima consolidada:** 7 casos · **Ejecución final:** 6 aprobados, 1 fallido · **Fecha:** 8 de agosto de 2026

## Convenciones

- `A`: prueba automatizada ejecutada y aprobada en esta revisión.
- `P`: cobertura parcial; falta una variante importante.
- `M`: falta automatización.
- `V`: verificación manual o visual ejecutada.
- Las evidencias históricas no se usan para afirmar un resultado actual.

## Matriz actual

| ID | Nombre | Tipo | Funcionalidad | Precondiciones y rol | Datos ficticios | Resultado esperado | Automatización ejecutada | Brecha pendiente | Evidencia actual | Prioridad | Estado 08/08/2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-LOGIN-001 | Iniciar sesión correctamente | Positivo / integración | Token propio, expiración, usuario público y acceso al Dashboard | Usuario activo de cualquier rol | Credencial válida administrada fuera de la documentación | HTTP 200; sesión de 12 horas; respuesta sin contraseña; redirección a Dashboard | `A` — `AutenticacionAPITests.test_login_retorna_token_y_usuario`; `LoginThrottlingTests.test_login_correcto_funciona_dentro_del_limite` | Falta parametrizar todos los roles | AUTO + [Dashboard móvil](./evidencias/frontend/LOGIN-acceso-exitoso-dashboard-movil.png) | Crítica | Aprobado en backend y manualmente |
| TC-LOGIN-002 | Rechazar credenciales inválidas sin enumerar usuarios | Negativo / seguridad | Mensaje genérico, contador por cuenta existente y limitación por IP | Sin sesión | Usuario inexistente o contraseña ficticia inválida | 401 genérico durante el límite; 429 al exceder el throttle; nunca se devuelve información sensible | `A` — pruebas de intentos/429; quinto intento y bloqueo ejecutados en E2E | Falta automatizar el bloqueo exacto | AUTO + [Error móvil](./evidencias/frontend/LOGIN-error-movil-claro.png) | Crítica | Aprobado |
| TC-LOGIN-003 | Rechazar cuenta inactiva o bloqueada | Seguridad | Estados de cuenta y mensajes controlados | Usuario inactivo y usuario bloqueado preparados en una base aislada | Credenciales válidas de cuentas de prueba | HTTP 403; no crea sesión; bloqueada informa que requiere administrador | `M` — ambos estados ejecutados por API/DB-R E2E | Automatizar ambos estados | AUTO + API sanitizada | Crítica | Aprobado |
| TC-LOGIN-004 | Invalidar la sesión anterior al volver a entrar | Seguridad / integración | Una sola sesión activa por usuario | Usuario activo con una sesión vigente | Dos logins secuenciales | Segundo login crea token nuevo; el token anterior queda inactivo y ya no autoriza | `P` — reemplazo ejecutado por API/DB-R E2E | Agregar prueba automatizada dedicada | AUTO + DB-R | Alta | Aprobado |
| TC-LOGIN-005 | Proteger rutas y consultar `/me` | Permisos / seguridad | Ausencia, formato o validez del Bearer; usuario autenticado | Con y sin sesión válida | Sin header, token ficticio y sesión válida | Sin autenticación se rechaza; sesión válida devuelve solo datos públicos; rol no se confía al cliente | `A` — `/me`, permisos y navegación manual ejecutados | Falta prueba Angular automatizada de guards | AUTO + API sanitizada | Crítica | Aprobado |
| TC-LOGIN-006 | Cerrar sesión e invalidar token | Positivo / seguridad | Logout del backend y limpieza local del frontend | Sesión válida | Sin datos adicionales | HTTP 200; sesión queda inactiva; frontend borra datos de sesión y vuelve a Login | `A` — `AutenticacionAPITests.test_logout_invalida_token` | Falta test unitario/E2E de `AuthService.logout` | AUTO + verificación manual | Crítica | Aprobado en backend y manualmente |
| TC-LOGIN-007 | Gestionar sesión expirada | Seguridad / interfaz | Expiración backend, invalidación y redirección frontend | Sesión con reloj/expiración controlados en ambiente aislado | Token expirado ficticio | Backend invalida; frontend limpia sesión, informa y redirige sin dejar vistas vacías | `M/P` — expiración API E2E ejecutada; sesión se invalida, pero responde 403 | Corregir/definir contrato 401/403 y automatizar interceptor | AUTO + API sanitizada + MAN | Crítica | Falló (`BUG-LOGIN-001`) |

## Ejecuciones realizadas

### Backend

```text
docker exec sofinventory_final_backend python manage.py test usuarios --settings=config.test_settings --verbosity 2
Resultado: 26 pruebas ejecutadas, 26 aprobadas, 0 fallos.
Base: SQLite en memoria; no se modificó PostgreSQL operativo.
```

### Frontend

```text
docker run --rm --mount type=bind,source=<repositorio>,target=/workspace,readonly \
  -w /workspace/frontend node:20-alpine npm test
Resultado: 24 pruebas ejecutadas, 24 aprobadas, 0 fallos.
```

La suite frontend actual no contiene pruebas Angular específicas de Login, guards o interceptor; sus 24 casos cubren ayuda contextual, ubicación y validadores semánticos.

## Verificación manual segura

| Comprobación | Resultado | Observación |
|---|---|---|
| Login Oscuro a 1280×720 | Aprobado | Campos, visibilidad de contraseña y selector de tema legibles |
| Error Claro a 390×844 | Aprobado | Mensaje genérico, contraseña enmascarada y sin desbordamiento horizontal |
| Acceso administrativo | Aprobado | Redirección al Dashboard y navegación administrativa disponible |
| Logout | Aprobado | Regreso a Login; no se dejó sesión abierta al terminar |

La ejecución final posterior preparó cuentas ficticias en un entorno E2E aislado: se comprobaron bloqueo tras cinco fallos, cuenta inactiva, reemplazo de sesión, logout y expiración controlada.

## Evidencia histórica

Los antiguos casos `TC-LOGIN-001` a `TC-LOGIN-010` y sus imágenes permanecen en las carpetas de evidencia para trazabilidad. Sus fechas, versiones y resultados no representan automáticamente el estado actual.

## Resultado final de ejecución

| Total | Aprobados | Fallidos |
|---:|---:|---:|
| 7 | 6 | 1 |

TC-LOGIN-001 a TC-LOGIN-006 aprobaron. TC-LOGIN-007 falló porque una sesión expirada devuelve 403 y el interceptor solo gestiona 401 (`BUG-LOGIN-001`). Ver [resultados trazables](../RESULTADOS_EJECUCION_2026-08-08.md#login-y-sesiones).
