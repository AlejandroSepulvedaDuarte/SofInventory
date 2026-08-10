# Evidencia frontend — Productos

Capturas vigentes obtenidas el 8 de agosto de 2026. El alta se intentó con datos ficticios en E2E y reprodujo `BUG-PRD-001`; un Producto sembrado directamente en la base aislada permitió continuar los casos no bloqueados.

| Archivo | Evidencia | Casos relacionados |
|---|---|---|
| [PRD-formulario-ayuda.png](./PRD-formulario-ayuda.png) | Formulario vacío, campos reales y ayuda contextual | TC-PRD-001, TC-PRD-004, TC-FE-002 |
| [PRD-listado-actual.png](./PRD-listado-actual.png) | Tabla actual con referencia, categoría, precio, stock y estado | TC-PRD-006 |
| [PRD-alta-error-e2e.png](./PRD-alta-error-e2e.png) | Formulario válido que recibe el error genérico correspondiente al 500 del alta | TC-PRD-001 |

Límites, edición, stock, permisos y ciclo de imagen se ejecutaron por API/DB-R; el alta continúa fallida y la duplicidad HTTP queda bloqueada por el mismo defecto.
