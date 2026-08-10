# Evidencia frontend — Inventario

Capturas vigentes obtenidas el 8 de agosto de 2026. Después se registró una transferencia ficticia en E2E y se verificó por API/DB-R que 5 unidades salieron del origen, entraron al destino y el total permaneció en 20.

| Archivo | Evidencia | Casos relacionados |
|---|---|---|
| [INV-stock-actual.png](./INV-stock-actual.png) | Resumen y tabla de stock | TC-INV-006 |
| [INV-transferencia-ayuda.png](./INV-transferencia-ayuda.png) | Tipo Transferencia, origen, destino, cantidad y ayuda contextual | TC-INV-004, TC-INV-005, TC-FE-002 |

Cambios de cantidades, atomicidad, concurrencia y exportación quedaron demostrados con `AUTO`, `API` y `DB-R` en PostgreSQL 15 aislado; no requieren capturas duplicadas.
