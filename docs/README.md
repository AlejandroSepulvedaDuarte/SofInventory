# SofInventory — Documentación de Pruebas de Software

> **Versión documental:** 3.1.0
>
> **Fecha de actualización:** 8 de agosto de 2026
>
> **Estado:** ejecución completa · aprobación condicionada
>
> **Equipo QA:** Alejandro Sepúlveda Duarte y Lucy Estefany Izquierdo Jaramillo

---

## Índice general

```text
docs/
├── README.md
└── test-cases/
    ├── MATRIZ_COBERTURA.md
    ├── RESULTADOS_EJECUCION_2026-08-08.md
    ├── DEFECTOS.md
    ├── GLOSARIO.md
    ├── evidencias-ejecucion/
    ├── 01-modulo-usuarios/
    ├── 02-modulo-login/
    ├── 03-modulo-categorias/
    ├── 04-modulo-productos/
    ├── 05-modulo-proveedores/
    ├── 06-modulo-clientes/
    ├── 07-modulo-almacenes/
    ├── 08-modulo-inventario/
    ├── 09-modulo-compras/
    ├── 10-modulo-ventas/
    ├── 11-modulo-empresa/
    ├── 12-modulo-dashboard/
    └── 13-frontend-compartido/
```

---

## 1. Descripción del sistema

SofInventory es un sistema web para administrar usuarios, terceros, productos, almacenes, existencias, compras y ventas. También centraliza la configuración de la empresa, los indicadores operativos del Dashboard y funciones compartidas de interfaz como temas visuales, formularios responsive y ayuda contextual.

La solución está compuesta por:

| Capa | Responsabilidad |
|---|---|
| Frontend Angular | Interfaz, formularios, validaciones inmediatas, navegación por rol, temas y diseño responsive |
| Backend Django REST Framework | Reglas de negocio, validación definitiva, permisos, sesiones y servicios de datos |
| PostgreSQL | Persistencia utilizada por el entorno integrado de Docker |
| Nginx | Publicación del frontend y enrutamiento del entorno contenerizado |
| Docker Compose | Ejecución reproducible de los servicios del sistema |

Los perfiles funcionales revisados son **Administrador, Supervisor, Bodega y Vendedor**. La autenticación utiliza sesiones con token y vencimiento controlado; la documentación nunca debe incluir credenciales, tokens ni datos personales reales.

---

## 2. Objetivos del plan de pruebas

### Objetivo general

Comprobar que SofInventory mantiene un comportamiento funcional, seguro y consistente en sus módulos principales, tanto en la interfaz como en los servicios y la persistencia, antes de autorizar una liberación.

### Objetivos específicos

- Verificar autenticación, cierre de sesión, expiración y protección frente a intentos fallidos.
- Comprobar roles, permisos y restricciones de acceso en interfaz y servicios.
- Validar operaciones de creación, consulta, actualización, anulación y eliminación según cada módulo.
- Confirmar la integridad del inventario ante compras, ventas, ajustes, movimientos, transferencias y anulaciones.
- Revisar reglas de identificación, contraseñas, estados, duplicados y relaciones entre registros.
- Validar comprobantes, indicadores, periodos y cálculos derivados.
- Comprobar temas visuales, accesibilidad básica, ayuda contextual, formularios compartidos y adaptación responsive.
- Mantener evidencias reproducibles sin modificar datos operativos ni exponer información sensible.

---

## 3. Alcance de las pruebas

### Funcionalidades incluidas

| Área | Cobertura principal |
|---|---|
| Login y sesiones | Acceso, credenciales inválidas, bloqueo, expiración, cierre y protección de rutas |
| Usuarios, roles y permisos | CRUD, validaciones, estado, contraseña y autorización por rol |
| Categorías | Creación, edición, duplicados y relaciones con productos |
| Productos | Datos generales, referencia, categoría, precios, IVA, imagen y estados |
| Proveedores | Registro, edición, validaciones, ubicación y relaciones con compras |
| Clientes | Identidad, contacto, ubicación, edición y relaciones con ventas |
| Almacenes | Registro, actualización, permisos, ubicación y uso operativo |
| Inventario | Existencias, ajustes, movimientos, transferencias y concurrencia |
| Compras | Registro, totales, ingreso de existencias, estados y anulación |
| Ventas | Registro, pagos, descuentos, impuestos, salida de existencias, anulación y comprobante |
| Empresa | Identificación, contacto, ubicación, logo y datos de comprobantes |
| Dashboard | Métricas, periodos, estados contabilizables, zona horaria y presentación |
| Frontend compartido | Temas, ayuda contextual, conservación de formularios, teclado y responsive |

### Fuera del alcance de esta ejecución

- Pruebas con información real de producción.
- Integraciones externas no incluidas en el repositorio.
- Pruebas exhaustivas de carga, estrés o penetración.
- Certificación completa en todas las combinaciones de navegador, sistema operativo y dispositivo.
- Corrección de defectos: esta documentación registra los hallazgos, pero no sustituye su implementación y revalidación.

---

## 4. Ambiente y herramientas de validación

Las versiones de referencia son las ejecutadas **dentro de los contenedores Docker**. Las herramientas instaladas en Windows se consideran utilidades del equipo anfitrión y no representan el runtime de SofInventory.

| Componente | Versión verificada | Uso |
|---|---:|---|
| Python | 3.12.13 | Runtime del backend |
| Django | 6.0.4 | Aplicación y pruebas del backend |
| Django REST Framework | 3.17.1 | Servicios y validación de respuestas |
| PostgreSQL | 15.18 | Persistencia de la ejecución integrada |
| Node.js | 20 (Alpine) | Compilación y pruebas del frontend |
| Angular | 19.2.21 | Interfaz web |
| TypeScript | 5.6.3 | Código y comprobaciones estáticas del frontend |
| Nginx | 1.31.3 sobre Alpine 3.24.1 | Publicación del frontend |

Herramientas y tipos de evidencia empleados:

- Runner de pruebas de Django con bases aisladas SQLite y PostgreSQL.
- Pruebas automatizadas del frontend ejecutadas con Node.js.
- Compilación de producción de Angular.
- Respuestas de servicios sanitizadas y consultas de solo lectura cuando aportan evidencia.
- Verificación manual en navegador para flujos, temas, teclado y tamaños de pantalla.
- Capturas reutilizables por módulo, sin secretos ni datos personales.

---

## 5. Resumen ejecutivo de resultados

### 5.1 Casos funcionales documentados

| Módulo | Casos | Aprobados | Parciales | Fallidos | Aprobación estricta |
|---|---:|---:|---:|---:|---:|
| Usuarios | 8 | 7 | 0 | 1 | 87,5 % |
| Login y sesiones | 7 | 6 | 0 | 1 | 85,7 % |
| Categorías | 4 | 4 | 0 | 0 | 100 % |
| Productos | 6 | 4 | 1 | 1 | 66,7 % |
| Proveedores | 5 | 4 | 0 | 1 | 80 % |
| Clientes | 6 | 5 | 0 | 1 | 83,3 % |
| Almacenes | 5 | 5 | 0 | 0 | 100 % |
| Inventario, movimientos y transferencias | 7 | 7 | 0 | 0 | 100 % |
| Compras y anulaciones | 6 | 5 | 0 | 1 | 83,3 % |
| Ventas, anulaciones y comprobantes | 7 | 6 | 0 | 1 | 85,7 % |
| Empresa | 5 | 4 | 0 | 1 | 80 % |
| Dashboard | 5 | 4 | 0 | 1 | 80 % |
| Frontend compartido | 7 | 6 | 0 | 1 | 85,7 % |
| **Total** | **78** | **67** | **1** | **10** | **85,9 %** |

> La aprobación estricta cuenta únicamente los casos aprobados. Un resultado parcial no se considera aprobado ni fallido hasta completar su revalidación.

### 5.2 Ejecuciones automatizadas y compilación

| Verificación | Resultado | Estado |
|---|---|---|
| Backend con base temporal SQLite | 99 de 99 pruebas aprobadas en 3,977 s | Aprobado |
| Backend con PostgreSQL 15 aislado | 99 de 99 pruebas aprobadas en 69,668 s | Aprobado |
| Pruebas automatizadas del frontend | 24 de 24 pruebas aprobadas | Aprobado |
| Compilación de producción Angular | Compilación completada | Aprobado con advertencias de presupuesto |
| Presupuesto del paquete inicial | Exceso de 7,02 kB | Advertencia |
| Presupuesto de estilos del Dashboard | Exceso de 3,05 kB | Advertencia |

Las **99 pruebas del backend** y las **24 del frontend** son ejecuciones técnicas independientes de los **78 casos funcionales documentados**. La existencia o aprobación de una prueba automatizada no reemplaza la evidencia manual cuando el caso exige inspección visual o interacción real.

La ejecución integrada utilizó datos ficticios y temporales. Al finalizar se retiraron los contenedores, volúmenes y red creados para la validación, sin intervenir la base operativa.

---

## 6. Estado final del sistema

| Criterio | Estado | Conclusión |
|---|---|---|
| Funcionalidad principal | Condicionada | Los flujos centrales operan, pero persisten fallos en productos, terceros, compras, ventas, empresa y Dashboard |
| Seguridad, sesiones y permisos | Condicionada | La cobertura de roles y bloqueo es favorable; debe corregirse el tratamiento de la sesión expirada |
| Integridad de inventario | Aprobada con observaciones | Ajustes, movimientos, transferencias y concurrencia fueron satisfactorios; una compra todavía admite un producto inactivo |
| Validaciones | Condicionada | Se confirmaron mejoras en documento y contraseña; quedan reglas pendientes en empresa y pagos |
| Usabilidad y accesibilidad | Condicionada | Los temas, la ayuda contextual y la adaptación responsive cuentan con evidencia; quedan problemas de búsqueda y mensajes técnicos |
| Arquitectura y compilación | Aprobada con advertencias | Backend, frontend y PostgreSQL pasaron las suites; Angular conserva dos advertencias de presupuesto |

### Decisión de calidad

**APROBACIÓN CONDICIONADA.** La versión evaluada puede continuar en un entorno controlado de validación, pero no se recomienda su liberación a producción hasta corregir y reejecutar los defectos abiertos que afectan operaciones y experiencia de usuario.

Antes de una aprobación definitiva se debe:

1. Corregir los defectos abiertos de mayor impacto.
2. Añadir pruebas automatizadas de regresión para cada corrección.
3. Reejecutar los casos fallidos y el caso parcial.
4. Confirmar que las correcciones no alteran inventario, permisos, sesiones ni cálculos.
5. Actualizar resultados, matriz, evidencias y estado de defectos con la nueva ejecución.

---

## 7. Defectos relevantes

| Identificador | Módulo | Hallazgo resumido | Estado |
|---|---|---|---|
| BUG-LOGIN-001 | Login | La expiración devuelve un estado distinto al gestionado por el interceptor | Abierto |
| BUG-USR-003 | Usuarios | La búsqueda no reacciona correctamente a la entrada | Abierto |
| BUG-PRD-001 | Productos | La creación puede fallar al procesar la imagen | Abierto |
| BUG-PRV-001 | Proveedores | La eliminación de un proveedor relacionado genera error interno | Abierto |
| BUG-CLI-001 | Clientes | La eliminación de un cliente relacionado genera error interno | Abierto |
| BUG-COM-001 | Compras | Se acepta un producto inactivo en una compra | Abierto |
| BUG-VTA-001 | Ventas | El pago con débito admite información condicional incompleta | Abierto |
| BUG-EMP-001 | Empresa | Se aceptan NIT y teléfono inválidos | Abierto |
| BUG-DSH-001 | Dashboard | La interfaz expone un mensaje técnico ante un error | Abierto |
| BUG-USR-001 | Usuarios | Validación del documento | Resuelto; evidencia histórica desactualizada |
| BUG-USR-002 | Usuarios | Política de contraseña | Resuelto y verificado |

El detalle, impacto, evidencia y criterio de cierre se mantiene en [DEFECTOS.md](test-cases/DEFECTOS.md).

---

## 8. Navegación rápida

### Documentos transversales

| Documento | Propósito |
|---|---|
| [Matriz de cobertura](test-cases/MATRIZ_COBERTURA.md) | Relación consolidada entre casos, automatización, resultados y evidencias |
| [Resultados de ejecución](test-cases/RESULTADOS_EJECUCION_2026-08-08.md) | Ambiente, comandos, resultados y conclusiones de la ejecución final |
| [Registro de defectos](test-cases/DEFECTOS.md) | Hallazgos abiertos, resueltos y criterios de revalidación |
| [Glosario](test-cases/GLOSARIO.md) | Convenciones y términos empleados en los casos |
| [Manifiesto de evidencias](test-cases/evidencias-ejecucion/README.md) | Evidencias automatizadas, manuales y sanitizadas |

### Casos por módulo

| Módulo | Documento |
|---|---|
| Usuarios | [casos-usuarios.md](test-cases/01-modulo-usuarios/casos-usuarios.md) |
| Login y sesiones | [casos-login.md](test-cases/02-modulo-login/casos-login.md) |
| Categorías | [casos-categorias.md](test-cases/03-modulo-categorias/casos-categorias.md) |
| Productos | [casos-productos.md](test-cases/04-modulo-productos/casos-productos.md) |
| Proveedores | [casos-proveedores.md](test-cases/05-modulo-proveedores/casos-proveedores.md) |
| Clientes | [casos-clientes.md](test-cases/06-modulo-clientes/casos-clientes.md) |
| Almacenes | [casos-almacenes.md](test-cases/07-modulo-almacenes/casos-almacenes.md) |
| Inventario, movimientos y transferencias | [casos-inventario.md](test-cases/08-modulo-inventario/casos-inventario.md) |
| Compras y anulaciones | [casos-compras.md](test-cases/09-modulo-compras/casos-compras.md) |
| Ventas, anulaciones y comprobantes | [casos-ventas.md](test-cases/10-modulo-ventas/casos-ventas.md) |
| Empresa | [casos-empresa.md](test-cases/11-modulo-empresa/casos-empresa.md) |
| Dashboard | [casos-dashboard.md](test-cases/12-modulo-dashboard/casos-dashboard.md) |
| Temas, ayuda contextual y responsive | [casos-frontend-compartido.md](test-cases/13-frontend-compartido/casos-frontend-compartido.md) |

---

## 9. Criterios de evidencia

- Una captura puede respaldar varios casos cuando muestra de forma legible el mismo estado o flujo.
- Los cálculos, permisos y reglas de persistencia se sustentan preferiblemente con resultados automatizados, respuestas sanitizadas o consultas de solo lectura.
- La evidencia visual se reserva para diseño responsive, temas, ayuda contextual, mensajes y estados de interfaz.
- Las capturas no deben contener contraseñas, tokens, encabezados de autorización, secretos ni datos personales.
- Ningún caso se considera aprobado solo porque exista una prueba en el código: debe conservarse el resultado de su ejecución.
- Todo defecto corregido requiere evidencia nueva y una prueba de regresión cuando sea técnicamente viable.

---

## 10. Control de versiones

| Versión | Fecha | Descripción |
|---|---|---|
| 1.0.0 | 2 de agosto de 2026 | Documentación inicial de usuarios y login |
| 1.0.1 | 6 de agosto de 2026 | Ajustes posteriores a revisión de autenticación y validaciones |
| 2.0.0 | 8 de agosto de 2026 | Ampliación de cobertura a todos los módulos del sistema |
| 3.0.0 | 8 de agosto de 2026 | Consolidación de ejecución, evidencias y defectos |
| 3.1.0 | 8 de agosto de 2026 | Reestructuración del README principal con el alcance y los resultados vigentes |

---

© 2026 SofInventory · Documentación de aseguramiento de calidad
