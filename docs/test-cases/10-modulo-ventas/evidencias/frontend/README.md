# Evidencia frontend — Ventas

Capturas vigentes obtenidas el 8 de agosto de 2026. Las evidencias E2E se generaron con Cliente, Producto, Empresa y Almacén ficticios.

| Archivo | Evidencia | Casos relacionados |
|---|---|---|
| [VTA-formulario-pago-ayuda.png](./VTA-formulario-pago-ayuda.png) | Cliente general, almacén, selector de producto, resumen, efectivo y ayuda contextual | TC-VTA-001, TC-VTA-004, TC-FE-002 |
| [VTA-registro-e2e.png](./VTA-registro-e2e.png) | Confirmación visible del registro ficticio y sus totales | TC-VTA-001, TC-VTA-003 |
| [VTA-detalle-comprobante-e2e.png](./VTA-detalle-comprobante-e2e.png) | Comprobante con snapshot de Empresa, Cliente, responsable, almacén, IVA, efectivo y cambio | TC-VTA-003, TC-VTA-007, TC-EMP-005 |
| [VTA-anulada-e2e.png](./VTA-anulada-e2e.png) | Estado anulado visible después de restaurar stock | TC-VTA-006, TC-VTA-007 |

La restauración e idempotencia se acreditan con API/DB-R; no se necesitan capturas por cada variante de pago.
