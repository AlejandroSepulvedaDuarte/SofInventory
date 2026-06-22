# Arquitectura del Frontend

## Visión general

El frontend está organizado por capas para separar responsabilidades:

- `core`: infraestructura compartida.
- `pages`: pantallas funcionales del sistema.
- `shared`: layout y componentes reutilizables.
- `styles.css`: sistema visual global.

## Core

### Guards

Controlan acceso a rutas autenticadas, públicas y administrativas.

### Interceptors

Insertan el token en memoria dentro de las peticiones HTTP y manejan errores globales de autenticación.

### Models

Definen las interfaces TypeScript usadas en componentes y servicios.

### Services

`api.services.ts` centraliza la comunicación con el backend y adapta payloads.

`auth.service.ts` administra la sesión en memoria y el usuario actual.

## Pages

Cada módulo funcional expone una pantalla standalone:

- `dashboard`
- `productos`
- `categorias`
- `inventario`
- `proveedores`
- `clientes`
- `compras`
- `ventas`
- `usuarios`

Cada componente de página concentra:

- carga de datos
- estado local del formulario
- validaciones de interfaz
- interacción con servicios

## Shared

- `layout.component.ts`: contenedor general de la aplicación.
- `sidebar`: navegación principal por módulos.
- `header`: cabecera contextual.

## Principios de diseño

- Mantener la sesión solo en memoria.
- Hacer explícita la adaptación entre Angular y Django.
- Evitar ambigüedad visual en productos mostrando `SKU - Nombre`.
- Favorecer contraste alto sin perder la identidad visual profesional.
