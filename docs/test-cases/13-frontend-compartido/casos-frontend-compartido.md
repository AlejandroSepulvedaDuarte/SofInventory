# Casos de prueba — Frontend compartido, temas, ayuda y responsive

> **Prefijo:** TC-FE · **Cobertura mínima:** 7 casos · **Ejecución final:** 6 aprobados, 1 fallido · **Fecha:** 8 de agosto de 2026

## Alcance

Cubre Temas Claro, Azul y Oscuro; ayuda contextual; formularios y validaciones compartidas; ubicación; notificaciones; interceptor/guards; teclado, foco y diseño responsive. Las 24 pruebas Node actuales inspeccionan funciones y archivos fuente, pero no ejecutan componentes Angular en un DOM ni un navegador real.

## Matriz de casos

| ID | Nombre | Tipo | Funcionalidad que verifica | Precondiciones y rol | Datos ficticios | Resultado esperado | Automatización existente | Falta automatización | Evidencia | Prioridad |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-FE-001 | Aplicar y persistir los tres temas | Interfaz | Selector de tema, `data-theme`, persistencia permitida de preferencia y fallback | Navegador con/sin `localStorage`; cualquier usuario y Login | Claves `light`, `blue`, `dark`, valor guardado inválido | Cada tema se aplica y conserva; valor inválido o almacenamiento no disponible cae en Oscuro sin romper la app | `M` — no se localizó prueba de `ThemeService` | Sí: unit test Angular y verificación visual | AUTO + MAN; capturas compartidas Claro/Oscuro/Azul | Alta |
| TC-FE-002 | Abrir ayuda con título correcto en crear/editar | Interfaz | Botón real, icono+“Ayuda” en escritorio, solo icono en móvil, títulos registrar/actualizar y contenido por formulario | Formulario de creación y uno de edición abiertos | Producto o Cliente ficticio escrito parcialmente | El panel abre sin enviar ni borrar; título y contenido corresponden a operación/formulario | `P` — 9/9 pruebas de `frontend/tests/form-help.test.mjs` aprobadas; creación/edición verificadas manualmente en Usuarios | Sí: DOM Angular automatizado, click/Enter/Space y más formularios | AUTO + MAN; capturas vigentes de Usuario | Alta |
| TC-FE-003 | Cerrar ayuda con Escape y restaurar foco | Interfaz / accesibilidad | Escape cierra solo la ayuda, no el modal; foco vuelve al disparador; ARIA y tabulación | Modal con ayuda abierta y datos ingresados | Texto ficticio en uno o más campos | Datos permanecen; modal principal sigue abierto; `aria-expanded` cambia; foco retorna | `P` — prueba Node aprobada y verificación manual de `document.activeElement` aprobada en Usuarios | Sí: prueba Angular de componente y recorrido completo de tabulación | AUTO + MAN | Crítica |
| TC-FE-004 | Aislar la ayuda de red y almacenamiento | Seguridad / integración | Abrir/cerrar ayuda no hace HTTP ni guarda contenido/estado en Local o Session Storage | Espías de `HttpClient`, `localStorage` y `sessionStorage`; formulario abierto | Contenido de ayuda estático | Cero solicitudes y cero escrituras atribuibles a ayuda; el formulario conserva valores/touched | `P` — la prueba correspondiente de `form-help.test.mjs` fue ejecutada y aprobada, pero inspecciona fuente | Sí: spies en ejecución Angular real | AUTO | Alta |
| TC-FE-005 | Validar y normalizar formularios compartidos | Negativo / interfaz | Mensajes por campo, resumen, foco al primer error y validadores semánticos sin bloquear nombres reales | Formulario representativo; cualquier rol con acceso | Tildes, ñ, apóstrofo, guion, espacios, valor numérico inválido, documento por tipo | Valores reales válidos se aceptan; inválidos muestran mensaje accesible; no hay envío; foco llega al primer error | `P` — 7/7 pruebas de `frontend/tests/semantic-validators.test.mjs` aprobadas; obligatorios verificados manualmente en Usuarios | Sí: `FormFeedbackService`, `FieldValidationDirective` y `FieldErrorComponent` en Angular | AUTO + MAN; captura vigente de validaciones de Usuario | Alta |
| TC-FE-006 | Operar ubicación Colombia/exterior en DOM | Positivo / negativo | Departamento habilita municipios, cambios limpian valores ocultos, exterior usa campos manuales y legacy se conserva | Formularios de Cliente/Proveedor/Empresa | Antioquia/Medellín, combinación inválida y ubicación exterior ficticia | Opciones y limpieza correctas; mensajes en español; sin valores ocultos enviados | `P` — 8/8 pruebas de `frontend/tests/location-form.test.mjs` aprobadas | Sí: automatización Angular del componente; ambos modos se verificaron manualmente en formularios reales | AUTO + MAN; [Cliente Colombia](../06-modulo-clientes/evidencias/frontend/CLI-ubicacion-colombia.png), [Cliente exterior](../06-modulo-clientes/evidencias/frontend/CLI-ubicacion-exterior.png), [Proveedor Colombia](../05-modulo-proveedores/evidencias/frontend/PRV-ubicacion-colombia.png) y [Proveedor exterior](../05-modulo-proveedores/evidencias/frontend/PRV-ubicacion-exterior.png) | Alta |
| TC-FE-007 | Probar guards, interceptor, notificaciones y responsive global | Seguridad / permisos / interfaz | Rutas auth/admin, cabecera Bearer, expiración 401/403, contenedor de notificaciones, modales/tablas sin overflow | Sesiones válida/ausente/expirada; roles Administrador y no administrador; viewports móvil/escritorio | Respuestas simuladas 401 y 403 sin exponer token | Guards redirigen según rol; token solo se adjunta donde corresponde; sesión expirada se limpia/redirige según contrato; notificación accesible; UI usable en todos los temas/viewports | `M` — no se localizaron tests Angular/E2E; el interceptor actual maneja 401 y el backend puede devolver 403 por expiración | Sí: unit/integration/E2E, incluido el desajuste 401/403 | AUTO + MAN; conjunto visual mínimo compartido | Crítica |

## Formularios que debe recorrer la validación compartida

La ayuda contextual está integrada en los formularios reales de Categorías, Productos, Clientes, Proveedores, Usuarios, Empresa, Almacenes, movimientos de Inventario, Compras y Ventas. La matriz debe ejecutar al menos creación y edición donde ambas operaciones existan; Compras y Ventas actualmente son de registro y no deben documentarse como edición.

## Evidencia visual mínima

No se propone una captura por caso. Se reutilizan las imágenes funcionales de cada módulo para comprobar temas, ayuda y responsive. Como mínimo, el conjunto global debe mostrar:

- un formulario en tema Claro y viewport móvil;
- un formulario con ayuda en tema Oscuro y escritorio;
- Dashboard en tema Azul en [escritorio](../12-modulo-dashboard/evidencias/frontend/DSH-escritorio-azul.png) y [móvil](../12-modulo-dashboard/evidencias/frontend/DSH-movil-azul.png);
- ubicación Colombia y exterior;
- una notificación de error accesible sin datos sensibles.

Las evidencias vigentes de Login, Usuarios y los módulos 03–12 cubren ya los viewports y ayudas principales. La verificación visual completa de los tres temas en un mismo formulario sigue siendo manual y no debe declararse automatizada.

## Riesgos pendientes

- Los tests Node actuales son valiosos como pruebas estáticas, pero no garantizan interacción, foco, accesibilidad ni renderizado.
- El interceptor solo gestiona 401 fuera de Login/Logout; debe probarse el 403 que puede devolver una sesión expirada antes de declarar resuelto el flujo.
- La preferencia de tema sí usa `localStorage` de forma intencional; la ayuda contextual no debe usar ningún almacenamiento.

## Ejecución registrada

```text
Runtime: Node.js 20.20.2 en contenedor temporal node:20-alpine
Montaje: repositorio completo en /workspace, solo lectura
Comando: npm test desde /workspace/frontend
Resultado: 24 pruebas aprobadas, 0 fallos
```

La primera tentativa montó solo `frontend` y no encontró `backend/catalogos/data/colombia.json`; se descartó como error de preparación. La repetición con el repositorio completo en solo lectura finalizó correctamente.

## Resultado final de ejecución

| Total | Aprobados | Fallidos |
|---:|---:|---:|
| 7 | 6 | 1 |

Los tres temas, ayuda crear/editar, `Esc`, retorno de foco, aislamiento, validadores y ubicación aprobaron. TC-FE-007 falló por el contrato de expiración 403/401 y por el mensaje técnico del Dashboard (`BUG-LOGIN-001`, `BUG-DSH-001`). El build Angular aprobó con advertencias de presupuesto. Ver [resultados trazables](../RESULTADOS_EJECUCION_2026-08-08.md#frontend-compartido).
