# 📖 Glosario y Ambiente de Pruebas — SofInventory

> **Versión:** 1.0.0 | **Fecha:** 15 de mayo de 2026

---

## 🖥️ Ambiente de Pruebas

| Componente | Detalle |
|------------|---------|
| **Sistema Operativo** | Windows 10 / Ubuntu 22.04 |
| **Navegador** | Google Chrome 124.x |
| **URL Frontend** | `http://localhost:4200` (desarrollo) |
| **URL API Backend** | `http://localhost:8000/api/` |
| **Motor de BD** | PostgreSQL 15+ |
| **Gestor de BD** | pgAdmin 4 |
| **Versión Angular** | 19.x |
| **Versión Django** | 6.0.4 |
| **Versión DRF** | 3.17.1 |
| **Versión Python** | 3.12.x |
| **Versión Postman** | 10.x |
| **Ambiente** | Desarrollo local / Staging |

---

## 👥 Datos de Prueba

| Rol | Username | Email | Contraseña | Estado |
|-----|----------|-------|-----------|--------|
| Administrador | `admin` | `admin@sofinventory.com` | `Admin123` | Activo |
| Supervisor | `sebascal` | `sebas@gmail.com` | `sebas123` | Activo |
| Usuario inactivo | `sebascal` | `sebas@gmail.com` | `sebas123` | Inactivo |

> ⚠️ Estos datos son exclusivamente para el ambiente de pruebas. No deben usarse en producción.

---

## 🔑 Estructura del Token de Autenticación

SofInventory **no utiliza JWT**. El sistema implementa un **token Bearer propio** almacenado en la tabla `sesiones_api` de PostgreSQL.

| Propiedad | Detalle |
|-----------|---------|
| **Generación** | `secrets.token_urlsafe(48)` — 64 caracteres URL-safe |
| **Almacenamiento** | Tabla `sesiones_api` en PostgreSQL |
| **Duración** | 12 horas desde la creación (`expira_en`) |
| **Header de uso** | `Authorization: Bearer <token>` |
| **Revocación** | Campo `activa = False` en la sesión |
| **Renovación** | Al hacer login, todas las sesiones previas activas se invalidan |

Ejemplo de respuesta al autenticarse:
```json
{
  "mensaje": "Bienvenido Carlos Pérez",
  "access_token": "abc123...xyz",
  "expires_at": "2026-05-15T03:00:00+00:00",
  "usuario": {
    "id": 1,
    "username": "admin",
    "nombre": "Carlos Pérez",
    "rol": "Administrador",
    "estado": "activo",
    "email": "admin@sofinventory.com"
  }
}
```

---

## 🔒 Manejo de Contraseñas

Las contraseñas son almacenadas usando el algoritmo **PBKDF2-SHA256** a través del hasher de Django. Nunca se persisten en texto plano.

Formato del hash en la BD:
```
pbkdf2_sha256$<iteraciones>$<salt>$<hash>
```

---

## 📡 Endpoints Principales

| Módulo | Método | Endpoint | Acceso |
|--------|--------|----------|--------|
| Login | POST | `/api/auth/login/` | Público |
| Perfil propio | GET | `/api/auth/me/` | Autenticado |
| Logout | POST | `/api/auth/logout/` | Autenticado |
| Crear usuario | POST | `/api/usuarios/crear/` | Solo Administrador |
| Listar usuarios | GET | `/api/usuarios/listar/` | Solo Administrador |
| Editar usuario | PUT | `/api/usuarios/editar/<id>/` | Solo Administrador |
| Cambiar estado | PATCH | `/api/usuarios/estado/<id>/` | Solo Administrador |
| Eliminar usuario | DELETE | `/api/usuarios/eliminar/<id>/` | Solo Administrador |

---

## 📚 Glosario

| Término | Definición |
|---------|------------|
| **TC** | Test Case (Caso de Prueba) |
| **BUG** | Defecto o error encontrado durante las pruebas |
| **Token Bearer** | Token de autenticación propio generado por el servidor y almacenado en la BD |
| **PBKDF2** | Password-Based Key Derivation Function 2 — algoritmo de hashing de contraseñas usado por Django |
| **Salt** | Valor aleatorio añadido al hash de la contraseña para evitar ataques de tablas arcoíris |
| **API REST** | Interfaz de Programación de Aplicaciones de arquitectura REST |
| **DRF** | Django REST Framework — librería para construir APIs en Django |
| **Frontend** | Capa de presentación del sistema (Angular 19) |
| **Backend** | Capa de lógica de negocio y API (Django 6 + DRF) |
| **BD** | Base de Datos (PostgreSQL 15+) |
| **pgAdmin** | Herramienta gráfica para administrar y consultar bases de datos PostgreSQL |
| **UAT** | User Acceptance Testing — pruebas de aceptación del usuario |
| **Guard (Angular)** | Mecanismo de Angular para proteger rutas de navegación |
| **Interceptor (Angular)** | Mecanismo de Angular para interceptar peticiones/respuestas HTTP |
| **sesiones_api** | Tabla en PostgreSQL que almacena los tokens activos de cada usuario |
| **usuarios** | Tabla principal en PostgreSQL con los datos del usuario (modelo `Usuario`) |
| **roles** | Tabla en PostgreSQL que almacena los roles disponibles (ej. Administrador, Supervisor) |
| **HTTP 200** | OK — Petición exitosa |
| **HTTP 201** | Created — Recurso creado exitosamente |
| **HTTP 400** | Bad Request — Petición mal formada o datos inválidos |
| **HTTP 401** | Unauthorized — Sin token o token inválido/expirado |
| **HTTP 403** | Forbidden — Autenticado pero sin permisos suficientes |
| **HTTP 404** | Not Found — Recurso no encontrado |
| **HTTP 500** | Internal Server Error — Error interno del servidor |
| **P1** | Prioridad 1 — Crítico, debe resolverse antes del despliegue |
| **P2** | Prioridad 2 — Importante, debe resolverse en el siguiente sprint |
| **P3** | Prioridad 3 — Bajo, puede planificarse para futura versión |

---

*© 2026 SofInventory — Área de Calidad de Software*
