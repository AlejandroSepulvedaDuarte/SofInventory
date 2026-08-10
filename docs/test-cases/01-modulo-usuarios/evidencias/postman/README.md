# Evidencias API — Usuarios

> **Actualizado:** 8 de agosto de 2026

No se generaron capturas nuevas de Postman en esta actualización. La evidencia vigente de automatización es el resultado de 26/26 pruebas del módulo `usuarios` ejecutadas dentro del contenedor backend con una base SQLite en memoria.

## Endpoints actuales

| Operación | Método y ruta | Rol |
|---|---|---|
| Crear | `POST /api/usuarios/crear/` | Administrador |
| Listar | `GET /api/usuarios/listar/` | Administrador |
| Editar | `PUT /api/usuarios/editar/<id>/` | Administrador |
| Cambiar estado | `PATCH /api/usuarios/estado/<id>/` | Administrador |
| Desbloquear | `POST /api/usuarios/desbloquear/<id>/` | Administrador |
| Eliminar | `DELETE /api/usuarios/eliminar/<id>/` | Administrador |
| Auditoría | `GET /api/usuarios/auditoria/` | Administrador |
| Reporte de roles | `GET /api/roles/reporte/` | Administrador |

## Reglas para futuras evidencias

- Mostrar método, ruta, código HTTP y cuerpo sanitizado.
- Ocultar por completo `Authorization`, tokens, contraseñas, cookies y datos personales.
- No usar capturas para probar unicidad, hash o atomicidad cuando una aserción automatizada sea suficiente.
- Marcar fecha, versión del contenedor y resultado; no reutilizar una imagen histórica como aprobación actual.

Los archivos `TC-USR-001-postman.png` a `TC-USR-008-postman.png` son históricos y están pendientes de reemplazo o retiro después de una reejecución API aislada.
