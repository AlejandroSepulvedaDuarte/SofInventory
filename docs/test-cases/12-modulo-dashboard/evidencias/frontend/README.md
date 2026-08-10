# Evidencia frontend — Dashboard

Capturas vigentes obtenidas el 8 de agosto de 2026. Las dos primeras documentan tema Azul y la tercera un Dashboard completamente vacío sobre PostgreSQL E2E aislado.

| Archivo | Evidencia | Casos relacionados |
|---|---|---|
| [DSH-escritorio-azul.png](./DSH-escritorio-azul.png) | Encabezado, métricas y bloques de Ventas/Compras en escritorio | TC-DSH-001, TC-DSH-005 |
| [DSH-movil-azul.png](./DSH-movil-azul.png) | Reflujo de encabezado, tarjetas y bloques en móvil sin desbordamiento horizontal visible | TC-DSH-005 |
| [DSH-vacio-e2e.png](./DSH-vacio-e2e.png) | Ceros coherentes, ausencia de `NaN`/infinito y bloques sin datos en tema Oscuro | TC-DSH-005 |

Las cifras se contrastaron con 99/99 pruebas backend en SQLite y PostgreSQL. El estado de indisponibilidad se verificó manualmente y detectó `BUG-DSH-001`; se documenta como resultado, sin conservar una captura adicional que duplique el mensaje.
