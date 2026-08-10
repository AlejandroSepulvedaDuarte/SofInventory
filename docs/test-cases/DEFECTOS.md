# Registro de defectos — SofInventory

> **Versión:** 3.0.0 · **Actualizado:** 8 de agosto de 2026

## Resumen

| Total registrados | Abiertos | Resueltos/revalidados | Crítica | Alta | Media |
|---:|---:|---:|---:|---:|---:|
| 11 | 9 | 2 | 2 | 4 | 3 |

## Defectos abiertos

### BUG-LOGIN-001 — La expiración puede devolver 403 y el interceptor solo gestiona 401

| Campo | Detalle |
|---|---|
| Módulo | Login / frontend compartido |
| Caso relacionado | TC-LOGIN-007 |
| Severidad | Media |
| Prioridad | Alta |
| Estado | Abierto; reproducido con expiración controlada el 8 de agosto de 2026 |
| Evidencia ejecutada | Una sesión ficticia se forzó a expirar en PostgreSQL: `/api/auth/me/` devolvió 403 y marcó la sesión inactiva. `authInterceptor` llama `handleUnauthorized()` únicamente para 401 fuera de Login/Logout. |
| Impacto | El usuario puede permanecer en una vista protegida sin una explicación clara cuando la sesión expira. |
| Resultado esperado | Backend y frontend comparten un contrato explícito; cualquier expiración limpia la sesión local, informa al usuario y redirige a Login. |
| Prueba requerida | Corregir o formalizar el contrato 401/403 y agregar prueba Angular/E2E del interceptor; repetir TC-LOGIN-007 y TC-FE-007. |

### BUG-USR-003 — El buscador de Usuarios no filtra la tabla

| Campo | Detalle |
|---|---|
| Módulo | Usuarios / frontend |
| Caso relacionado | TC-USR-008 |
| Severidad | Media |
| Prioridad | Media |
| Estado | Abierto; reproducido el 8 de agosto de 2026 |
| Pasos seguros | En el entorno E2E, ingresar un texto sin coincidencias en el buscador del listado sin ejecutar otra operación. |
| Resultado obtenido | El campo conservó el texto, pero las dos filas ficticias continuaron visibles. |
| Evidencia de código | `filteredUsuarios` es un `computed` que lee `searchTerm`, mientras `searchTerm` es una propiedad ordinaria y no una señal reactiva. |
| Resultado esperado | La tabla muestra únicamente usuarios cuyo username, nombre o correo coincida. |
| Alcance | Solo interfaz; no modifica permisos ni datos. |

### BUG-PRD-001 — El alta de Producto devuelve 500 por `quitar_imagen`

| Campo | Detalle |
|---|---|
| Módulo | Productos |
| Caso relacionado | TC-PRD-001; bloquea la parte HTTP de TC-PRD-002 |
| Severidad | Crítica |
| Prioridad | Crítica |
| Estado | Abierto; reproducido por interfaz y API el 8 de agosto de 2026 |
| Resultado obtenido | Un Producto válido muestra error genérico y `/api/productos/crear/` devuelve 500. |
| Causa localizada | `ProductoEscrituraSerializer` agrega `quitar_imagen` a `validated_data`; `crear_producto` convierte esos datos a `dict` y los pasa a `Producto.objects.create` sin retirar el campo no perteneciente al modelo. |
| Evidencia | [PRD-alta-error-e2e.png](./04-modulo-productos/evidencias/frontend/PRD-alta-error-e2e.png) y traza sanitizada `TypeError: Producto() got unexpected keyword arguments: 'quitar_imagen'`. |
| Resultado esperado | Alta 201, stock inicial 0 y ningún campo auxiliar enviado al modelo. |

### BUG-PRV-001 — Eliminar un Proveedor relacionado devuelve 500

| Campo | Detalle |
|---|---|
| Módulo | Proveedores |
| Caso relacionado | TC-PRV-005 |
| Severidad | Alta |
| Prioridad | Alta |
| Estado | Abierto; reproducido por API E2E |
| Resultado obtenido | Proveedor libre: 200; Vendedor: 403; Proveedor con Compras: 500. El registro y sus Compras permanecieron intactos. |
| Causa localizada | `eliminar_proveedor` no captura `django.db.models.deletion.ProtectedError`. |
| Resultado esperado | Respuesta 400/409 controlada, mensaje en español y conservación de la relación. |

### BUG-CLI-001 — Eliminar un Cliente relacionado devuelve 500

| Campo | Detalle |
|---|---|
| Módulo | Clientes |
| Caso relacionado | TC-CLI-006 |
| Severidad | Alta |
| Prioridad | Alta |
| Estado | Abierto; reproducido por API E2E |
| Resultado obtenido | Cliente libre: 200; Vendedor: 403; Cliente con Ventas: 500. El registro y sus Ventas permanecieron intactos. |
| Causa localizada | `eliminar_cliente` no captura `ProtectedError`. |
| Resultado esperado | Respuesta 400/409 controlada, mensaje en español y conservación de la relación. |

### BUG-COM-001 — Compras acepta Productos inactivos

| Campo | Detalle |
|---|---|
| Módulo | Compras / Inventario |
| Caso relacionado | TC-COM-004 |
| Severidad | Crítica |
| Prioridad | Crítica |
| Estado | Abierto; reproducido y revertido en E2E |
| Resultado obtenido | Con Proveedor y Almacén activos, una Compra con Producto inactivo devolvió 201 e incrementó stock. La Compra ficticia se anuló inmediatamente y el stock original quedó restaurado. |
| Causa localizada | `registrar_compra` comprueba estado del Proveedor y Almacén, pero no `producto.estado`. |
| Resultado esperado | Rechazo 400 antes de crear cabecera, detalle o movimiento. |

### BUG-VTA-001 — Métodos de pago no exigen datos condicionales

| Campo | Detalle |
|---|---|
| Módulo | Ventas |
| Caso relacionado | TC-VTA-004 |
| Severidad | Alta |
| Prioridad | Alta |
| Estado | Abierto; reproducido y revertido en E2E |
| Resultado obtenido | Efectivo insuficiente se rechazó, pero una Venta con método Débito y sin últimos cuatro dígitos ni aprobación devolvió 201. La Venta ficticia se anuló y el stock quedó restaurado. |
| Causa localizada | `MetodoPagoSerializer` declara campos opcionales, pero no implementa validación cruzada según `metodo`. |
| Resultado esperado | Cada método exige únicamente sus datos aplicables y rechaza campos obligatorios ausentes. |

### BUG-EMP-001 — Empresa acepta NIT y teléfono semánticamente inválidos

| Campo | Detalle |
|---|---|
| Módulo | Empresa |
| Caso relacionado | TC-EMP-003 |
| Severidad | Alta |
| Prioridad | Alta |
| Estado | Abierto; reproducido y restaurado en E2E |
| Resultado obtenido | Un PATCH con NIT `x` y teléfono alfabético devolvió 200. La configuración ficticia original se restauró inmediatamente. |
| Causa localizada | `validate_nit` solo exige un texto no vacío y no existe validador específico de teléfono. |
| Resultado esperado | Rechazo 400 por campo con formatos coherentes con los formularios actuales. |

### BUG-DSH-001 — Dashboard expone un mensaje HTTP técnico ante indisponibilidad

| Campo | Detalle |
|---|---|
| Módulo | Dashboard / notificaciones compartidas |
| Caso relacionado | TC-DSH-005, TC-FE-007 |
| Severidad | Media |
| Prioridad | Media |
| Estado | Abierto; reproducido deteniendo solo el backend E2E |
| Resultado obtenido | Después de un 502, la vista mostró literalmente `Http failure response for ... 502 Bad Gateway`. Los datos previos permanecieron visibles. |
| Impacto | Expone terminología técnica y no ofrece una orientación clara al usuario final. |
| Resultado esperado | Mensaje breve en español, acción de reintento y detalle técnico reservado para logs. |

## Defectos resueltos o superados

### BUG-USR-001 — Formato de número de documento

| Campo | Detalle |
|---|---|
| Estado | Resuelto en el código actual; evidencia histórica desactualizada |
| Corrección observada | `UsuarioSerializer.validate_numero_documento` usa reglas según tipo de documento y valida unicidad; el frontend comparte validadores semánticos. |
| Evidencia | Suite frontend: 7/7 pruebas semánticas aprobadas. Suite backend `usuarios`: 26/26 aprobadas. |
| Pendiente menor | Agregar prueba backend dedicada para cada tipo de documento y sus fronteras. |

### BUG-USR-002 — Ausencia de política de contraseñas

| Campo | Detalle |
|---|---|
| Estado | Resuelto y revalidado automáticamente |
| Corrección observada | `UsuarioSerializer` aplica validadores de Django, confirmación, hash y rechazo de contraseña ya utilizada por otra cuenta. |
| Evidencia | 6/6 métodos de `ValidacionFortalezaContrasenaTests` aprobados dentro del contenedor backend. |
| Seguridad documental | Ninguna evidencia debe mostrar una contraseña ni el hash completo. |

## Nota sobre evidencia histórica

Las capturas antiguas que muestran documentos inválidos aceptados, contraseñas débiles admitidas o respuestas anteriores se conservan solo para trazabilidad. No deben presentarse como comportamiento vigente.

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 15/05/2026 | Registro inicial de tres defectos |
| 2.0.0 | 08/08/2026 | Revalidación de dos defectos de Usuarios, normalización del defecto de expiración y registro del buscador no reactivo |
| 3.0.0 | 08/08/2026 | Ejecución integral de 78 casos y registro de siete defectos funcionales adicionales |
