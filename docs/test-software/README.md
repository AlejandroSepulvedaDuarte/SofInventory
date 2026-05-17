# 📋 SofInventory — Documentación de Pruebas de Software

> **Versión:** 1.0.0 <br>
> **Fecha de elaboración:** 15 de mayo de 2026 <br>
> **Última actualización:** 16 de mayo de 2026 <br>
> **Estado del documento:** ✅ Aprobado para revisión <br>
> **Equipo QA:** Alejandro Sepúlveda Duarte & Lucy Estefany Izquierdo Jaramillo — Calidad de Software, SofInventory

---

## 🧭 Índice General

```
docs/
└── test-cases/
    ├── GLOSARIO.md                        ← Glosario técnico y ambiente de pruebas
    ├── DEFECTOS.md                        ← Registro consolidado de defectos
    ├── 01-modulo-usuarios/
    │   ├── README.md                      ← Descripción del módulo
    │   ├── casos-usuarios.md              ← Casos de prueba (TC-USR-001 al TC-USR-008)
    │   └── evidencias/
    │       ├── frontend/
    │       ├── postman/
    │       └── database/
    │
    └── 02-modulo-login/
        ├── README.md                      ← Descripción del módulo
        ├── casos-login.md                 ← Casos de prueba (TC-LOGIN-001 al TC-LOGIN-010)
        └── evidencias/
            ├── frontend/
            ├── postman/
            └── database/
```

---

## 1. 📌 Descripción del Sistema

**SofInventory** es un sistema de gestión de inventario orientado a pequeñas y medianas empresas (PYMES). Permite administrar productos, controlar el stock, gestionar usuarios con roles diferenciados y mantener un registro de movimientos de entrada y salida de mercancía.

El sistema está construido sobre una arquitectura cliente-servidor:

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 19 |
| Backend / API | Django 6.0.4 + Django REST Framework 3.17.1 |
| Base de datos | PostgreSQL 18+ |
| Autenticación | Token Bearer propio (tabla `sesiones_api`), expiración 12 horas |
| Documentación API | Postman Collections |
| Gestor de BD (QA) | pgAdmin 4 |

---

## 2. 🎯 Objetivos del Plan de Pruebas

### Objetivo General
Verificar y validar el correcto funcionamiento de los módulos de **Login** y **Usuarios** del sistema SofInventory, garantizando que cumplan con los requisitos funcionales, de seguridad y usabilidad establecidos.

### Objetivos Específicos
- Validar que el módulo de autenticación permita el acceso únicamente a usuarios registrados con credenciales correctas (username + contraseña).
- Verificar que las contraseñas sean almacenadas con hash seguro (PBKDF2-SHA256) y nunca en texto plano.
- Comprobar que el sistema gestione correctamente los roles y permisos de usuarios (Administrador / Supervisor).
- Verificar la integridad de los datos almacenados en PostgreSQL mediante consultas directas en pgAdmin.
- Detectar posibles fallos de seguridad como inyección de caracteres especiales o acceso no autorizado.
- Evaluar la experiencia de usuario (UX) en los flujos de login y administración de usuarios.

---

## 3. 🔭 Alcance de las Pruebas

### ✅ En Alcance
| Módulo | Funcionalidades Cubiertas |
|--------|--------------------------|
| Login | Autenticación con username y contraseña, manejo de sesiones y tokens Bearer, cierre de sesión, bloqueo de usuario inactivo |
| Usuarios | Creación de usuarios, validación de campos, asignación de roles, verificación de hash de contraseña, efecto sobre el módulo de login |

### ❌ Fuera de Alcance (esta versión)
- Módulo de Inventario / Productos
- Módulo de Reportes / Dashboard
- Módulo de Proveedores
- Módulo de Compras / Ventas
- Módulo de Clientes
- Integraciones externas

---

## 4. 🛠️ Herramientas Tecnológicas

| # | Herramienta | Versión | Propósito |
|---|-------------|---------|-----------|
| 1 | **Angular** | 19.x | Pruebas de interfaz de usuario (Frontend) |
| 2 | **Postman** | 12.x | Pruebas de API REST (endpoints Django REST Framework) |
| 3 | **pgAdmin 4** | Latest | Verificación de integridad en base de datos PostgreSQL |
| 4 | **Chrome DevTools** | Latest | Inspección de red, localStorage y headers HTTP |
| 5 | **Google Chrome** | 124.x | Navegador para pruebas de interfaz |

---

## 5. 📊 Resumen Ejecutivo de Resultados

| Módulo | Total TC | ✅ Pasaron | ❌ Fallaron | ⚠️ Bloqueados | % Éxito |
|--------|----------|-----------|-----------|--------------|---------:|
| 01 - Usuarios | 8 | 6 | 2 | 0 | 75.0% |
| 02 - Login | 10 | 9 | 1 | 0 | 90.0% |
| **TOTAL** | **18** | **15** | **3** | **0** | **83.3%** |

---

## 6. ⭐ Estado Final del Sistema

| Criterio | Calificación | Observación |
|----------|-------------|-------------|
| Funcionalidad | ⭐⭐⭐⭐☆ (4/5) | Flujos principales operativos; fallos menores en validaciones de entrada |
| Seguridad | ⭐⭐⭐☆☆ (3/5) | Contraseñas hasheadas con PBKDF2; token Bearer con expiración. Sin bloqueo automático por intentos fallidos |
| Usabilidad | ⭐⭐⭐⭐☆ (4/5) | Interfaz intuitiva; mensajes de error mejorables en frontend ante token expirado |
| Integridad de Datos | ⭐⭐⭐⭐☆ (4/5) | Datos persistidos correctamente en PostgreSQL; unicidad garantizada por modelo Django |

### 🏁 Decisión Final del Proceso Evaluativo

> **CONDICIONALMENTE APROBADO** para ambiente de pruebas de aceptación (UAT).
> Se recomienda corregir los **3 defectos encontrados** (1 en Login, 1 en Usuarios) antes del despliegue en producción. El sistema demuestra una base funcional sólida con áreas de mejora en seguridad de entradas y manejo de sesiones en el frontend.

---

## 7. 🔗 Navegación Rápida

| Documento | Enlace |
|-----------|--------|
| 📁 Módulo Usuarios — README | [test-cases/01-modulo-usuarios/README.md](./test-cases/01-modulo-usuarios/README.md) |
| 🧪 Casos de Prueba — Usuarios | [test-cases/01-modulo-usuarios/casos-usuarios.md](./test-cases/01-modulo-usuarios/casos-usuarios.md) |
| 📁 Módulo Login — README | [test-cases/02-modulo-login/README.md](./test-cases/02-modulo-login/README.md) |
| 🧪 Casos de Prueba — Login | [test-cases/02-modulo-login/casos-login.md](./test-cases/02-modulo-login/casos-login.md) |
| 🐛 Registro de Defectos | [test-cases/DEFECTOS.md](./test-cases/DEFECTOS.md) |
| 📖 Glosario y Ambiente | [test-cases/GLOSARIO.md](./test-cases/GLOSARIO.md) |

---

## 8. 📅 Control de Versiones del Documento

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0.0 | 15/05/2026 | Equipo QA | Creación inicial del plan de pruebas |

---

*© 2026 SofInventory — Área de Calidad de Software. Documento confidencial de uso interno.*
