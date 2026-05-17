# 📸 Evidencias — Frontend (Angular) | Módulo Login

> Directorio destinado a capturas de pantalla tomadas durante las pruebas del módulo de Login en la interfaz Angular 19.

## Convención de nomenclatura

```
TC-LOGIN-{NRO}-frontend.png     → Captura principal del formulario/pantalla
TC-LOGIN-{NRO}-devtools.png     → DevTools del navegador (cuando aplique)
TC-LOGIN-{NRO}-console.png      → Consola de errores (cuando aplique)
TC-LOGIN-{NRO}-network.png      → Panel de red (cuando aplique)
```

## Archivos esperados

| Archivo | Caso | Descripción |
|---------|------|-------------|
| `TC-LOGIN-001-frontend.png` | TC-LOGIN-001 | Dashboard de admin tras login exitoso — menú completo visible |
| `TC-LOGIN-002-frontend.png` | TC-LOGIN-002 | Dashboard de supervisor — opciones de administración ocultas |
| `TC-LOGIN-003-frontend.png` | TC-LOGIN-003 | Mensaje "Usuario o contraseña incorrectos" — username no existe |
| `TC-LOGIN-004-frontend.png` | TC-LOGIN-004 | Campos vacíos con mensajes de validación |
| `TC-LOGIN-005-frontend.png` | TC-LOGIN-005 | Mensaje de error "Usuario inactivo. Contacte al administrador." |
| `TC-LOGIN-006-frontend.png` | TC-LOGIN-006 | Mensaje "Usuario o contraseña incorrectos" — contraseña incorrecta |
| `TC-LOGIN-007-frontend.png` | TC-LOGIN-007 | Formulario con cadena de inyección ingresada |
| `TC-LOGIN-007-console.png` | TC-LOGIN-007 | Consola Django mostrando el error 500 (stack trace en logs) |
| `TC-LOGIN-008-frontend.png` | TC-LOGIN-008 | Pantalla de login tras cerrar sesión correctamente |
| `TC-LOGIN-008-devtools.png` | TC-LOGIN-008 | DevTools → Application → localStorage vacío tras logout |
| `TC-LOGIN-009-frontend.png` | TC-LOGIN-009 | Redirección al login al intentar acceder a `/dashboard` sin token |
| `TC-LOGIN-009-network.png` | TC-LOGIN-009 | Panel de red mostrando la redirección del Angular Guard |
| `TC-LOGIN-010-frontend.png` | TC-LOGIN-010 | Dashboard vacío sin mensaje de error tras sesión expirada (BUG) |
| `TC-LOGIN-010-console.png` | TC-LOGIN-010 | Consola del navegador mostrando errores 401 sin redirección (BUG) |

> 📌 **Nota:** Adjuntar las capturas reales tomadas durante la ejecución de pruebas. Usar Chrome en resolución 1920x1080 para consistencia visual. Para capturas de DevTools, asegurarse de que los datos sensibles (tokens completos) estén oscurecidos si el documento es de distribución amplia.
