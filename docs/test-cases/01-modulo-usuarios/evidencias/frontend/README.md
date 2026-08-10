# Evidencias frontend — Usuarios

> **Actualizado:** 8 de agosto de 2026

## Evidencias vigentes

| Archivo | Casos relacionados | Contenido verificado |
|---|---|---|
| `USR-formulario-ayuda-crear.png` | TC-USR-001, TC-USR-008 | Modal Nuevo Usuario en escritorio, botón Ayuda y panel “Ayuda para registrar un usuario” |
| `USR-formulario-ayuda-editar-movil.png` | TC-USR-001, TC-USR-008 | Panel móvil “Ayuda para actualizar un usuario” usando un registro ficticio existente, sin guardar cambios |
| `USR-validaciones-obligatorios-movil.png` | TC-USR-002, TC-USR-008 | Resumen y errores por campo al intentar guardar el formulario vacío; no hubo solicitud al backend |

Las capturas fueron tomadas sobre la interfaz servida por Docker. Las pruebas posteriores de duplicados, bloqueo, estado, desbloqueo y eliminación se ejecutaron en PostgreSQL E2E con cuentas ficticias y se documentan como `API`/`DB-R`, sin añadir capturas redundantes ni credenciales.

## Evidencias históricas

Los archivos `TC-USR-001-frontend.png` a `TC-USR-008-frontend.png` se conservan para trazabilidad. No se consideran evidencia vigente porque corresponden a una versión anterior y algunos documentan defectos ya corregidos.

## Criterios de seguridad

- No capturar contraseñas, tokens, almacenamiento del navegador ni encabezados de autorización.
- Preferir registros claramente ficticios; no publicar listados con datos personales.
- Reutilizar una captura para varios casos cuando demuestre el mismo comportamiento visual.
