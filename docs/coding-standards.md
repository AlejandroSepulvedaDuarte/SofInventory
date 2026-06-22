# Estándares de Codificación

## Objetivo

Mantener una base de código clara, consistente y fácil de extender entre varios desarrolladores.

## Reglas generales

- Usar nombres descriptivos en español o inglés técnico consistente, evitando mezclas ambiguas.
- Preferir funciones pequeñas con una sola responsabilidad.
- Mantener la lógica de adaptación al backend dentro de servicios, no dentro del template.
- No introducir `localStorage` ni `sessionStorage` para sesión o datos sensibles.
- Evitar duplicar contratos; reutilizar interfaces desde `core/models`.

## Angular

- Usar componentes standalone como estándar del proyecto.
- Mantener rutas centralizadas en `app.routes.ts`.
- Los guards deben vivir en `core/guards`.
- Los interceptores deben vivir en `core/interceptors`.
- La comunicación HTTP debe centralizarse en `core/services/api.services.ts`.
- Los templates deben permanecer declarativos; la lógica repetitiva debe ir al componente `.ts`.

## TypeScript

- Declarar tipos explícitos cuando aporten claridad.
- Evitar `any` salvo integraciones muy dinámicas o respuestas externas difíciles de tipar.
- Reutilizar interfaces existentes antes de crear nuevas.
- Validar y transformar payloads antes de enviarlos al backend.

## HTML y Templates

- Mantener estructura semántica y legible.
- Evitar lógica compleja dentro de expresiones del template.
- Para listados de productos repetidos, mostrar siempre `SKU - Nombre`.
- Los textos de error deben ser claros y útiles para el usuario.

## CSS

- Mantener el lenguaje visual oscuro-profesional actual.
- Priorizar contraste suficiente en encabezados, labels y textos secundarios.
- Reutilizar variables CSS globales en `src/styles.css`.
- No introducir estilos aislados que rompan la consistencia del sistema.

## Comentarios

- Agregar comentarios de encabezado para explicar la responsabilidad del archivo.
- Agregar comentarios de bloque solo cuando una sección necesite contexto extra.
- Evitar comentarios obvios que repitan literalmente lo que ya expresa el código.

## Integración con backend

- Confirmar el nombre real de los campos que espera Django antes de cambiar formularios.
- Adaptar diferencias entre frontend y backend dentro de los servicios.
- Cuando el backend use relaciones por ID, el frontend debe enviar el identificador correcto y no inferencias basadas en nombre visible.
