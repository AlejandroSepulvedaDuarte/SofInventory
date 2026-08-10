# Módulo 01 — Usuarios, roles y permisos

> **Versión documental:** 3.0.0 <br>
> **Fecha de actualización:** 8 de agosto de 2026 <br>
> **Estado:** actualizado contra el código y la interfaz actuales

## 1. Descripción

El módulo permite a un `Administrador` listar, crear, editar, activar/inactivar, desbloquear y eliminar usuarios, además de consultar reportes de roles y auditoría. Los roles vigentes son `Administrador`, `Supervisor`, `Bodega` y `Vendedor`. El backend es la fuente de verdad de permisos: ocultar opciones en la interfaz no reemplaza la validación del servidor.

La contraseña se almacena mediante los hashers configurados por Django y nunca se devuelve en respuestas. Al crear o cambiar una contraseña se aplican los validadores de Django, coincidencia de confirmación y rechazo de una contraseña que ya esté siendo usada por otra cuenta. En edición, dejar ambos campos de contraseña vacíos conserva la credencial actual.

## 2. Funcionalidades actuales

| Funcionalidad | Acceso |
|---|---|
| Crear, listar, editar, cambiar estado, desbloquear y eliminar usuarios | Solo Administrador |
| Reporte de roles y auditoría | Solo Administrador |
| Listar catálogo de roles y tipos de documento | Usuario autenticado |
| Iniciar sesión y consultar perfil propio | Según reglas del módulo Login |

El sistema impide eliminar al único Administrador y registra eventos de creación, edición, cambio de rol, cambio de estado, desbloqueo y eliminación sin incluir contraseñas ni tokens.

## 3. Formulario actual

El formulario contiene tipo y número de documento, nombre completo, correo, nombre de usuario, contraseña y confirmación, rol, fecha de creación y observaciones. En edición, las contraseñas son opcionales. La ayuda contextual usa títulos distintos para “registrar” y “actualizar”, se adapta a móvil y `Esc` cierra únicamente el panel de ayuda.

## 4. Resultado actual

| Verificación | Resultado |
|---|---|
| Suite backend completa | 99/99 en SQLite y 99/99 en PostgreSQL 15 aislado |
| Suite frontend completa | 24/24 pruebas aprobadas en Node.js 20 dentro de Docker |
| Alta, duplicados, estado, bloqueo, desbloqueo y eliminación | Aprobados por API/DB-R con cuentas ficticias E2E |
| Formulario de creación/edición y ayuda | Aprobado manualmente en escritorio/móvil |
| `Esc` y retorno de foco | Aprobado manualmente |
| Validaciones obligatorias | Aprobado manualmente; no se realizó solicitud al backend |
| Buscador del listado | Falló manualmente; el texto cambia, pero la tabla no se filtra (`BUG-USR-003`) |
| Resultado del módulo | **7 aprobados, 1 fallido** |

## 5. Evidencias vigentes

- [Ayuda al registrar Usuario — escritorio](./evidencias/frontend/USR-formulario-ayuda-crear.png)
- [Ayuda al actualizar Usuario — móvil](./evidencias/frontend/USR-formulario-ayuda-editar-movil.png)
- [Validaciones obligatorias — móvil](./evidencias/frontend/USR-validaciones-obligatorios-movil.png)
- [Índice de evidencias frontend](./evidencias/frontend/README.md)

Las capturas `TC-USR-001` a `TC-USR-008` se conservan como evidencia histórica y no se consideran revalidadas en esta ejecución.

## 6. Documentos relacionados

- [Casos actuales de Usuarios](./casos-usuarios.md)
- [Login y sesiones](../02-modulo-login/README.md)
- [Matriz general](../MATRIZ_COBERTURA.md)
- [Resultados finales](../RESULTADOS_EJECUCION_2026-08-08.md#usuarios-roles-y-permisos)
- [Defectos](../DEFECTOS.md)
