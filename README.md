# SofInventory Angular

Frontend Angular del sistema SofInventory. Este proyecto consume un backend Django REST y está orientado a la gestión de productos, inventario, clientes, proveedores, compras, ventas y usuarios.

## Objetivo

Centralizar la operación del inventario en una interfaz moderna, profesional y consistente con las reglas del backend, evitando guardar sesión en `localStorage` o `sessionStorage`.

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

- El login guarda token y usuario únicamente en memoria.
- El interceptor agrega el token a cada petición HTTP.
- Si el backend responde `401`, el frontend redirige al login.
- No se usan mecanismos de persistencia del navegador para la sesión.

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
