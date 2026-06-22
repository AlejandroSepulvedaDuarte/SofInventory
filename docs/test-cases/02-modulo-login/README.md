# 🔐 Módulo 02 — Login / Autenticación

> **Versión:** 1.0.0 <br>
> **Módulo:** Login y Autenticación <br>
> **Código de módulo:** MOD-LOGIN <br>
> **Fecha:** 15 de mayo de 2026

---

## 1. 📌 Descripción del Módulo

El módulo de **Login** es el punto de entrada al sistema SofInventory. Gestiona la autenticación de usuarios mediante **username y contraseña** (no email). Tras una autenticación exitosa, el backend Django genera un **token Bearer propio** (usando `secrets.token_urlsafe(48)`) que se almacena en la tabla `sesiones_api` de PostgreSQL, con una duración de **12 horas**. Este token debe enviarse en el header `Authorization: Bearer <token>` en todas las peticiones subsiguientes.

Este módulo es crítico para la seguridad del sistema: un fallo en la autenticación puede comprometer la confidencialidad e integridad de toda la información gestionada.

---

## 2. 🎯 Objetivos del Módulo

- Verificar que solo usuarios con credenciales válidas (username + contraseña) pueden ingresar al sistema.
- Comprobar que el sistema rechaza correctamente credenciales incorrectas o inexistentes.
- Validar la generación correcta del token Bearer y su registro en la tabla `sesiones_api` de PostgreSQL.
- Verificar que un usuario inactivo no puede autenticarse aunque sus credenciales sean correctas.
- Detectar posibles vulnerabilidades en el endpoint de autenticación.
- Verificar la invalidación correcta del token al cerrar sesión.

---

## 3. 🔭 Alcance de las Pruebas

| Escenario | ¿En Alcance? |
|-----------|-------------|
| Login con credenciales correctas (username + contraseña) | ✅ |
| Login con contraseña incorrecta | ✅ |
| Login con username no registrado | ✅ |
| Login con campos vacíos | ✅ |
| Login con usuario inactivo | ✅ |
| Inyección de caracteres especiales | ✅ |
| Cierre de sesión (Logout) | ✅ |
| Acceso a ruta protegida sin token | ✅ |
| Token expirado (sesión invalidada) | ✅ |
| Múltiples sesiones simultáneas | ✅ |
| Recuperación de contraseña | ❌ (versión futura) |
| Autenticación de dos factores (2FA) | ❌ (versión futura) |

---

## 4. 🛠️ Herramientas de Prueba

| Herramienta | Uso en este módulo |
|-------------|-------------------|
| **Angular 19** (Chrome) | Prueba del formulario de login en el frontend |
| **Postman** | Pruebas directas al endpoint `POST /api/auth/login/` |
| **Chrome DevTools** | Inspección de localStorage y headers HTTP |
| **pgAdmin 4** | Verificación del estado de sesiones en la tabla `sesiones_api` y de usuarios en la tabla `usuarios` |

---

## 5. 🧱 Estructura del Módulo

```
02-modulo-login/
├── README.md               ← Este archivo
├── casos-login.md          ← Casos de prueba TC-LOGIN-001 al TC-LOGIN-010
└── evidencias/
    ├── frontend/           ← Capturas de pantalla del formulario Angular
    ├── postman/            ← Capturas de requests/responses en Postman
    └── database/           ← Capturas de consultas SQL en pgAdmin 4 (tabla sesiones_api)
```

---

## 6. 📊 Resumen de Resultados

| ID | Nombre del Caso | Estado |
|----|----------------|--------|
| TC-LOGIN-001 | Login exitoso como administrador | ✅ Pasó |
| TC-LOGIN-002 | Login exitoso como supervisor (permisos restringidos) | ✅ Pasó |
| TC-LOGIN-003 | Login con username no registrado | ✅ Pasó |
| TC-LOGIN-004 | Login con campos vacíos | ✅ Pasó |
| TC-LOGIN-005 | Login con usuario inactivo | ✅ Pasó |
| TC-LOGIN-006 | Login con contraseña incorrecta | ✅ Pasó |
| TC-LOGIN-007 | Inyección de caracteres especiales | ✅ Pasó |
| TC-LOGIN-008 | Cierre de sesión correcto (Logout) | ✅ Pasó |
| TC-LOGIN-009 | Acceso a ruta protegida sin token | ✅ Pasó |
| TC-LOGIN-010 | Comportamiento con sesión expirada | ❌ Falló |

**Resultado:** 9/10 casos aprobados — **90.0% de éxito**

---

## 7. 🔗 Documentos Relacionados

- [Casos de Prueba Completos →](./casos-login.md)
- [Módulo de Usuarios →](../01-modulo-usuarios/README.md)
- [Índice General →](../../README.md)

---

*© 2026 SofInventory — Área de Calidad de Software*
