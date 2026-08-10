# SofInventory — Arquitectura del frontend

> **Versión:** 2.0.0
>
> **Actualizado:** 8 de agosto de 2026
>
> **Runtime:** Angular 19.2.21 · TypeScript 5.6.3 · RxJS 7.8 · Node.js 20 Alpine
>
> **Estado:** arquitectura vigente del repositorio

---

## 1. Propósito y alcance

Este documento describe cómo está construido el frontend real de SofInventory, cómo fluyen los datos y dónde debe ubicarse cada responsabilidad. No corresponde al frontend HTML/JavaScript estático de versiones anteriores.

Incluye:

- Arranque y configuración de Angular.
- Rutas, layout, autenticación y roles.
- Capas `core`, `pages` y `shared`.
- Estado con signals y comunicación con RxJS.
- Formularios, ubicaciones, notificaciones y ayuda contextual.
- Temas visuales y responsive.
- Integración con Django y despliegue Docker.
- Pruebas, límites actuales y evolución recomendada.

Las reglas de escritura están en [coding-standards.md](coding-standards.md) y los criterios visuales en [accessibility-visual-guide.md](accessibility-visual-guide.md).

---

## 2. Resumen ejecutivo

SofInventory es una SPA Angular formada exclusivamente por componentes standalone. Las rutas cargan cada página de forma diferida. No utiliza NgRx ni otro almacén global: el estado local se modela con signals y los estados compartidos viven en servicios singleton.

```text
Navegador
   │
   ├── AppComponent
   │     ├── RouterOutlet ── carga diferida de páginas
   │     └── NotificationContainerComponent
   │
   ├── Página funcional
   │     └── LayoutComponent
   │           ├── SidebarComponent
   │           ├── HeaderComponent
   │           └── contenido de la página
   │
   └── Core services
         ├── HttpClient + authInterceptor
         ├── AuthService
         ├── servicios de dominio
         ├── EmpresaService
         └── ThemeService
                     │
                     ▼
                /api en Django
```

Principios vigentes:

- Backend como autoridad de permisos y reglas de negocio.
- HTTP encapsulado en servicios.
- Contratos compartidos en `core/models`.
- Formularios template-driven con infraestructura común de validación.
- Temas mediante custom properties CSS.
- Estado de ayuda estrictamente local.
- Configuración de API en tiempo de ejecución.

---

## 3. Estructura de directorios

```text
frontend/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts
│   │   │   ├── models/
│   │   │   │   └── index.ts
│   │   │   └── services/
│   │   │       ├── api.services.ts
│   │   │       ├── auth.service.ts
│   │   │       ├── empresa.service.ts
│   │   │       └── theme.service.ts
│   │   ├── pages/
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── usuarios/
│   │   │   ├── categorias/
│   │   │   ├── productos/
│   │   │   ├── proveedores/
│   │   │   ├── clientes/
│   │   │   ├── inventario/
│   │   │   ├── compras/
│   │   │   ├── ventas/
│   │   │   └── empresa/
│   │   └── shared/
│   │       ├── components/
│   │       ├── form-help/
│   │       ├── forms/
│   │       ├── locations/
│   │       └── notifications/
│   ├── assets/
│   ├── environments/
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── tests/
├── angular.json
├── package.json
├── Dockerfile
├── docker-entrypoint.sh
└── nginx.conf
```

Cada página mantiene `.ts`, `.html` y `.css` juntos. Los almacenes y movimientos pertenecen actualmente a la página Inventario; no existe una página independiente de Almacenes.

---

## 4. Arranque de la aplicación

### 4.1 `main.ts`

El punto de entrada registra el locale colombiano y arranca la aplicación standalone.

```typescript
registerLocaleData(localeEsCo);

bootstrapApplication(AppComponent, appConfig)
  .catch((error) => console.error(error));
```

### 4.2 `app.config.ts`

Los providers globales son:

- Router.
- `HttpClient` con `authInterceptor` funcional.
- Animaciones de Angular.
- `LOCALE_ID` con valor `es-CO`.

No existe un `AppModule`.

### 4.3 `AppComponent`

El componente raíz contiene únicamente:

- `<router-outlet>` para la página activa.
- `<app-notification-container>` para notificaciones globales.

Esta decisión evita acoplar las notificaciones a una página o al layout autenticado.

---

## 5. Rutas y control de acceso

Todas las pantallas se cargan con `loadComponent`, por lo que cada ruta genera un límite de carga diferida.

| Ruta | Página | Guard de interfaz | Observación |
|---|---|---|---|
| `/login` | Login | `guestGuard` | Solo visitante sin sesión activa |
| `/dashboard` | Dashboard | `authGuard` | Inicio autenticado |
| `/productos` | Productos | `authGuard` | Acciones finales dependen del backend |
| `/categorias` | Categorías | `authGuard` | Acciones finales dependen del backend |
| `/proveedores` | Proveedores | `authGuard` | Acciones finales dependen del backend |
| `/clientes` | Clientes | `authGuard` | Acciones finales dependen del backend |
| `/compras` | Compras | `authGuard` | Registro y anulación tienen permisos distintos |
| `/ventas` | Ventas | `authGuard` | Acciones autorizadas por el backend |
| `/inventario` | Inventario y almacenes | `authGuard` | Ajustes y mantenimiento dependen del rol |
| `/usuarios` | Usuarios | `authGuard`, `adminGuard` | Solo Administrador |
| `/empresa` | Empresa | `authGuard`, `adminGuard` | Edición administrativa |

La ruta vacía y cualquier ruta desconocida redirigen al Dashboard.

Los guards solo controlan navegación. El backend conserva la autoridad mediante `@require_roles`; ocultar un enlace o bloquear una ruta no es un permiso de seguridad suficiente.

---

## 6. Capa `core`

`core` contiene infraestructura de alcance global y contratos usados por más de un módulo. No debe depender de una página concreta.

### 6.1 Models

`core/models/index.ts` define interfaces para:

- Autenticación y usuario público.
- Usuarios, roles y tipos de documento.
- Categorías y productos.
- Proveedores y clientes.
- Compras y detalles.
- Ventas y detalles.
- Empresa.
- Almacenes, stock y movimientos.
- Dashboard, periodos, comparaciones y series.

Las interfaces reflejan tanto respuestas como formularios. Algunas propiedades son opcionales porque la misma entidad se usa en creación, listado y detalle.

Regla de evolución: si un contrato crece hasta mezclar demasiados contextos, crear tipos explícitos de lectura, escritura y formulario antes de añadir más `any` o propiedades opcionales.

### 6.2 Servicios de dominio HTTP

`api.services.ts` funciona hoy como fachada y exporta:

- `UsuariosService`.
- `ProductosService`.
- `ProveedoresService`.
- `ClientesService`.
- `ComprasService`.
- `VentasService`.
- `InventarioService`.
- `DashboardService`.

Cada clase encapsula endpoints y, cuando el contrato lo requiere, transforma el formulario en un payload del backend.

```typescript
listar(): Observable<Cliente[]> {
  return this.http.get<Cliente[]>(`${API}/clientes/listar/`);
}

crear(data: Partial<Cliente>): Observable<unknown> {
  return this.http.post(
    `${API}/clientes/crear/`,
    this.toPayload(data),
  );
}
```

`EmpresaService` está separado porque además expone estado compartido mediante signals:

- `empresa`.
- `configurada`.
- `puedeEditar`.

El sidebar consume ese estado para presentar el nombre y logo de la empresa.

### 6.3 `AuthService`

Responsabilidades actuales:

- Enviar credenciales a `/api/auth/login/`.
- Mantener token, expiración, usuario e indicador de login mediante signals.
- Calcular `isAuthenticated`.
- Consultar `/api/auth/me/`.
- Invalidar la sesión mediante logout.
- Resolver roles para navegación.
- Restaurar y limpiar la sesión persistida.

Persistencia vigente:

| Clave | Contenido |
|---|---|
| `auth_token` | Token bearer |
| `auth_expires_at` | Fecha de expiración |
| `auth_user` | Usuario público serializado |

Solo `AuthService` debe manipular estas claves. Los componentes no deben acceder directamente a `localStorage` ni guardar contraseñas o formularios.

### 6.4 Interceptor

`authInterceptor`:

1. Lee el token mediante `AuthService`.
2. Clona la petición con `Authorization: Bearer ...`.
3. Deja sin token las solicitudes cuando no existe sesión.
4. Ante `401` fuera de Login/Logout, limpia la sesión y redirige a Login.
5. Propaga el error para que el consumidor lo gestione.

Existe un defecto documentado: una sesión expirada puede producir `403`, mientras el interceptor solo ejecuta la limpieza automática ante `401`. Esta diferencia no debe documentarse como resuelta hasta corregir el contrato y ejecutar su regresión.

### 6.5 `ThemeService`

Maneja los temas:

```typescript
export type ThemeKey = 'light' | 'blue' | 'dark';
```

El servicio:

- Expone el tema actual como signal de solo lectura.
- Declara etiqueta e icono de cada opción.
- Aplica `data-theme` sobre `<html>`.
- Persiste la preferencia en `sof_inventory_theme`.
- Usa Oscuro como fallback.

`index.html` aplica el tema guardado antes del arranque de Angular para reducir el destello visual.

---

## 7. Capa `shared`

`shared` contiene UI, lógica de presentación y utilidades reutilizadas por varios dominios. No contiene reglas definitivas de inventario, permisos o cálculos contables.

### 7.1 Layout

`LayoutComponent` ensambla:

- `SidebarComponent`.
- `HeaderComponent`.
- Contenido proyectado con `<ng-content>`.

El layout usa signals para colapso y apertura móvil. La página principal desplaza su contenido verticalmente y oculta desbordamiento horizontal en móvil.

### 7.2 Sidebar

Responsabilidades:

- Navegación principal.
- Navegación administrativa condicionada por `isAdmin`.
- Identidad de empresa y usuario.
- Colapso en escritorio.
- Panel lateral y backdrop en móvil.
- Cierre de sesión.

La lista principal incluye Dashboard, Productos, Categorías, Inventario, Proveedores, Clientes, Compras y Ventas. Empresa y Usuarios se presentan en la sección administrativa.

### 7.3 Header

Responsabilidades:

- Breadcrumb contextual.
- Hora local.
- Selector de tema.
- Identidad resumida del usuario.
- Cierre de sesión.
- Apertura del menú móvil.

`PAGE_TITLES` traduce la ruta activa. Si se agrega una ruta debe actualizarse el mapa o migrarse esta metadata a la configuración de rutas.

### 7.4 Formularios compartidos

```text
Componente de página
   │
   ├── FormFeedbackState
   │      ├── summary: signal<string>
   │      └── fields: signal<Record<string, string>>
   │
   ├── appFieldValidation
   │      ├── clase is-invalid
   │      ├── aria-invalid
   │      └── aria-describedby
   │
   ├── app-field-error
   └── app-form-error-summary
```

`FormFeedbackService` normaliza:

- Ausencia de conexión.
- Estados `401` y `403`.
- Errores `5xx`.
- Errores por campo de DRF.
- Alias entre nombres del backend y del formulario.
- Mensajes técnicos que no deben exponerse.

Después de un rechazo con errores por campo, desplaza y enfoca el primer control inválido dentro del selector de alcance configurado.

### 7.5 Validadores semánticos

`semantic-validators.ts` contiene funciones puras para:

- Normalizar espacios.
- Nombres de persona.
- Lugares.
- Cargos de contacto.
- Nombres comerciales.
- Nombre de usuario.
- Documento según tipo.

Estas funciones complementan la validación inmediata; no reemplazan los serializers.

### 7.6 Ubicaciones

`LocationFieldsComponent` centraliza el formulario geográfico de Clientes, Proveedores y Empresa.

Modo Colombia:

- País fijo Colombia.
- Departamento desde catálogo local.
- Municipio filtrado por departamento.
- Reconciliación de variantes antiguas.

Modo exterior:

- País, estado/provincia/departamento y ciudad manuales.
- Validación semántica y normalización.

El catálogo fuente se encuentra en `backend/catalogos/data/colombia.json` y se consume mediante el endpoint de catálogos.

### 7.7 Notificaciones

`NotificationService` conserva una lista de avisos en un signal y administra temporizadores. Admite éxito, advertencia y error; pausa la expiración con hover o foco y permite cierre explícito.

`NotificationContainerComponent` vive en la raíz para que una navegación o layout no elimine avisos activos.

### 7.8 Ayuda contextual

La solución se divide en:

| Archivo | Responsabilidad |
|---|---|
| `form-help-content.ts` | Contrato, claves y contenido central por formulario |
| `form-help.component.ts` | Estado, título dinámico, `Escape` y foco |
| `form-help.component.html` | Botón y estructura semántica del panel |
| `form-help.component.css` | Panel lateral/inferior, temas y responsive |

`FormHelpContent` separa objetivo, recomendaciones, relaciones y checklist. Los títulos aceptan variantes `create` y `edit`.

El componente:

- No emite solicitudes.
- No usa almacenamiento.
- No modifica el formulario.
- Mantiene su estado en un signal.
- Cierra solo la ayuda con `Escape`.
- Devuelve el foco al botón.
- Oculta visualmente “Ayuda” hasta `640px` sin perder el nombre accesible.

Los diez formularios de interfaz consumen una configuración central para Productos, Categorías, Clientes, Proveedores, Usuarios, Empresa, Almacenes, Compras, Ventas y movimientos de Inventario.

---

## 8. Capa `pages`

Una página funcional coordina datos, estado local, presentación y acciones del usuario. No debe duplicar infraestructura global.

| Página | Responsabilidad principal | Formularios asociados |
|---|---|---|
| Login | Autenticación, bloqueo y selección de tema | Acceso |
| Dashboard | Métricas, periodos, comparaciones y gráficas | No aplica |
| Usuarios | Gestión de cuentas, roles, estado y desbloqueo | Crear/editar usuario |
| Categorías | Clasificación de productos | Crear categoría |
| Productos | Catálogo, imagen, precios, IVA y estado | Crear/editar producto |
| Proveedores | Identidad, contacto y ubicación | Crear/editar proveedor |
| Clientes | Persona natural/jurídica y ubicación | Crear/editar cliente |
| Inventario | Stock, almacenes, ajustes, salidas y transferencias | Crear/editar almacén y movimiento |
| Compras | Ingreso por proveedor y almacén, detalle y anulación | Registrar compra |
| Ventas | Venta, stock por almacén, pagos, comprobante y anulación | Registrar venta |
| Empresa | Configuración, ubicación, logo y comprobantes | Configurar/actualizar empresa |

Patrón habitual:

```text
ngOnInit
   ├── carga catálogos y listados mediante servicios
   └── actualiza signals

acción de usuario
   ├── normaliza y valida localmente
   ├── actualiza FormFeedbackState si falla
   ├── llama al servicio si pasa
   └── notifica, refresca datos y cierra o conserva el modal
```

Compras y Ventas calculan una vista previa de totales, pero el backend conserva la validación definitiva y el efecto de inventario.

---

## 9. Flujo de datos

### 9.1 Lectura

```text
Página
  → servicio de dominio
  → HttpClient
  → authInterceptor añade token
  → Nginx /api
  → Django REST Framework
  → respuesta tipada
  → signal de la página o servicio
  → template
```

### 9.2 Escritura de formulario

```text
Entrada del usuario
  → ngModel
  → validadores semánticos
  → FormFeedbackState
  → adaptador toPayload / FormData
  → servicio HTTP
  → serializer + permisos + regla de negocio
  → respuesta
      ├── éxito: notificación + refresco
      └── error: normalización + resumen + campo + foco
```

### 9.3 Operación de inventario

Angular solo envía producto, almacén, tipo, cantidad y observación. Django valida rol y llama a `ServicioInventario`, que bloquea filas, comprueba disponibilidad o capacidad, modifica stock y registra movimientos dentro de la misma transacción.

---

## 10. Temas y sistema visual

`styles.css` define el sistema global:

- Fuentes Fraunces, DM Sans y DM Mono.
- Tres temas por `data-theme`.
- Fondos, bordes, texto y colores semánticos.
- Anchos de sidebar y altura de header.
- Radios y sombras.
- Clases de página, tablas, badges, botones, formularios, modales, notificaciones y carga.

Los componentes deben usar tokens como:

```css
.panel {
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
```

No debe existir una paleta independiente por módulo. Los estilos locales pueden definir layout y estados propios, pero colores de propósito equivalente deben reutilizar tokens globales.

La paleta completa y los contrastes se encuentran en [accessibility-visual-guide.md](accessibility-visual-guide.md).

---

## 11. Responsive y capas

### Layout

- Escritorio: sidebar de `240px`, contraíble a `68px`.
- Móvil hasta `768px`: sidebar fuera del canvas, encabezado compacto y contenido sin overflow horizontal.
- Las páginas globales reducen padding de `32px 36px` a `20px 16px`.

### Modales

- Overlay global: `z-index: 2000`.
- Alto máximo de escritorio: `90vh`.
- Móvil: alineación inferior y `max-height` con `dvh`.
- El body del modal gestiona desplazamiento interno.

### Ayuda y notificaciones

- Panel de ayuda: `z-index: 2200`.
- Notificaciones: `z-index: 3000`.
- Sidebar móvil: `z-index: 1200`.
- Header: `z-index: 100`.

Mantener esta jerarquía evita que una ayuda o notificación quede detrás del formulario.

---

## 12. Configuración de entornos

`environment.ts` y `environment.prod.ts` comparten la misma resolución:

```typescript
const runtimeEnv = window.__env__ || {};

export const environment = {
  production: true,
  apiUrl: runtimeEnv.apiUrl || `${window.location.origin}/api`,
};
```

La propiedad `production` cambia según el archivo reemplazado por Angular, pero la URL se resuelve en tiempo de ejecución. Ningún componente debe codificar `localhost`, una IP o un dominio.

---

## 13. Integración con Django y despliegue

El repositorio soporta dos composiciones reales.

### 13.1 Docker Compose con frontend separado

```text
Navegador :80
   │
   ▼
Nginx frontend
   ├── /, /assets → build Angular
   ├── /api       → backend:8000
   ├── /static    → backend:8000
   └── /media     → volumen compartido
                         │
                         ▼
                    Django → PostgreSQL 15
```

El entrypoint genera `assets/env.js` con `apiUrl: '/api'`. Nginx añade encabezados `X-Frame-Options`, `X-Content-Type-Options` y `Referrer-Policy`, y usa fallback a `index.html` para rutas Angular.

### 13.2 Imagen combinada mediante Dockerfile raíz

1. Una etapa Node compila Angular.
2. La etapa Python instala el backend.
3. El build se copia a `/app/frontend_dist`.
4. Django sirve archivos y fallback SPA mediante `frontend_spa`.
5. Gunicorn inicia el backend después de migraciones y datos iniciales controlados por el script de arranque.

Las dos variantes deben conservar la misma ruta `/api` y el mismo comportamiento de navegación.

---

## 14. Seguridad por capas

| Capa | Responsabilidad |
|---|---|
| Template | No exponer secretos; orientar al usuario y ocultar acciones no aplicables |
| Guard | Evitar navegación local no autorizada |
| AuthService | Centralizar token, expiración, usuario y limpieza |
| Interceptor | Adjuntar bearer token y gestionar el contrato de sesión |
| Backend | Autenticar, autorizar roles y validar datos |
| PostgreSQL | Constraints, atomicidad e integridad |
| Nginx | Proxy del mismo origen y encabezados defensivos |

La seguridad no puede depender de datos enviados por Angular. El backend obtiene el responsable desde la sesión y rechaza el rol solicitado por el cliente cuando no corresponde.

---

## 15. Pruebas y verificaciones

### Suite actual

`frontend/package.json` ejecuta 24 pruebas Node distribuidas en:

- `semantic-validators.test.mjs`.
- `location-form.test.mjs`.
- `form-help.test.mjs`.

Estas pruebas cubren funciones puras y contratos de archivos, pero no sustituyen una prueba Angular con DOM real.

### Build

`angular.json` configura:

- Build de aplicación Angular.
- Reemplazo de environment en producción.
- Presupuesto inicial de `500kB` como advertencia y `1MB` como error.
- Presupuesto por estilo de componente de `8kB` como advertencia y `16kB` como error.
- Hash de archivos en producción.

La última ejecución documentada aprobó el build con advertencias de presupuesto en el bundle inicial y el CSS del Dashboard.

### Cobertura manual necesaria

- Interacción completa con modales.
- Foco, teclado y `Escape`.
- Temas Claro, Azul y Oscuro.
- Escritorio y móvil.
- Gráficas Chart.js.
- Comprobantes e impresión.
- Respuestas de red, expiración y permisos.

La evidencia vigente se encuentra en [casos-frontend-compartido.md](test-cases/13-frontend-compartido/casos-frontend-compartido.md).

---

## 16. Cómo agregar una página o formulario

1. Definir o reutilizar contratos en `core/models`.
2. Agregar el método HTTP al servicio de dominio; no llamar `HttpClient` desde la página.
3. Crear la carpeta en `pages/<modulo>/` con `.ts`, `.html` y `.css`.
4. Declarar el componente standalone y sus imports mínimos.
5. Agregar una ruta lazy en `app.routes.ts` con guards de navegación.
6. Agregar navegación y título cuando corresponda.
7. Modelar estado con signals y derivados con `computed`.
8. Usar la infraestructura compartida de validación, notificación y ubicación.
9. Si existe formulario, agregar contenido específico a `FORM_HELP_CONTENT` y consumir `FormHelpComponent`.
10. Usar tokens de tema y revisar los tres esquemas visuales.
11. Verificar teclado, foco, modal, desktop y móvil.
12. Agregar pruebas y ejecutar `npm test` y el build de producción.
13. Actualizar casos de prueba y documentación afectada.

No agregar la ruta antes de confirmar que el backend aplica permisos equivalentes.

---

## 17. Decisiones que requieren revisión de arquitectura

Consultar y documentar antes de:

- Cambiar la persistencia del token o el contrato de autenticación.
- Añadir NgRx u otra librería de estado.
- Cambiar de formularios template-driven a reactivos de forma parcial.
- Dividir o reemplazar la fachada `api.services.ts`.
- Cambiar el formato de errores del backend.
- Crear un segundo sistema de temas o componentes.
- Introducir una librería externa de modales, tablas o validación.
- Cambiar la ruta base `/api`.
- Mover cálculos de negocio al frontend.
- Modificar la estrategia de despliegue combinado o separado.

---

## 18. Deuda técnica conocida

Esta sección describe el estado actual; no autoriza a corregirlo fuera del alcance de una tarea.

| Área | Situación actual | Evolución recomendada |
|---|---|---|
| Sesión | El bearer token persiste en `localStorage` | Evaluar una estrategia con menor exposición y migración compatible |
| Expiración | El interceptor gestiona `401`, pero el backend puede devolver `403` al expirar | Unificar contrato y añadir prueba E2E |
| Servicios | `api.services.ts` agrupa ocho clases y sigue creciendo | Separar por dominio cuando se programe un refactor controlado |
| Models | Un único `index.ts` mezcla lectura, escritura y formularios | Dividir por dominio y contexto sin romper imports |
| Layout | Cada página autenticada incorpora `LayoutComponent` | Evaluar ruta shell con children para reducir repetición |
| Formularios | Predomina `ngModel` y estado manual | Mantener consistencia o planificar migración completa; no mezclar sin criterio |
| Pruebas frontend | `node:test` valida lógica y archivos, sin TestBed ni runner E2E automatizado | Añadir pruebas de componentes e interacción real |
| Accesibilidad | Ayuda y algunos flujos gestionan foco; no todos los modales lo hacen | Crear primitive compartida de modal o directiva de foco |
| Temas | Selector duplicado entre Login y Header | Extraer componente compartido cuando se intervenga esa UI |
| Estilos | Dashboard supera el presupuesto CSS de advertencia | Dividir estilos y revisar reglas duplicadas |
| Bundle | El paquete inicial supera el presupuesto de advertencia | Analizar dependencias, Chart.js e importaciones |
| Fuentes | Google Fonts se importa en CSS | Evaluar autoalojamiento o política de disponibilidad |

---

## 19. Control de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026 | Resumen inicial de capas del frontend |
| 2.0.0 | 08/08/2026 | Arquitectura completa conforme a Angular standalone, rutas, estado, servicios, formularios, temas, Docker, pruebas y deuda vigente |
