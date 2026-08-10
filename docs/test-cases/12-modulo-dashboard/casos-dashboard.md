# Casos de prueba — Dashboard

> **Prefijo:** TC-DSH · **Cobertura mínima:** 5 casos · **Ejecución final:** 4 aprobados, 1 fallido · **Fecha:** 8 de agosto de 2026

## Alcance

Cubre métricas, periodos, comparaciones, gráficas, ventas recientes, reglas temporales, rendimiento y presentación responsive del Dashboard. El endpoint requiere una sesión autenticada y la interfaz adapta contenido según el rol.

## Matriz de casos

| ID | Nombre | Tipo | Funcionalidad que verifica | Precondiciones y rol | Datos ficticios | Resultado esperado | Automatización existente | Falta automatización | Evidencia | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-DSH-001 | Mostrar métricas y ventas recientes | Positivo / integración | Totales de proveedores, alertas de stock y datos recientes coherentes | Sesión autenticada; datos aislados conocidos | Un proveedor, producto con stock bajo y venta ficticia | HTTP 200; métricas y venta reciente coinciden con los registros válidos | `A` — prueba aprobada en SQLite/PostgreSQL; render E2E verificado | Falta prueba Angular automatizada | AUTO + API + MAN; [escritorio](./evidencias/frontend/DSH-escritorio-azul.png) | Alta |
| TC-DSH-002 | Calcular periodos, margen y valores grandes | Integración | Hoy/semana/mes/año, costo histórico, comparaciones y montos altos | Datos fechados/controlados; sesión autenticada | Ventas/compras con valores grandes y costos históricos | Valores/cantidades exactos; margen usa costo histórico; operaciones sin costo se informan | `A` — `DashboardPeriodosTests::test_periodos_valores_grandes_y_margen_por_costo_historico` | No para backend; falta selección visual de periodos | AUTO + API + MAN | Alta |
| TC-DSH-003 | Excluir estados no contabilizables | Negativo / integración | Ventas anuladas y compras anuladas/pendientes no contaminan indicadores | Operaciones en varios estados; sesión autenticada | Una completada, una anulada y una pendiente | Solo estados contabilizables suman en métricas y series | `A` — `backend/dashboard/tests.py::DashboardPeriodosTests::test_anuladas_y_pendientes_no_se_contabilizan` | No para backend; ejecutar con datos aislados | AUTO + API + DB-R opcional | Alta |
| TC-DSH-004 | Respetar zona horaria y límites de periodo | Integración | Día, semana iniciando lunes, mes y año en `America/Bogota` | Reloj controlado; sesión autenticada | Operaciones alrededor de medianoche y fronteras de periodo | Cada operación cae en el periodo local correcto; reglas declaradas coinciden | `A` — `test_limites_locales_de_dia_semana_mes_y_anio` en `backend/dashboard/tests.py` | Parcial: caso explícito de cambio de año/horario si aplica | AUTO + API | Alta |
| TC-DSH-005 | Manejar vacío, errores, rendimiento y responsive | Interfaz / integración | Ceros sin división, series completas, límite de consultas, carga/error y diseño por rol/viewport | Base aislada vacía; error API simulado; roles representativos | Sin operaciones; respuesta fallida controlada; escritorio y móvil | No hay `NaN`/infinito; series conservan puntos; consultas dentro del umbral; carga/error comprensibles; sin desbordamiento | `P` — `test_periodos_vacios_no_dividen_por_cero_y_series_se_completan` también comprueba ≤25 consultas; no hay test Angular | Sí: DOM, vacío, fallo HTTP y rol; escritorio/móvil actuales se verificaron manualmente | AUTO + MAN; [escritorio](./evidencias/frontend/DSH-escritorio-azul.png) y [móvil](./evidencias/frontend/DSH-movil-azul.png) | Alta |

## Evidencia visual mínima

El conjunto vigente contiene Dashboard en tema Azul para escritorio/móvil y [estado vacío E2E en tema Oscuro](./evidencias/frontend/DSH-vacio-e2e.png). Sus cálculos se ejecutaron en SQLite y PostgreSQL; no requieren capturas separadas.

![Dashboard en escritorio, tema Azul](./evidencias/frontend/DSH-escritorio-azul.png)

![Dashboard en móvil, tema Azul](./evidencias/frontend/DSH-movil-azul.png)

## Riesgos pendientes

- La cobertura backend es sólida para cálculos, pero no prueba el componente Angular.
- Deben simularse estados de carga, vacío y error, no solo respuestas exitosas.
- El rendimiento medido en SQLite debe contrastarse en PostgreSQL con un volumen representativo y aislado.

## Resultado final de ejecución

| Total | Aprobados | Fallidos |
|---:|---:|---:|
| 5 | 4 | 1 |

Cálculos, periodos, exclusión de anuladas y zona horaria aprobaron en SQLite/PostgreSQL. TC-DSH-005 aprobó vacío, rendimiento y responsive, pero falló globalmente porque un 502 expone texto HTTP técnico (`BUG-DSH-001`). Ver [resultados trazables](../RESULTADOS_EJECUCION_2026-08-08.md#dashboard).
