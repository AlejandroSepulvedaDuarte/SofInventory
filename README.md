# SofInventory Angular

Frontend Angular del sistema SofInventory. Este proyecto consume un backend Django REST y está orientado a la gestión de productos, inventario, clientes, proveedores, compras, ventas y usuarios.

## Objetivo

Centralizar la operación del inventario en una interfaz moderna, profesional y consistente con las reglas del backend.

> **Nota sobre sesiones:** el token de sesión se conserva en `localStorage` para mantener la sesión activa entre recargas. El interceptor lo agrega a cada petición HTTP y, si el backend responde `401`, limpia la sesión y redirige al login. En despliegues productivos se recomienda migrar a cookies `HttpOnly`.

## Tecnologías principales

- Angular 19
- TypeScript
- RxJS
- Angular Router
- Angular HttpClient
- Font Awesome
- Chart.js

## Estructura principal

```text
frontend/
  src/
    app/
      core/
        guards/
        interceptors/
        models/
        services/
      pages/
      shared/
    environments/
    styles.css
```

## Módulos funcionales

- `dashboard`: métricas, gráficos y resumen operativo.
- `productos`: catálogo, edición y cambios de estado.
- `categorias`: clasificación de productos.
- `inventario`: stock, alertas, almacenes y movimientos.
- `proveedores`: gestión de aliados comerciales.
- `clientes`: gestión de clientes naturales y jurídicos.
- `compras`: registro de abastecimiento y actualización de stock.
- `ventas`: registro comercial y salida de inventario.
- `usuarios`: administración de perfiles internos.

## Flujo de autenticación

- El login guarda token y usuario en `localStorage` (`auth_token`, `auth_expires_at`, `auth_user`) y restaura la sesión al recargar.
- El interceptor agrega el token a cada petición HTTP.
- Si el backend responde `401`, el frontend limpia la sesión y redirige al login.
- El token tiene una expiración de 12 horas definida por el backend (`SesionAPI`).

## Comandos útiles

Desde la carpeta `frontend`:

```powershell
npm install
npm start
npm run build
```

## Convenciones clave del proyecto

- Los contratos del backend se adaptan en `src/app/core/services/api.services.ts`.
- Las interfaces compartidas viven en `src/app/core/models/index.ts`.
- Los componentes standalone concentran template, estilos y lógica por módulo.
- El estilo visual global se controla desde `src/styles.css`.

## Accesibilidad visual

- Se prioriza alto contraste en encabezados de tablas y labels.
- Los formularios deben mantener foco visible.
- Cuando haya productos con nombres repetidos, la interfaz debe mostrar `SKU - Nombre`.

## Documentación adicional

Revisar la carpeta [docs]
\sofinventoryAngular\docs para estándares de codificación y guía de mantenimiento.
