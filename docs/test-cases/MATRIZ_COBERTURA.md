# Matriz mínima de cobertura de pruebas — SofInventory

> **Versión:** 2.0.0 <br>
> **Fecha de diseño:** 8 de agosto de 2026 <br>
> **Estado:** ejecución final completa: 67 aprobados, 1 parcial y 10 fallidos <br>
> **Alcance:** módulos funcionales, seguridad, permisos, integración e interfaz

## 1. Propósito

Esta matriz organiza la cobertura mínima que debe conservar SofInventory antes de una liberación. La presencia de un método de prueba **no significa que el caso esté aprobado**: el 8 de agosto de 2026 se ejecutaron 99/99 pruebas backend tanto en SQLite temporal como en PostgreSQL 15 aislado, 24/24 pruebas Node, el build Angular y verificaciones API/DB-R/manuales para los 78 casos.

El resultado individual, la evidencia y los defectos se encuentran en [RESULTADOS_EJECUCION_2026-08-08.md](./RESULTADOS_EJECUCION_2026-08-08.md). Las capturas antiguas de Login y Usuarios se conservan como evidencia histórica separada.

## 2. Ambiente técnico de referencia

Las versiones de runtime corresponden a las imágenes de los contenedores inspeccionados, no a herramientas instaladas en Windows.

| Capa | Runtime de referencia |
|---|---|
| Backend | Python 3.12.13, Django 6.0.4 y Django REST Framework 3.17.1 |
| Base de datos | PostgreSQL 15.18 |
| Frontend servido | Nginx 1.31.3 sobre Alpine 3.24.1 |
| Compilación frontend | Node.js 20 Alpine, Angular 19.2.21 y TypeScript 5.6.3 |
| Suite backend rápida | Django con `config.test_settings` y SQLite en memoria |
| Suite de integración obligatoria | PostgreSQL 15.18 en un ambiente aislado |

La suite rápida con SQLite no sustituye las verificaciones de restricciones, transacciones y concurrencia sobre PostgreSQL.

## 3. Convenciones

### Estado de cobertura

| Código | Significado |
|---|---|
| `A` | Existe prueba automatizada directa; cada documento indica si ya fue ejecutada en esta revisión. |
| `P` | Existe cobertura automatizada parcial o indirecta. |
| `M` | Falta prueba automatizada. |
| `V` | Requiere inspección manual o visual además de cualquier prueba automatizada. |
| `D!` | Existe documentación histórica, pero debe actualizarse o revalidarse. |

### Evidencia

| Código | Evidencia apropiada |
|---|---|
| `AUTO` | Salida completa de la suite, con fecha, comando, runtime y resultado. |
| `API` | Solicitud y respuesta sanitizadas, sin tokens ni datos personales. |
| `DB-R` | Consulta de solo lectura que demuestre integridad o efecto transaccional. |
| `MAN` | Lista de pasos y resultado de una verificación manual. |
| `CAPTURA` | Imagen real enlazada desde el caso; puede compartirse entre casos y nunca debe mostrar secretos ni datos personales innecesarios. |

## 4. Resumen mínimo por módulo

| Módulo | Documento | Casos mínimos | Cobertura actual predominante | Prioridad principal |
|---|---|---:|---|---|
| Login y sesiones | [casos-login.md](./02-modulo-login/casos-login.md) | 7 | `A`, `P`, `M`, `V` | Crítica |
| Usuarios, roles y permisos | [casos-usuarios.md](./01-modulo-usuarios/casos-usuarios.md) | 8 | `A`, `P`, `M`, `V` | Crítica |
| Categorías | [casos-categorias.md](./03-modulo-categorias/casos-categorias.md) | 4 | `P`, `M` | Alta |
| Productos | [casos-productos.md](./04-modulo-productos/casos-productos.md) | 6 | `P`, `M` | Alta |
| Proveedores | [casos-proveedores.md](./05-modulo-proveedores/casos-proveedores.md) | 5 | `A`, `M` | Alta |
| Clientes | [casos-clientes.md](./06-modulo-clientes/casos-clientes.md) | 6 | `A`, `M` | Alta |
| Almacenes | [casos-almacenes.md](./07-modulo-almacenes/casos-almacenes.md) | 5 | `P`, `M` | Alta |
| Inventario, movimientos y transferencias | [casos-inventario.md](./08-modulo-inventario/casos-inventario.md) | 7 | `A`, `M` | Crítica |
| Compras y anulaciones | [casos-compras.md](./09-modulo-compras/casos-compras.md) | 6 | `P`, `M` | Crítica |
| Ventas, anulaciones y comprobantes | [casos-ventas.md](./10-modulo-ventas/casos-ventas.md) | 7 | `A`, `M`, `V` | Crítica |
| Empresa | [casos-empresa.md](./11-modulo-empresa/casos-empresa.md) | 5 | `A`, `M`, `V` | Alta |
| Dashboard | [casos-dashboard.md](./12-modulo-dashboard/casos-dashboard.md) | 5 | `A`, `M`, `V` | Alta |
| Temas, ayuda y formularios compartidos | [casos-frontend-compartido.md](./13-frontend-compartido/casos-frontend-compartido.md) | 7 | `P`, `M`, `V` | Alta |
| **Total** | | **78** | | |

Los valores anteriores cuentan **escenarios mínimos consolidados**, no la cantidad literal de identificadores que ya aparecen en los documentos históricos. Por ejemplo, los 10 casos antiguos de Login se agrupan en 7 familias mínimas de cobertura; no se elimina ninguno hasta actualizar ese documento y establecer su trazabilidad definitiva.

## 5. Cobertura automatizada localizada

| Suite | Pruebas localizadas | Observación |
|---|---:|---|
| Backend Django / SQLite | 99 métodos | 99/99 aprobados en 3,977 s; base temporal destruida. |
| Backend Django / PostgreSQL 15 | 99 métodos | 99/99 aprobados en 69,668 s; base de prueba destruida. |
| Frontend Node | 24 casos | 24/24 aprobados en Node.js 20 dentro de Docker; complementados con DOM/E2E manual. |
| Build Angular | 1 build de producción | Aprobado; advertencias de presupuesto de bundle y CSS de Dashboard. |
| Evidencia histórica | 18 casos antiguos | 10 de Login y 8 de Usuarios conservados para trazabilidad, sin vigencia automática. |

## 6. Reglas de ejecución y evidencia

1. Ejecutar primero la suite rápida en un entorno aislado; no usar datos existentes.
2. Ejecutar los casos de persistencia, restricciones, transacciones y concurrencia en PostgreSQL 15.18.
3. Registrar comando, fecha, imagen o versión del contenedor y resultado; no copiar tokens ni contraseñas.
4. Para permisos, probar al menos un rol autorizado y uno no autorizado en el backend, aunque el menú o botón esté oculto en el frontend.
5. Para operaciones de stock, acompañar la respuesta con una consulta `DB-R` o aserciones automatizadas antes y después.
6. Reutilizar capturas: una imagen puede evidenciar varios casos visuales si el estado mostrado es inequívoco.
7. Mantener los casos con estado “Pendiente” hasta que exista una ejecución reproducible y fechada.

## 7. Capturas mínimas compartidas

El repositorio contiene evidencias vigentes de Login, Usuarios, Categorías, Productos, Proveedores, Clientes, Almacenes, Inventario, Compra, Venta, Empresa y Dashboard. Se agregaron estados E2E de duplicado de Categoría, error de alta de Producto, detalle/anulación de Compra, registro/detalle/anulación de Venta y Dashboard vacío. Bloqueos, permisos, cálculos, concurrencia y stock se acreditan con `AUTO`, `API` y `DB-R`; no se duplican capturas por cada variante.

## 8. Orden recomendado

1. Infraestructura de pruebas aislada y comando reproducible para SQLite y PostgreSQL.
2. Login, sesiones, Usuarios, roles y permisos.
3. Categorías, Productos, Almacenes e Inventario, incluida concurrencia.
4. Compras, Ventas, anulaciones, comprobantes y Empresa.
5. Proveedores, Clientes y ubicación compartida.
6. Dashboard.
7. Componentes compartidos, interceptor, guards, temas, notificaciones, accesibilidad y responsive.
8. Actualización de resultados y evidencias documentales después de ejecutar.

## 9. Criterio de cierre

Los 78 casos tienen resultado trazable. La documentación de ejecución está completa, pero la liberación funcional queda condicionada a corregir los diez casos fallidos y reejecutar el caso parcial. Los casos aprobados no requieren nuevas capturas salvo que cambie la interfaz o la regla verificada.

## 10. Resultado final

| Total | Aprobados | Parciales | Fallidos |
|---:|---:|---:|---:|
| **78** | **67** | **1** | **10** |

La distribución por módulo y cada evidencia concreta se mantienen en [Resultados finales](./RESULTADOS_EJECUCION_2026-08-08.md).
