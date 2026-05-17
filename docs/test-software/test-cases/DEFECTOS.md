# 🐛 Registro de Defectos — SofInventory

> **Versión:** 1.0.0 <br>
> **Fecha:** 15 de mayo de 2026 <br>
> **Sistema:** SofInventory <br>
> **Iteración de pruebas:** Sprint QA — v1.0 

---

## 📋 Resumen Ejecutivo de Defectos

| Total encontrados | Críticos 🔴 | Medios 🟡 | Bajos 🟢 | Resueltos | Pendientes |
|-------------------|------------|----------|---------|-----------|------------|
| 3 | 2 | 1 | 0 | 0 | 3 |

---

## 🔴 Defectos de Severidad Alta

---

### BUG-USR-001: Ausencia de validación de formato de número de documento

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-USR-001 |
| **Módulo** | Usuarios |
| **Caso de prueba** | TC-USR-005 |
| **Severidad** | 🔴 Alta |
| **Prioridad** | P1 — Resolver antes del despliegue |
| **Estado** | 🔴 Abierto |
| **Descripción** | El sistema permite registrar un usuario ingresando caracteres alfabéticos o especiales en el campo `numero_documento`. No existe validación de formato ni en el serializer de Django ni en el formulario Angular que garantice que el valor sea numérico o alfanumérico según el tipo de documento. |
| **Impacto** | Datos inconsistentes en la tabla `usuarios` de PostgreSQL. Puede provocar errores en módulos que dependan del número de documento para búsquedas o reportes. |
| **Pasos para reproducir** | 1. Autenticarse como administrador. 2. Abrir formulario de Nuevo Usuario. 3. Ingresar `ABCDE!!!` en el campo número de documento. 4. Guardar. 5. Verificar en pgAdmin: el registro existe con el valor inválido en la columna `numero_documento`. |
| **Resultado esperado** | El sistema debe rechazar el formulario con el mensaje "El número de documento solo debe contener dígitos". HTTP 400 desde el backend. |
| **Resultado obtenido** | El registro fue creado exitosamente en la base de datos con el valor `ABCDE!!!` en la columna `numero_documento`. |
| **Solución propuesta** | Agregar un validator en el `UsuarioSerializer` de DRF: `numero_documento = serializers.RegexField(regex=r'^\d+$')`. Agregar validación equivalente en el formulario Angular con `Validators.pattern(/^\d+$/)`. |
| **Asignado a** | Equipo Backend / Equipo Frontend |
| **Fecha reporte** | 14/05/2026 |

## 🔴 Defectos de Severidad Alta

---

### BUG-USR-002: Ausencia de política de contraseñas en registro de usuarios

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-USR-002 |
| **Módulo** | Usuarios |
| **Caso de prueba** | TC-USR-004 |
| **Severidad** | 🔴 Alta |
| **Prioridad** | P1 — Resolver antes del despliegue |
| **Estado** | 🔴 Abierto |
| **Descripción** | El sistema permite crear usuarios con contraseñas débiles como `123` o `12345`. No existe validación de política de contraseñas ni en el `UsuarioSerializer` de DRF ni en el formulario Angular. |
| **Impacto** | Usuarios con contraseñas triviales son vulnerables a ataques de fuerza bruta y diccionario, comprometiendo la seguridad del sistema completo. |
| **Pasos para reproducir** | 1. Autenticarse como administrador. 2. Crear un nuevo usuario con contraseña `123`. 3. Verificar que el usuario queda registrado sin error. |
| **Resultado esperado** | HTTP 400 con mensaje indicando que la contraseña no cumple la política de seguridad. |
| **Resultado obtenido** | Usuario creado exitosamente con contraseña `123`. |
| **Solución propuesta** | Activar `AUTH_PASSWORD_VALIDATORS` en `settings.py` de Django y conectarlos al serializer. Agregar `Validators.pattern` en el formulario Angular para exigir mínimo 8 caracteres, una mayúscula, un número y un carácter especial. |
| **Asignado a** | Equipo Backend / Equipo Frontend |
| **Fecha reporte** | 16/05/2026 |

## 🔴 Defectos de Severidad Alta
---

### BUG-LOGIN-001: El interceptor HTTP no gestiona la redirección por sesión expirada

| Campo | Detalle |
|-------|---------|
| **ID** | BUG-LOGIN-001 |
| **Módulo** | Login (Frontend Angular) |
| **Caso de prueba** | TC-LOGIN-010 |
| **Severidad** | 🟡 Media |
| **Prioridad** | P2 — Resolver en el siguiente sprint |
| **Estado** | 🔴 Abierto |
| **Descripción** | Cuando el token Bearer expira (pasadas las 12 horas), el backend devuelve correctamente HTTP 401 con el mensaje `"La sesion expiro. Inicie sesion nuevamente."`. Sin embargo, el frontend Angular no intercepta esa respuesta y no redirige al usuario a la pantalla de Login. El usuario permanece en el dashboard viendo las secciones vacías y sin ningún mensaje informativo. |
| **Impacto** | Mala experiencia de usuario. El usuario no sabe que su sesión expiró y puede intentar acciones que fallan silenciosamente. |
| **Pasos para reproducir** | 1. Autenticarse en el sistema. 2. Localizar el token en `localStorage` (`access_token`). 3. En pgAdmin, ejecutar: `UPDATE sesiones_api SET expira_en = NOW() - INTERVAL '1 hour' WHERE activa = true;` para forzar la expiración. 4. Navegar a cualquier sección que cargue datos desde la API. 5. Observar: datos vacíos, sin redirección, sin mensaje de sesión expirada. |
| **Resultado esperado** | El Angular `HttpInterceptor` captura el 403, limpia el `localStorage`, y redirige a `/login` con el mensaje "Tu sesión ha expirado. Por favor, inicia sesión nuevamente." |
| **Resultado obtenido** | El frontend no interceptó el 403. El usuario permaneció en el dashboard con datos vacíos. No se mostró ningún mensaje de error. |
| **Solución propuesta** | Implementar un `HttpInterceptor` en Angular que capture respuestas con código 403 y ejecute: limpiar el token del `localStorage`, redirigir a `/login` mostrando el mensaje correspondiente. |
| **Asignado a** | Equipo Frontend |
| **Fecha reporte** | 14/05/2026 |

## 🟡 Defectos de Severidad Media

---

## 📈 Historial de Cambios

| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0.0 | 15/05/2026 | Registro inicial de defectos — Sprint QA v1.0 |

---

*© 2026 SofInventory — Área de Calidad de Software*
