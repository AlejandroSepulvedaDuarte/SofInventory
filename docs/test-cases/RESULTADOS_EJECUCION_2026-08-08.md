# Resultados finales de ejecución — SofInventory

> **Fecha:** 8 de agosto de 2026  
> **Rama:** `docs/actualizacion-calidad-seguridad`  
> **Alcance:** 78 casos mínimos consolidados  
> **Resultado:** 67 aprobados, 1 parcial y 10 fallidos  
> **Datos:** exclusivamente ficticios en contenedores efímeros; el entorno E2E fue eliminado al finalizar

## 1. Criterio de resultado

| Estado | Significado |
|---|---|
| **Aprobado** | El comportamiento fue demostrado por una prueba ejecutada, una operación E2E aislada o una combinación trazable de ambas. |
| **Parcial** | Una parte del caso quedó aprobada, pero otra no pudo ejecutarse por un defecto bloqueante ya identificado. |
| **Falló** | El resultado real no coincide con lo esperado. El defecto asociado se registra en [DEFECTOS.md](./DEFECTOS.md). |

La suite existente no se consideró aprobada por el solo hecho de estar en el repositorio: se ejecutó completa. Las capturas acreditan únicamente presentación o estado visible; cálculos, permisos, auditoría y stock se sustentan con resultados automatizados, respuestas sanitizadas y consultas de solo lectura.

## 2. Runtime real de contenedores

| Capa | Versión verificada |
|---|---|
| Backend | Python 3.12.13 · Django 6.0.4 · Django REST Framework 3.17.1 |
| Base de datos | PostgreSQL 15.18 |
| Frontend servido | Nginx 1.31.3 sobre Alpine 3.24.1 |
| Compilación frontend | Node.js 20 Alpine · Angular 19.2.21 · TypeScript 5.6.3 |

Las instalaciones de Windows no se usaron como runtime de SofInventory ni como evidencia de compatibilidad.

## 3. Ejecuciones automatizadas

| Evidencia | Entorno | Resultado |
|---|---|---|
| `AUTO-SQLITE` | Imagen backend, `config.test_settings`, SQLite en memoria | **99/99 aprobadas**, 3,977 s; base temporal destruida |
| `AUTO-PG` | Imagen backend y PostgreSQL 15 aislado | **99/99 aprobadas**, 69,668 s; base de prueba destruida |
| `AUTO-FE` | `node:20-alpine`, repositorio montado en solo lectura | **24/24 aprobadas**, 0 fallos |
| `BUILD-FE` | Instalación Linux limpia en volumen temporal | **Compilación aprobada**; advertencias de presupuesto: bundle inicial +7,02 kB y CSS de Dashboard +3,05 kB |

La primera tentativa de build reutilizó dependencias de Windows y falló por el binario de `esbuild`; se clasificó como error de preparación. La repetición con `npm ci` Linux limpio compiló correctamente. También se observaron avisos de dependencias obsoletas para `tar`, `uuid` y `glob`; no impidieron la compilación.

La salida sanitizada y los comandos reproducibles se conservan en el [manifiesto de evidencia automatizada](./evidencias-ejecucion/README.md).

## 4. Evidencia E2E y de integración

El escenario aislado incluyó Categoría, Producto, Proveedor, Cliente, dos Almacenes, Empresa, Compras, Transferencia y Ventas. Se ejecutaron altas, validaciones negativas, permisos, cambios de estado, anulaciones, auditoría, imágenes, exportación y comprobantes.

Resultados de integridad relevantes:

- Compra válida: 20 unidades al almacén de origen; transferencia válida: 5 unidades al destino.
- Venta válida: 2 unidades; anulación: restauración exacta.
- Compra anulable: reversión exacta. Compra con unidades trasladadas: rechazo 400 sin cambiar su estado.
- Inventario final del producto principal: **20** unidades; origen **15**, destino **5**, suma **20**.
- Entrada y salida manual compensadas: 200/200, stock inicial y final idénticos.
- Concurrencia PostgreSQL sobre 5 unidades: una salida de 4 aprobada y una rechazada; stock final **1**, nunca negativo.
- Segunda sesión invalida la primera; una sesión expirada se invalida, aunque `/me` responde 403 y confirma `BUG-LOGIN-001`.
- Cinco intentos inválidos bloquean la cuenta ficticia; el desbloqueo administrativo limpia intentos y genera auditoría.

## 5. Matriz final por caso

### Usuarios, roles y permisos

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-USR-001 | Aprobado | `AUTO-SQLITE`, `AUTO-PG`, API E2E, capturas de crear/editar | Alta/edición, normalización y contraseña no expuesta. |
| TC-USR-002 | Aprobado | `AUTO-PG`, `AUTO-FE`, validación visual móvil | Obligatorios y semántica rechazados por campo. |
| TC-USR-003 | Aprobado | API E2E, DB-R | Username, correo y documento duplicados devolvieron 400; no se creó ningún registro. |
| TC-USR-004 | Aprobado | `AUTO-PG` | Política de contraseña y conservación al editar aprobadas. |
| TC-USR-005 | Aprobado | `AUTO-PG`, API E2E | Vendedor recibe 403; no escala declarando otro rol. |
| TC-USR-006 | Aprobado | API E2E, DB-R | Bloqueo exacto, desbloqueo, cambio de estado, revocación y auditoría aprobados. |
| TC-USR-007 | Aprobado | `AUTO-PG`, API E2E, DB-R | Único Administrador protegido; usuario libre eliminado con auditoría sin secretos. |
| TC-USR-008 | **Falló** | Manual E2E, capturas de ayuda | Ayuda, foco y responsive aprobaron; el buscador no filtró las filas (`BUG-USR-003`). |

### Login y sesiones

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-LOGIN-001 | Aprobado | `AUTO-PG`, manual E2E | Login 200, datos públicos y redirección al Dashboard. |
| TC-LOGIN-002 | Aprobado | `AUTO-PG`, manual E2E | Mensaje genérico, 401 dentro del límite y 429 al excederlo. |
| TC-LOGIN-003 | Aprobado | API E2E, DB-R | Cuenta inactiva/bloqueada rechazada sin crear sesión. |
| TC-LOGIN-004 | Aprobado | API E2E, DB-R | Segundo login dejó una sola sesión activa e invalidó la anterior. |
| TC-LOGIN-005 | Aprobado | `AUTO-PG`, manual E2E | `/me` protegido y rutas administrativas no accesibles sin sesión/rol. |
| TC-LOGIN-006 | Aprobado | `AUTO-PG`, manual E2E | Logout invalidó sesión y regresó a Login. |
| TC-LOGIN-007 | **Falló** | API E2E con expiración controlada | Sesión se invalida, pero `/me` responde 403 y el interceptor solo gestiona 401 (`BUG-LOGIN-001`). |

### Categorías

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-CAT-001 | Aprobado | Manual E2E, API, [formulario](./03-modulo-categorias/evidencias/frontend/CAT-formulario-ayuda.png) | Creación 201 y disponibilidad en Producto. |
| TC-CAT-002 | Aprobado | `AUTO-PG`, manual E2E, [duplicado](./03-modulo-categorias/evidencias/frontend/CAT-duplicado-e2e.png) | Duplicado por mayúsculas/espacios rechazado. |
| TC-CAT-003 | Aprobado | `AUTO-PG` | Nombre numérico rechazado; alfanumérico aceptado. |
| TC-CAT-004 | Aprobado | API E2E, DB-R | Vendedor 403, libre 204 y relacionada 400 sin perder Producto. |

### Productos

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-PRD-001 | **Falló** | Manual/API E2E, [captura](./04-modulo-productos/evidencias/frontend/PRD-alta-error-e2e.png) | Alta devuelve 500: se pasa `quitar_imagen` a `Producto.objects.create` (`BUG-PRD-001`). |
| TC-PRD-002 | **Parcial** | `AUTO-PG`, API de edición | Semántica aprobada; la duplicidad por alta no puede revalidarse hasta corregir `BUG-PRD-001`. |
| TC-PRD-003 | Aprobado | API E2E | Precio negativo, IVA 101 y stock mínimo negativo devolvieron 400. |
| TC-PRD-004 | Aprobado | API E2E, DB-R | Editar/configurar conserva categoría y stock; Bodega autorizado. |
| TC-PRD-005 | Aprobado | `AUTO-PG`, API multipart E2E | Imagen real aceptada, archivo falso rechazado, reemplazo y eliminación sin residuos. |
| TC-PRD-006 | Aprobado | API E2E, [listado](./04-modulo-productos/evidencias/frontend/PRD-listado-actual.png) | Listado por roles; solo Administrador/Supervisor cambia estado. |

### Proveedores

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-PRV-001 | Aprobado | `AUTO-PG`, manual E2E | Alta y normalización correctas. |
| TC-PRV-002 | Aprobado | `AUTO-PG` | Duplicados, semántica y teléfono inválido rechazados. |
| TC-PRV-003 | Aprobado | `AUTO-PG`, `AUTO-FE`, capturas Colombia/exterior | Alta/edición y ambos modos de ubicación aprobados. |
| TC-PRV-004 | Aprobado | API E2E, manual de selector | Estado alterna correctamente y Compra rechaza proveedor inactivo. |
| TC-PRV-005 | **Falló** | API E2E, DB-R | Libre 200 y Vendedor 403; relacionado devuelve 500 por `ProtectedError` no controlado (`BUG-PRV-001`). |

### Clientes

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-CLI-001 | Aprobado | `AUTO-PG`, manual E2E | Alta válida 201. |
| TC-CLI-002 | Aprobado | `AUTO-PG` | Documento se valida según tipo y fronteras. |
| TC-CLI-003 | Aprobado | `AUTO-PG` | Documento, correo e identidad duplicada/incoherente rechazados. |
| TC-CLI-004 | Aprobado | `AUTO-PG`, `AUTO-FE`, capturas Colombia/exterior | Alta/edición y cambio de ubicación aprobados. |
| TC-CLI-005 | Aprobado | API E2E | Estado alterna; Venta rechaza cliente inactivo. |
| TC-CLI-006 | **Falló** | API E2E, DB-R | Libre 200 y Vendedor 403; relacionado devuelve 500 por `ProtectedError` no controlado (`BUG-CLI-001`). |

### Almacenes

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-ALM-001 | Aprobado | Manual E2E, captura de formulario | Alta válida y disponibilidad operativa. |
| TC-ALM-002 | Aprobado | `AUTO-PG` | Duplicados y semántica inválida rechazados. |
| TC-ALM-003 | Aprobado | API E2E, DB-R | Bodega edita; existencias permanecen iguales. |
| TC-ALM-004 | Aprobado | API E2E, DB-R | Libre 204; con stock 400 y sin pérdida. |
| TC-ALM-005 | Aprobado | API E2E, flujos Compra/Venta/Transferencia | Permisos y disponibilidad aprobados. |

### Inventario, movimientos y transferencias

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-INV-001 | Aprobado | `AUTO-PG`, E2E, DB-R | Compra incrementa, Venta descuenta y anulaciones restauran. |
| TC-INV-002 | Aprobado | `AUTO-PG`, API E2E | Sobreventa/sobre-salida rechazadas; restricción PostgreSQL impide negativo. |
| TC-INV-003 | Aprobado | API E2E, DB-R | Entrada/salida manual 200 y efecto compensado. |
| TC-INV-004 | Aprobado | `AUTO-PG`, manual E2E | Transferencia 5 unidades: resta origen, suma destino, total constante. |
| TC-INV-005 | Aprobado | API E2E | Cantidad cero, exceso y mismo origen/destino devuelven 400. |
| TC-INV-006 | Aprobado | API E2E, CSV, [stock](./08-modulo-inventario/evidencias/frontend/INV-stock-actual.png) | Listado/filtro/alertas/stock por almacén y CSV 200; Vendedor 403 al exportar. |
| TC-INV-007 | Aprobado | `AUTO-PG`, concurrencia PostgreSQL, DB-R | Idempotencia, compra consumida y dos salidas simultáneas sin stock negativo. |

### Compras y anulaciones

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-COM-001 | Aprobado | `AUTO-PG`, manual E2E, DB-R | Compra 201, totales 238.000 y entrada de 20 unidades. |
| TC-COM-002 | Aprobado | API E2E, DB-R | Factura duplicada, detalle vacío/referencia inexistente rechazados sin parcialidad. |
| TC-COM-003 | Aprobado | API E2E | Cantidad/costo/IVA fuera de rango rechazados; totales se recalculan. |
| TC-COM-004 | **Falló** | API E2E y reversión DB-R | Rollback de línea inexistente aprueba, pero producto inactivo fue aceptado (`BUG-COM-001`). |
| TC-COM-005 | Aprobado | `AUTO-PG`, API E2E, DB-R, [anulación](./09-modulo-compras/evidencias/frontend/COM-anulada-e2e.png) | Anulación auditable/reversible; compra con stock trasladado se rechaza. |
| TC-COM-006 | Aprobado | `AUTO-PG`, [detalle](./09-modulo-compras/evidencias/frontend/COM-detalle-e2e.png) | Listado y detalle histórico muestran snapshots/responsable. |

### Ventas, anulaciones y comprobantes

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-VTA-001 | Aprobado | `AUTO-PG`, manual E2E, DB-R | Venta 201, número único y salida exacta. |
| TC-VTA-002 | Aprobado | `AUTO-PG`, API E2E | Cantidades, precios y stock inválidos rechazados sin traza ni movimiento. |
| TC-VTA-003 | Aprobado | API/UI E2E | Subtotal 40.000, IVA 7.600, total 47.600; descuento excesivo rechazado. |
| TC-VTA-004 | **Falló** | API E2E y reversión DB-R | Efectivo insuficiente se rechaza, pero Débito sin datos condicionales se acepta (`BUG-VTA-001`). |
| TC-VTA-005 | Aprobado | API E2E, DB-R | Producto/cliente/almacén inactivos y segunda línea inválida hacen rollback. |
| TC-VTA-006 | Aprobado | `AUTO-PG`, API E2E, DB-R, [anulada](./10-modulo-ventas/evidencias/frontend/VTA-anulada-e2e.png) | Anulación restaura exactamente una vez y registra auditoría. |
| TC-VTA-007 | Aprobado | `AUTO-PG`, [comprobante](./10-modulo-ventas/evidencias/frontend/VTA-detalle-comprobante-e2e.png) | Lista, detalle y comprobante con datos ficticios e históricos coherentes. |

### Empresa

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-EMP-001 | Aprobado | `AUTO-PG`, API E2E | Singleton consultable y segundo POST 409. |
| TC-EMP-002 | Aprobado | `AUTO-PG`, API E2E | Solo Administrador modifica; DELETE 405. |
| TC-EMP-003 | **Falló** | API E2E con restauración inmediata | NIT `x` y teléfono alfabético fueron aceptados con 200 (`BUG-EMP-001`). |
| TC-EMP-004 | Aprobado | `AUTO-PG` | Formato real, tamaño, reemplazo, eliminación y conservación ante error. |
| TC-EMP-005 | Aprobado | `AUTO-PG`, [comprobante](./10-modulo-ventas/evidencias/frontend/VTA-detalle-comprobante-e2e.png) | Snapshot ficticio de Empresa aparece en el comprobante sin alterar históricos. |

### Dashboard

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-DSH-001 | Aprobado | `AUTO-PG`, manual E2E | Métricas y operaciones recientes coherentes. |
| TC-DSH-002 | Aprobado | `AUTO-PG` | Periodos, margen histórico y valores grandes correctos. |
| TC-DSH-003 | Aprobado | `AUTO-PG`, E2E | Compras/Ventas anuladas no se contabilizan. |
| TC-DSH-004 | Aprobado | `AUTO-PG` | Límites locales de día/semana/mes/año aprobados. |
| TC-DSH-005 | **Falló** | `AUTO-PG`, [vacío](./12-modulo-dashboard/evidencias/frontend/DSH-vacio-e2e.png), manual de error | Vacío, rendimiento y responsive aprueban; un 502 muestra el texto técnico completo (`BUG-DSH-001`). |

### Frontend compartido

| ID | Resultado | Evidencia ejecutada | Observación final |
|---|---|---|---|
| TC-FE-001 | Aprobado | Manual E2E, recarga | Claro, Azul y Oscuro aplican; Azul persistió al recargar. |
| TC-FE-002 | Aprobado | `AUTO-FE`, manual móvil/escritorio | Crear usa “registrar”, editar usa “actualizar”; datos permanecen. |
| TC-FE-003 | Aprobado | `AUTO-FE`, manual E2E | `Esc` cerró solo ayuda; modal/dato siguieron y foco volvió al botón. |
| TC-FE-004 | Aprobado | `AUTO-FE`, inspección manual | Ayuda no generó operación backend ni envío/almacenamiento funcional. |
| TC-FE-005 | Aprobado | `AUTO-FE`, manual E2E | Validadores compartidos y obligatorios funcionan sin bloquear nombres reales. |
| TC-FE-006 | Aprobado | `AUTO-FE`, manual E2E, capturas compartidas | Colombia/exterior y limpieza de campos aprobados. |
| TC-FE-007 | **Falló** | Manual E2E, API expirada | Responsive/notificaciones aprueban; expiración 403/401 y error técnico del Dashboard incumplen el contrato (`BUG-LOGIN-001`, `BUG-DSH-001`). |

## 6. Resumen por módulo

| Módulo | Casos | Aprobados | Parciales | Fallidos |
|---|---:|---:|---:|---:|
| Usuarios | 8 | 7 | 0 | 1 |
| Login | 7 | 6 | 0 | 1 |
| Categorías | 4 | 4 | 0 | 0 |
| Productos | 6 | 4 | 1 | 1 |
| Proveedores | 5 | 4 | 0 | 1 |
| Clientes | 6 | 5 | 0 | 1 |
| Almacenes | 5 | 5 | 0 | 0 |
| Inventario | 7 | 7 | 0 | 0 |
| Compras | 6 | 5 | 0 | 1 |
| Ventas | 7 | 6 | 0 | 1 |
| Empresa | 5 | 4 | 0 | 1 |
| Dashboard | 5 | 4 | 0 | 1 |
| Frontend compartido | 7 | 6 | 0 | 1 |
| **Total** | **78** | **67** | **1** | **10** |

## 7. Cierre

- No se ejecutaron pruebas contra datos operativos.
- No se conservaron credenciales, tokens, cookies ni encabezados de autorización en la documentación.
- No se modificó código de backend/frontend ni reglas de negocio.
- Los datos, sesiones, archivos multimedia, red y volúmenes E2E fueron efímeros.
- Los diez fallos y el caso parcial tienen trazabilidad explícita; la cobertura documental está completa, pero la liberación funcional no debe declararse totalmente aprobada hasta corregirlos y reejecutar sus casos.
