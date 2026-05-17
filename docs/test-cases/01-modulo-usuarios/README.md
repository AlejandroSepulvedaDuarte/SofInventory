# 👤 Módulo 01 — Gestión de Usuarios

> **Versión:** 1.0.0 <br>
> **Módulo:** Usuarios <br>
> **Código de módulo:** MOD-USR <br>
> **Fecha:** 15 de mayo de 2026

---

## 1. 📌 Descripción del Módulo

El módulo de **Gestión de Usuarios** permite a los administradores del sistema SofInventory crear, editar, visualizar, cambiar el estado y eliminar cuentas de usuario. Cada usuario posee credenciales de acceso (username y contraseña) y un rol asignado que determina los permisos disponibles dentro del sistema.

La contraseña es almacenada de forma segura mediante el algoritmo **PBKDF2-SHA256** de Django; nunca se persiste en texto plano en la base de datos PostgreSQL.

Este módulo es la base del sistema de autenticación: **un usuario debe existir y estar activo** para poder iniciar sesión a través del módulo de Login.

---

## 2. 🎯 Objetivos del Módulo

- Garantizar que solo usuarios con rol **Administrador** puedan crear nuevas cuentas.
- Validar que los datos ingresados cumplan con los formatos y restricciones definidos en el modelo Django.
- Verificar que las contraseñas sean almacenadas con hash PBKDF2 y nunca en texto plano.
- Comprobar que los usuarios creados puedan autenticarse exitosamente en el módulo de Login.
- Asegurar que la información se persista correctamente en la base de datos PostgreSQL.

---

## 3. 🔭 Alcance de las Pruebas

| Funcionalidad | ¿En Alcance? |
|---------------|-------------|
| Creación de usuario con datos válidos | ✅ |
| Validación de campos obligatorios | ✅ |
| Validación de unicidad de username y email | ✅ |
| Validación de número de documento | ✅ |
| Validación de contraseña segura | ✅ |
| Verificación de hash de contraseña en BD | ✅ |
| Asignación de rol al usuario | ✅ |
| Impacto sobre el módulo de Login | ✅ |
| Edición de usuarios | ❌ (versión futura) |
| Eliminación de usuarios | ❌ (versión futura) |
| Listado/búsqueda de usuarios | ❌ (versión futura) |

---

## 4. 🛠️ Herramientas de Prueba

| Herramienta | Uso en este módulo |
|-------------|-------------------|
| **Angular 19** (Chrome) | Verificación del formulario de creación en el frontend |
| **Postman** | Pruebas directas al endpoint `POST /api/usuarios/crear/` |
| **pgAdmin 4** | Verificación de registros en las tablas `usuarios` y verificación del hash de contraseña |

---

## 5. 🧱 Estructura del Módulo

```
01-modulo-usuarios/
├── README.md              ← Este archivo
├── casos-usuarios.md      ← Casos de prueba TC-USR-001 al TC-USR-008
└── evidencias/
    ├── frontend/          ← Capturas de pantalla del formulario Angular
    ├── postman/           ← Capturas de requests/responses en Postman
    └── database/          ← Capturas de consultas SQL en pgAdmin 4
```

---

## 6. 📊 Resumen de Resultados

| ID | Nombre del Caso | Estado |
|----|----------------|--------|
| TC-USR-001 | Creación exitosa de usuario administrador | ✅ Pasó |
| TC-USR-002 | Creación exitosa de usuario operador | ✅ Pasó |
| TC-USR-003 | Username duplicado rechazado | ✅ Pasó |
| TC-USR-004 | Contraseña que no cumple política de seguridad | ❌ Falló |
| TC-USR-005 | Número de documento con formato inválido | ❌ Falló |
| TC-USR-006 | Campos obligatorios vacíos | ✅ Pasó |
| TC-USR-007 | Verificación de contraseña hasheada en BD | ✅ Pasó |
| TC-USR-008 | Usuario creado puede iniciar sesión | ✅ Pasó |

**Resultado:** 7/8 casos aprobados — **87.5% de éxito**

---

## 7. 🔗 Documentos Relacionados

- [Casos de Prueba Completos →](./casos-usuarios.md)
- [Módulo de Login →](../02-modulo-login/README.md)
- [Índice General →](../../README.md)

---

*© 2026 SofInventory — Área de Calidad de Software*
