# Glosario y ambiente de pruebas — SofInventory

> **Versión:** 2.0.0 · **Actualizado:** 8 de agosto de 2026

## Ambiente de referencia

Las versiones siguientes corresponden a los contenedores de SofInventory. Las herramientas instaladas en Windows no definen el runtime del sistema.

| Componente | Runtime verificado |
|---|---|
| Backend | Python 3.12.13, Django 6.0.4, Django REST Framework 3.17.1 |
| Base de datos | PostgreSQL 15.18 |
| Frontend servido | Nginx 1.31.3 sobre Alpine 3.24.1 |
| Compilación frontend | Node.js 20 Alpine, Angular 19.2.21, TypeScript 5.6.3 |
| Suite frontend ejecutada | Node.js 20.20.2 en contenedor temporal |
| Suite backend rápida | `config.test_settings`, SQLite en memoria y hasher MD5 solo para pruebas |
| Zona horaria | `America/Bogota` |
| URL local integrada | `http://localhost/` |
| API local directa | `http://localhost:8000/api/` |

Los casos de restricciones, transacciones y concurrencia deben ejecutarse también en PostgreSQL 15.18. SQLite se usa para velocidad, no como sustituto del motor operativo.

## Roles actuales

| Rol | Alcance general |
|---|---|
| Administrador | Configuración y administración completa, incluida gestión de usuarios |
| Supervisor | Operaciones de supervisión habilitadas por cada módulo |
| Bodega | Operaciones de productos, almacenes, inventario y compras autorizadas |
| Vendedor | Operación comercial y módulos permitidos por el backend |

Los permisos exactos se prueban por endpoint. La visibilidad del menú no es una garantía de autorización.

## Sesiones

SofInventory usa un token Bearer propio; no usa JWT.

| Propiedad | Comportamiento actual |
|---|---|
| Generación | Token aleatorio mediante `secrets.token_urlsafe(48)` |
| Persistencia backend | Tabla `sesiones_api` |
| Vigencia | 12 horas desde la creación |
| Sesión única | Un login invalida sesiones activas anteriores del mismo usuario |
| Logout | Marca la sesión actual como inactiva |
| Frontend | Conserva token, expiración y usuario en `localStorage`; los elimina al salir o manejar no autorización |
| Limitación de Login | `5/min` por defecto, configurable |
| Bloqueo de cuenta | Cinco contraseñas incorrectas para una cuenta existente |

Nunca copiar a un documento el valor de un token, contraseña, cookie o encabezado `Authorization`.

## Evidencia

| Código | Significado |
|---|---|
| `AUTO` | Salida reproducible de una suite automatizada |
| `API` | Solicitud/respuesta sanitizada |
| `DB-R` | Consulta de solo lectura, preferentemente agregada |
| `MAN` | Verificación manual con pasos y resultado |
| `CAPTURA` | Imagen real enlazada desde uno o más casos, sanitizada y sin secretos |
| `A` | Cobertura automatizada ejecutada y aprobada en la revisión indicada |
| `P` | Cobertura parcial |
| `M` | Falta automatización |
| `V` | Requiere verificación manual/visual |

## Términos

| Término | Definición |
|---|---|
| Caso de prueba | Escenario con precondiciones, datos, acción, resultado y evidencia |
| Prueba positiva | Verifica una operación válida |
| Prueba negativa | Verifica rechazo controlado de una entrada inválida |
| Prueba de permisos | Comprueba autorización en el backend con roles permitidos y denegados |
| Prueba de integración | Comprueba la relación entre módulos o capas |
| Prueba de interfaz | Comprueba interacción, accesibilidad, temas y responsive |
| Snapshot | Copia de datos relevantes guardada con una operación para preservar su historia |
| Throttling | Límite temporal de solicitudes para reducir abuso |
| Idempotencia | Repetir una operación no duplica su efecto |
| Atomicidad | Una operación se completa por entero o no deja cambios parciales |
| Evidencia histórica | Archivo conservado que no demuestra por sí solo el estado actual |

## Códigos HTTP frecuentes

| Código | Uso esperado |
|---|---|
| 200 | Operación exitosa |
| 201 | Registro creado |
| 204 | Operación exitosa sin cuerpo |
| 400 | Datos inválidos o regla funcional incumplida |
| 401 | Credenciales o autenticación no válidas según el contrato del endpoint |
| 403 | Sesión sin permiso o estados de cuenta/sesión rechazados según el backend actual |
| 404 | Recurso inexistente |
| 409 | Conflicto con historial o dependencia |
| 429 | Límite de solicitudes excedido |
