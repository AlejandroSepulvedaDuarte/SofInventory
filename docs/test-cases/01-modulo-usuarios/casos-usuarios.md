# Casos de prueba — Usuarios, roles y permisos

> **Prefijo:** TC-USR · **Cobertura mínima:** 8 casos · **Ejecución final:** 7 aprobados, 1 fallido · **Fecha:** 8 de agosto de 2026

## Convenciones

- `A`: prueba automatizada ejecutada y aprobada en esta revisión.
- `P`: cobertura parcial; falta una variante importante.
- `M`: falta automatización.
- `V`: verificación manual o visual ejecutada.
- Ninguna captura sustituye una prueba de permisos o persistencia.

## Matriz actual

| ID | Nombre | Tipo | Funcionalidad | Precondiciones y rol | Datos ficticios | Resultado esperado | Automatización ejecutada | Brecha pendiente | Evidencia actual | Prioridad | Estado 08/08/2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-USR-001 | Crear y editar usuario válido | Positivo / integración | Alta y actualización con catálogos reales; contraseña opcional al editar | Administrador autenticado; roles y tipos cargados | Persona, documento, correo y username reservados para prueba | Crear: 201; editar: 200; datos normalizados; contraseña nunca se devuelve; edición sin contraseña conserva la existente | `A/P` — pruebas backend y flujo E2E aislado ejecutados | Falta consolidar CRUD completo en una sola prueba automatizada | AUTO + API sanitizada + ayuda visual | Crítica | Aprobado |
| TC-USR-002 | Validar obligatorios y semántica | Negativo / interfaz | Documento por tipo, nombre humano, username sin espacios y mensajes por campo | Administrador; formulario nuevo | Vacíos, espacios, nombre con números, username con espacios y pasaporte alfanumérico válido | La interfaz bloquea envío inválido; backend devuelve 400 por campo; valores legítimos con tildes/apóstrofos/guiones se aceptan | `A` — pruebas semánticas de `AutenticacionAPITests`; 7/7 casos de `semantic-validators.test.mjs` aprobados | Falta test Angular de directivas/foco al primer error | AUTO + [Validaciones móvil](./evidencias/frontend/USR-validaciones-obligatorios-movil.png) | Alta | Aprobado en backend y manualmente para vacíos |
| TC-USR-003 | Rechazar duplicados | Negativo / integración | Unicidad de username, correo y número de documento | Registros equivalentes en base aislada; Administrador | Variantes duplicadas de los tres identificadores | HTTP 400 por el campo correcto; no se crea ni altera otro usuario | `M/P` — sin método dedicado; tres variantes ejecutadas por API E2E | Automatizar los tres duplicados | AUTO + API + DB-R | Crítica | Aprobado |
| TC-USR-004 | Aplicar política de contraseña | Seguridad | Requerida al crear, confirmación, validadores Django, no reutilización y cambio opcional | Administrador; otra cuenta existente para reutilización | Corta, numérica, común, similar al username, reutilizada y fuerte | Débiles/reutilizadas se rechazan; fuerte se acepta; el hash no se expone; edición vacía conserva contraseña | `A` — 6/6 pruebas de `ValidacionFortalezaContrasenaTests` aprobadas | Falta prueba dedicada de reutilización entre cuentas y confirmación desigual | AUTO + API sanitizada; nunca capturar contraseña | Crítica | Aprobado para reglas automatizadas actuales |
| TC-USR-005 | Aplicar roles y evitar escalación | Permisos / seguridad | Endpoints administrativos, operaciones de Vendedor y manipulación de `rol_solicitante` | Administrador y Vendedor en base aislada | Solicitud del Vendedor declarando rol Administrador | Vendedor recibe 403 en administración y no escala; Administrador opera; permisos se deciden en backend | `A` — 4/4 pruebas de `AutorizacionRolTests` y `test_permiso_admin_bloquea_vendedor_en_creacion_usuarios` aprobadas | Ampliar matriz a Supervisor y Bodega por módulo | AUTO + API sanitizada | Crítica | Aprobado para Administrador/Vendedor |
| TC-USR-006 | Cambiar estado, bloquear y desbloquear | Seguridad / integración | Inactivación revoca sesiones; bloqueo por cinco fallos; desbloqueo limpia intentos y audita | Administrador y cuenta objetivo aislada | Cinco contraseñas incorrectas, cambio activo/inactivo y desbloqueo | Cuenta bloqueada/inactiva no entra; sesiones activas se invalidan; desbloqueo solo Administrador | `M/P` — ciclo completo ejecutado por API/DB-R E2E | Automatizar el ciclo completo | AUTO + API + DB-R | Crítica | Aprobado |
| TC-USR-007 | Auditar y eliminar de forma segura | Seguridad / integración | Eventos sin secretos, eliminación, sesiones y protección del único Administrador | Administrador; usuario eliminable y único Administrador en base aislada | Usuario ficticio sin dependencias y acciones administrativas | Auditoría registra actor/objetivo/acción sin password/token; único Administrador no se elimina; relaciones protegidas producen error controlado | `A/P` — auditoría automatizada; eliminación libre y protección del único Administrador ejecutadas en E2E | Automatizar todas las variantes | AUTO + API + DB-R | Crítica | Aprobado |
| TC-USR-008 | Usar listado y formulario accesibles/responsive | Interfaz | Listado, búsqueda, crear/editar, ayuda, teclado, foco, temas y móvil | Administrador; usuario ficticio existente `codex_ui_test` para abrir edición | Texto de búsqueda y campos no enviados | Ayuda muestra “registrar”/“actualizar”; móvil solo icono en encabezado; `Esc` cierra ayuda y conserva modal/datos; búsqueda filtra filas | `A/P` — 9/9 pruebas de `form-help.test.mjs` aprobadas; verificación manual de ayuda y foco aprobada | Falta test Angular/E2E; búsqueda falla actualmente | AUTO + [Crear](./evidencias/frontend/USR-formulario-ayuda-crear.png) + [Editar móvil](./evidencias/frontend/USR-formulario-ayuda-editar-movil.png) | Alta | Ayuda aprobada; búsqueda fallida (`BUG-USR-003`) |

## Ejecuciones realizadas

### Backend

```text
docker exec sofinventory_final_backend python manage.py test usuarios --settings=config.test_settings --verbosity 2
Resultado: 26 pruebas ejecutadas, 26 aprobadas, 0 fallos.
Base: SQLite en memoria; PostgreSQL operativo no fue alterado por la suite.
```

### Frontend

```text
docker run --rm --mount type=bind,source=<repositorio>,target=/workspace,readonly \
  -w /workspace/frontend node:20-alpine npm test
Resultado: 24 pruebas ejecutadas, 24 aprobadas, 0 fallos.
```

Los tests frontend son pruebas Node de funciones y fuente; la interacción DOM se verificó manualmente, pero todavía necesita una suite Angular/E2E.

## Verificación manual sin cambios de datos

| Comprobación | Resultado |
|---|---|
| Abrir Nuevo Usuario y ayuda “registrar” en escritorio | Aprobado |
| Abrir edición del usuario ficticio existente y ayuda “actualizar” en móvil | Aprobado |
| Pulsar `Esc` con la ayuda abierta | Aprobado: ayuda cerrada, modal abierto y foco devuelto al botón |
| Guardar formulario vacío | Aprobado: resumen y mensajes por campo; no hubo solicitud de creación |
| Buscar `codex_ui_test` | Falló: el campo cambia, pero permanecen las nueve filas |

Esa primera comprobación visual no hizo escrituras. La ejecución final posterior sí cubrió alta/duplicados, cambio de estado, bloqueo, desbloqueo y eliminación sobre cuentas exclusivamente ficticias en PostgreSQL E2E aislado.

## Evidencia histórica

Los antiguos casos `TC-USR-001` a `TC-USR-008` y sus imágenes permanecen disponibles para trazabilidad. Sus afirmaciones sobre contraseñas débiles y documentos inválidos quedaron superadas por el código y la suite actual; consultar `DEFECTOS.md`.

## Resultado final de ejecución

| Total | Aprobados | Fallidos |
|---:|---:|---:|
| 8 | 7 | 1 |

TC-USR-001 a TC-USR-007 aprobaron. TC-USR-008 falló únicamente en la búsqueda no reactiva (`BUG-USR-003`); ayuda, accesibilidad y responsive aprobaron. Ver [resultados trazables](../RESULTADOS_EJECUCION_2026-08-08.md#usuarios-roles-y-permisos).
