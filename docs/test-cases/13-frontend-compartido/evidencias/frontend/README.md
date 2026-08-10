# Evidencia frontend compartida

La evidencia visual se reutiliza desde los módulos funcionales para evitar capturas redundantes:

| Comportamiento | Evidencia reutilizada | Casos |
|---|---|---|
| Ayuda crear/editar y adaptación móvil | [Usuario crear](../../../01-modulo-usuarios/evidencias/frontend/USR-formulario-ayuda-crear.png), [Usuario editar móvil](../../../01-modulo-usuarios/evidencias/frontend/USR-formulario-ayuda-editar-movil.png) | TC-FE-002, TC-FE-003 |
| Validación y foco de errores | [Validaciones de Usuario](../../../01-modulo-usuarios/evidencias/frontend/USR-validaciones-obligatorios-movil.png) | TC-FE-005 |
| Ubicación Colombia/exterior | [Cliente Colombia](../../../06-modulo-clientes/evidencias/frontend/CLI-ubicacion-colombia.png), [Cliente exterior](../../../06-modulo-clientes/evidencias/frontend/CLI-ubicacion-exterior.png) | TC-FE-006 |
| Tema Oscuro | [Dashboard vacío](../../../12-modulo-dashboard/evidencias/frontend/DSH-vacio-e2e.png) | TC-FE-001, TC-FE-007 |
| Tema Azul y responsive | [Dashboard escritorio](../../../12-modulo-dashboard/evidencias/frontend/DSH-escritorio-azul.png), [Dashboard móvil](../../../12-modulo-dashboard/evidencias/frontend/DSH-movil-azul.png) | TC-FE-001, TC-FE-007 |
| Tema Claro | [Login móvil](../../../02-modulo-login/evidencias/frontend/LOGIN-error-movil-claro.png) | TC-FE-001, TC-FE-007 |

La prueba manual adicional confirmó que `Esc` cerró solo la ayuda, conservó el modal y el dato parcial, y devolvió el foco al botón. Las comprobaciones de red/almacenamiento se sustentan con 24/24 pruebas Node y no con capturas de herramientas de desarrollo.
