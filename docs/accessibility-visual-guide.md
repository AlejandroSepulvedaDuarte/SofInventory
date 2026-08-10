# SofInventory — Guía de accesibilidad y diseño visual

> **Versión:** 2.0.0
>
> **Actualizado:** 8 de agosto de 2026
>
> **Alcance:** frontend Angular, componentes compartidos y pantallas funcionales
>
> **Nivel objetivo:** WCAG 2.2 AA como criterio de diseño; este documento no constituye una certificación

---

## 1. Propósito

Esta guía define cómo mantener una interfaz legible, operable por teclado, adaptable y coherente en SofInventory. También registra qué mecanismos existen actualmente y qué aspectos todavía requieren mejora, para evitar presentar como resuelta una condición que no ha sido verificada.

Aplica a:

- Tema Claro, tema Azul y tema Oscuro.
- Layout, encabezado, barra lateral y navegación.
- Tablas, tarjetas, gráficas, formularios, modales y notificaciones.
- Ayuda contextual, campos de ubicación y validaciones compartidas.
- Pantallas de escritorio, portátil, tableta y móvil.

Los estándares generales de implementación están en [coding-standards.md](coding-standards.md) y la distribución de responsabilidades en [frontend-architecture.md](frontend-architecture.md).

---

## 2. Principios obligatorios

1. **La información no depende solo del color.** Todo estado debe tener texto, icono, forma o contexto adicional.
2. **El teclado permite completar la operación.** Cualquier acción disponible con puntero debe poder recibir foco y activarse con teclado.
3. **El foco siempre es visible.** No se elimina el `outline` sin proporcionar una alternativa de contraste equivalente.
4. **Los campos tienen nombre accesible.** El `placeholder` es una ayuda breve, nunca reemplaza al `label`.
5. **Los errores explican cómo continuar.** Deben asociarse al control, anunciarse y evitar terminología técnica.
6. **El contenido conserva su significado al cambiar de tema o tamaño.** No debe depender de una posición fija ni producir desplazamiento horizontal de la página.
7. **El movimiento no es indispensable para comprender la interfaz.** Las animaciones deben respetar la preferencia de movimiento reducido.
8. **La interfaz no oculta reglas esenciales.** La ayuda contextual complementa las indicaciones de campo, pero no reemplaza validaciones, etiquetas ni errores.

---

## 3. Sistema visual vigente

La fuente de verdad de los tokens es `frontend/src/styles.css`. Los componentes deben consumir variables semánticas y no copiar valores hexadecimales, salvo excepciones justificadas como fondos de imágenes o mezclas puntuales.

### 3.1 Temas disponibles

| Tema | Selector | Fondo principal | Fondo de tarjeta | Campo | Acento | Texto sobre acento |
|---|---|---:|---:|---:|---:|---:|
| Oscuro | `:root` y `:root[data-theme='dark']` | `#0c0e14` | `#161923` | `#1c1f2e` | `#22d3c8` | `#0c0e14` |
| Claro | `:root[data-theme='light']` | `#f3f5fb` | `#ffffff` | `#ffffff` | `#2563eb` | `#ffffff` |
| Azul | `:root[data-theme='blue']` | `#0f172a` | `#16223a` | `#1c2a47` | `#38bdf8` | `#08203a` |

El tema predeterminado es Oscuro. `ThemeService` aplica el atributo `data-theme` al elemento `<html>` y conserva la preferencia bajo la clave `sof_inventory_theme`.

### 3.2 Paleta de fondos y bordes

| Token | Oscuro | Claro | Azul | Uso autorizado |
|---|---:|---:|---:|---|
| `--bg-page` | `#0c0e14` | `#f3f5fb` | `#0f172a` | Fondo de la aplicación |
| `--bg-sidebar` | `#10121a` | `#ffffff` | `#1b263b` | Navegación, encabezados de tabla y pies de modal |
| `--bg-card` | `#161923` | `#ffffff` | `#16223a` | Tarjetas, tablas y modales |
| `--bg-input` | `#1c1f2e` | `#ffffff` | `#1c2a47` | Entradas, selectores y áreas de texto |
| `--bg-hover` | `#1e2235` | `#eef1f8` | `#22314f` | Hover y fondos interactivos secundarios |
| `--bg-elevated` | `#1a1d2c` | `#fafbfe` | `#182741` | Superficies elevadas y botones secundarios |
| `--border` | `#242840` | `#dde2ee` | `#2c3e61` | Bordes principales |
| `--border-light` | `#1e2138` | `#e8ebf4` | `#23344f` | Separadores internos |

### 3.3 Paleta de texto

| Token | Oscuro | Claro | Azul | Uso autorizado |
|---|---:|---:|---:|---|
| `--text-primary` | `#eef0f8` | `#1c2333` | `#eaf1ff` | Títulos, valores y contenido principal |
| `--text-contrast` | `#f8f9ff` | `#141a29` | `#f8fbff` | Labels y encabezados que requieren máxima legibilidad |
| `--text-soft` | `#d8ddf5` | `#3a435c` | `#c9d7f2` | Celdas y texto secundario importante |
| `--text-secondary` | `#8b91b8` | `#4a5572` | `#a8b7d8` | Descripciones y ayuda complementaria |
| `--text-muted` | `#4a5075` | `#8a94ab` | `#5b6f94` | Metadatos no esenciales; no usar para instrucciones críticas |
| `--placeholder` | `#aab1d3` | `#98a1b5` | `#6b7fa3` | Ejemplos dentro de controles; nunca como única etiqueta |

### 3.4 Colores semánticos

| Significado | Token | Oscuro | Claro | Azul |
|---|---|---:|---:|---:|
| Acción principal / foco | `--accent` | `#22d3c8` | `#2563eb` | `#38bdf8` |
| Error / peligro | `--danger` | `#f87171` | `#dc2626` | `#f87171` |
| Texto de error | `--danger-text` | `#fecaca` | `#991b1b` | `#fecaca` |
| Advertencia | `--warning` | `#fb923c` | `#d97706` | `#fbbf24` |
| Éxito | `--success` | `#4ade80` | `#16a34a` | `#4ade80` |
| Información | `--info` | `#60a5fa` | `#2563eb` | `#60a5fa` |

Los fondos semánticos `--danger-light`, `--warning-light`, `--success-light` y `--info-light` deben acompañarse con texto o iconos. Un cambio de tono por sí solo no comunica el estado.

### 3.5 Contraste medido de combinaciones principales

Los siguientes valores se calcularon a partir de los tokens actuales. Sirven como control documental, no como auditoría completa de cada estado, transparencia o gráfico.

| Combinación | Oscuro | Claro | Azul | Uso |
|---|---:|---:|---:|---|
| `text-primary` sobre `bg-card` | 15,41:1 | 15,70:1 | 13,99:1 | Apto para texto normal |
| `text-secondary` sobre `bg-card` | 5,71:1 | 7,41:1 | 7,88:1 | Apto para texto normal |
| `text-soft` sobre `bg-card` | 13,01:1 | 9,83:1 | 10,94:1 | Apto para texto normal |
| `text-muted` sobre `bg-card` | 2,25:1 | 3,04:1 | 3,13:1 | No apto para información que deba leerse; requiere mejora |
| `placeholder` sobre `bg-input` | 7,74:1 | 2,59:1 | 3,53:1 | Claro y Azul no alcanzan 4,5:1; no usar para instrucciones esenciales |
| `on-accent` sobre `accent` | 10,31:1 | 5,17:1 | 7,67:1 | Apto para botones y estados activos |

Regla práctica: títulos, labels, valores, ayudas necesarias y acciones deben usar `--text-primary`, `--text-contrast`, `--text-soft` o `--text-secondary`. `--text-muted` queda reservado para información prescindible y nunca debe contener el único nombre de una acción.

### 3.6 Tipografía

| Token | Familia | Uso |
|---|---|---|
| `--font-display` | Fraunces, serif | Títulos y marca visual |
| `--font-body` | DM Sans, sans-serif | Contenido, formularios y acciones |
| `--font-mono` | DM Mono, monospace | Labels, códigos, badges y metadatos cortos |

Las fuentes se importan actualmente desde Google Fonts. Deben conservarse familias de respaldo para que la interfaz siga siendo utilizable si la fuente remota no carga.

El cuerpo usa `14px` y `line-height: 1.6`. No reducir textos esenciales por debajo de `12px`. Los tamaños de `9px` a `11px` existentes deben limitarse a metadatos no esenciales y revisarse con zoom.

### 3.7 Radios, sombras y dimensiones

| Token | Valor | Uso |
|---|---:|---|
| `--radius-sm` | `6px` | Iconos, errores y controles compactos |
| `--radius-md` | `10px` | Inputs y botones |
| `--radius-lg` | `14px` | Tablas y paneles |
| `--radius-xl` | `20px` | Modales |
| `--sidebar-width` | `240px` | Barra lateral expandida |
| `--sidebar-collapsed-width` | `68px` | Barra lateral contraída |
| `--header-height` | `64px` | Encabezado principal |

Las sombras `--shadow-sm`, `--shadow-md`, `--shadow-lg` y `--shadow-accent` indican elevación, pero el borde debe seguir visible porque la sombra no puede ser el único límite perceptible.

---

## 4. Uso correcto de variables CSS

### Correcto

```css
.summary-card {
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.summary-card:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}
```

### Evitar

```css
.summary-card {
  color: #ffffff;
  background: #111827;
  border: 1px solid #283044;
}
```

El segundo ejemplo rompe el tema Claro y obliga a mantener colores duplicados.

---

## 5. Teclado y foco

### Reglas

- Utilizar `<button>` para acciones y `<a>` con destino para navegación.
- Todo botón dentro de un formulario debe declarar `type="button"`, salvo el botón que realmente envía el formulario.
- Conservar un orden DOM lógico; no corregir el orden visual mediante valores positivos de `tabindex`.
- Usar `:focus-visible` para acciones y `:focus` en controles de formulario cuando sea necesario.
- El foco debe distinguirse en los tres temas con un contorno o anillo de al menos `2px`.
- Al cerrar un panel o modal, devolver el foco al control que lo abrió.
- `Escape` debe cerrar únicamente la capa superior activa.

Patrón recomendado:

```css
.icon-action:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

El componente `FormHelpComponent` ya aplica este patrón, lleva el foco al botón de cierre, intercepta `Escape` y devuelve el foco al disparador. Los demás modales deben converger al mismo comportamiento.

---

## 6. Formularios y validaciones

### 6.1 Asociación de etiquetas

Cada control necesita un `id` único y un `label` asociado mediante `for`.

```html
<label for="product-name">
  Nombre <span class="required-marker">*</span>
</label>
<input
  id="product-name"
  type="text"
  required
  aria-required="true"
  [appFieldValidation]="validation.error('nombre')"
  validationMessageId="product-name-error"
/>
<app-field-error
  id="product-name-error"
  [message]="validation.error('nombre')"
/>
```

`FieldValidationDirective` añade `is-invalid`, `aria-invalid="true"` y `aria-describedby` cuando existe un error. `FieldErrorComponent` presenta el mensaje específico y `FormErrorSummaryComponent` anuncia el resumen con `role="alert"` y `aria-live="assertive"`.

### 6.2 Reglas de error

- Conservar el valor escrito; no limpiar el formulario ante un error.
- Mostrar el error junto al campo y un resumen cuando varios controles requieren atención.
- Mover el foco al primer campo inválido solo después de una validación o respuesta fallida.
- Evitar mensajes como “Error 500”, “payload inválido” o trazas del servidor.
- No repetir en el panel general de ayuda todas las restricciones ya explicadas debajo del campo.
- El asterisco obligatorio debe acompañarse de `required` y `aria-required`; el color rojo no es suficiente.

### 6.3 Campos dinámicos

`LocationFieldsComponent` cambia entre Colombia y otro país. Al cambiar de modo limpia los valores ocultos, asocia errores a cada selector y anuncia la carga del catálogo con `aria-live="polite"`. Un error de catálogo usa `role="alert"` y ofrece un botón real de reintento.

---

## 7. Modales y ayuda contextual

### 7.1 Modal de formulario

Un modal debe incluir:

- `role="dialog"`.
- `aria-modal="true"`.
- `aria-labelledby` apuntando a un título visible y único.
- Botón de cierre con `type="button"` y `aria-label` descriptivo.
- Foco inicial predecible.
- Contención del foco dentro del modal.
- Cierre por `Escape` y devolución del foco al disparador.
- Área interna desplazable y acciones accesibles en móvil.

### 7.2 Panel de ayuda contextual

La implementación compartida usa:

- Botón real con icono, texto “Ayuda”, `aria-label`, `aria-expanded` y `aria-controls`.
- Panel con `role="region"` y `aria-labelledby`.
- Texto visible en escritorio y solo icono —con nombre accesible intacto— hasta `640px`.
- Panel lateral en escritorio y panel inferior hasta `768px`.
- `z-index: 2200`, por encima del modal (`2000`) y por debajo de notificaciones (`3000`).
- Estado local mediante `signal`; no usa red, cookies ni almacenamiento.
- Movimiento reducido en `prefers-reduced-motion: reduce`.

La ayuda no debe reiniciar controles, enviar el formulario ni marcar campos como tocados.

---

## 8. Notificaciones y estados

`NotificationContainerComponent` utiliza una región global y cada aviso se expone con `role="status"` y `aria-live="polite"`. El temporizador se pausa al pasar el puntero o enfocar la notificación.

Reglas:

- Éxito: icono, texto explícito y token `--success`.
- Advertencia: icono, texto explícito y token `--warning`.
- Error: icono, texto explícito y token `--danger`.
- El botón de cierre necesita `aria-label="Cerrar notificación"`.
- Un error que requiere intervención inmediata debe evaluarse para `role="alert"`; no convertir todos los avisos en alertas asertivas.
- Los datos anteriores no deben confundirse con datos vigentes cuando una recarga falla.

Los badges actuales añaden un punto, borde y texto (`Activo`, `Inactivo`, `Pendiente`, `Bloqueado`), por lo que no dependen únicamente del color.

---

## 9. Tablas, métricas y gráficas

### Tablas

- Usar `<table>`, `<thead>`, `<tbody>`, `<th>` y `<td>` reales.
- Incorporar encabezados claros y, cuando la tabla sea compleja, `scope="col"` y un `caption` accesible.
- Mantener encabezados con `--text-contrast`; no usar `--text-muted` para títulos de columna.
- Permitir desplazamiento dentro de `.table-container`, no en toda la página.
- No ocultar columnas esenciales sin ofrecer una vista alternativa.
- Mostrar productos como `SKU - Nombre` cuando exista riesgo de ambigüedad.

### Dashboard y Chart.js

Las tarjetas numéricas proporcionan el valor textual principal. Las gráficas no deben ser la única forma de consultar una métrica:

- Mantener títulos y periodos visibles.
- Exponer controles de periodo como botones con `aria-pressed`.
- Proporcionar resumen, tabla equivalente o texto alternativo para información que solo esté en `<canvas>`.
- Evitar depender únicamente de dos colores cercanos para distinguir series.
- Comprobar leyendas y tooltips en los tres temas.

---

## 10. Iconos e imágenes

- Los iconos decorativos de Font Awesome deben usar `aria-hidden="true"`.
- Un botón que solo contiene un icono necesita `aria-label`; `title` puede complementar, pero no sustituye el nombre accesible.
- Los logos de empresa deben usar un `alt` derivado del nombre comercial.
- Una imagen de producto necesita texto alternativo que identifique el producto; si es puramente decorativa debe usar `alt=""`.
- No incluir texto crítico dentro de una imagen.
- El cambio de icono no debe ser la única indicación de estado.

---

## 11. Diseño responsive

### Puntos de adaptación existentes

| Ancho | Comportamiento relevante |
|---:|---|
| `≤ 1000px` / `≤ 850px` | Ajustes específicos de Ventas y Empresa |
| `≤ 768px` | Sidebar lateral móvil, encabezado compacto, página con menor padding, modal alineado abajo y ayuda como panel inferior |
| `≤ 640px` | El botón de ayuda conserva solo el icono visible |
| `≤ 560px` / `≤ 520px` | Formularios y acciones específicas se reorganizan |
| `≤ 480px` / `≤ 420px` | Dashboard y panel de ayuda reducen dimensiones y ocupan el alto disponible |

### Reglas

- No introducir anchos fijos mayores que el viewport.
- Usar `max-width`, `min()`, `calc()` y `dvh` para capas móviles.
- Mantener un área táctil objetivo de al menos `44 × 44px`; el botón móvil de ayuda actual es `40 × 40px` y debe considerarse el mínimo heredado, no el objetivo para nuevos controles.
- Evitar zoom horizontal a 320px de ancho.
- Conservar visibles las acciones de guardar, cancelar y cerrar.
- Validar zoom de navegador al 200 % sin pérdida de contenido ni funcionalidad.
- No depender de hover en dispositivos táctiles.

---

## 12. Movimiento y animación

La interfaz usa animaciones para entrada de página, modal, notificación, panel de ayuda, Dashboard y spinners.

Para contenido nuevo:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}
```

No se debe desactivar el spinner que comunica una carga activa sin reemplazarlo por otro indicador. La preferencia de movimiento reducido ya se aplica al panel de ayuda y a partes del Dashboard; falta extenderla de forma global.

---

## 13. Estado actual y deuda conocida

| Área | Implementación verificada | Pendiente documental/técnico |
|---|---|---|
| Idioma | `<html lang="es">` y locale `es-CO` | Revisar títulos históricos que todavía usan “ERP Pro” |
| Formularios | Labels, errores asociados, `aria-invalid`, resúmenes y foco al primer inválido | Auditar que todos los campos de todas las páginas tengan `id` y asociación explícita |
| Ayuda contextual | Teclado, `Escape`, foco, títulos dinámicos, responsive y movimiento reducido | Evaluar contención completa del foco y fondo inerte |
| Modales | Semántica `dialog` presente en formularios principales | El manejo de foco y `Escape` no está unificado en todos los modales |
| Botones de icono | Varios incluyen `aria-label` | Algunos controles de header, sidebar y detalle dependen solo de `title` o del icono |
| Foco | Inputs y ayuda muestran anillo visible | Falta una regla global consistente para todos los botones y enlaces interactivos |
| Contraste | Textos principales y secundarios cumplen en combinaciones base | `text-muted` y algunos placeholders no alcanzan 4,5:1 para texto normal |
| Movimiento | Ayuda y Dashboard consideran `prefers-reduced-motion` | Animaciones globales de página, modal y notificación aún no están cubiertas |
| Gráficas | Métricas textuales y controles de periodo accesibles | Formalizar alternativa textual completa para cada canvas |
| Navegación | Enlaces reales y rutas por rol | No existe un enlace de salto directo al contenido principal |

Registrar estas condiciones evita aprobar accesibilidad solo por inspección de colores o por la existencia de atributos ARIA aislados.

---

## 14. Lista de verificación para nuevas pantallas

### Semántica y teclado

- [ ] Existe un único título principal claro.
- [ ] Todas las acciones usan botón o enlace real.
- [ ] Los botones de icono tienen nombre accesible.
- [ ] El orden de tabulación coincide con el orden visual y lógico.
- [ ] El foco es visible en Claro, Azul y Oscuro.
- [ ] `Escape` afecta solo la capa superior.
- [ ] El foco se devuelve al disparador al cerrar una capa.

### Formularios

- [ ] Cada control tiene `label` asociado.
- [ ] Los campos obligatorios usan `required`, `aria-required` e indicación textual o contextual.
- [ ] Los errores usan `FieldValidationDirective` y `FieldErrorComponent` cuando aplica.
- [ ] El resumen usa `FormErrorSummaryComponent`.
- [ ] Un error conserva los valores ingresados.
- [ ] El `placeholder` no contiene la única instrucción.
- [ ] Todos los botones no submit declaran `type="button"`.

### Visual y responsive

- [ ] Solo se usan tokens globales para colores semánticos.
- [ ] Ningún estado depende exclusivamente del color.
- [ ] La pantalla funciona a 320px, 768px y escritorio.
- [ ] No existe desplazamiento horizontal de la página.
- [ ] La interfaz conserva funcionalidad con zoom al 200 %.
- [ ] Los objetivos táctiles se acercan o superan `44 × 44px`.
- [ ] Las animaciones respetan movimiento reducido.

### Evidencia mínima

- [ ] Captura o verificación visual en los tres temas.
- [ ] Verificación de teclado y foco.
- [ ] Verificación responsive en escritorio y móvil.
- [ ] Prueba automatizada para lógica compartida cuando sea viable.
- [ ] Resultado registrado; no se considera aprobado solo porque exista una prueba.

La matriz vigente para temas, ayuda contextual, formularios compartidos y responsive se encuentra en [casos-frontend-compartido.md](test-cases/13-frontend-compartido/casos-frontend-compartido.md).

---

## 15. Control de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026 | Guía visual inicial |
| 2.0.0 | 08/08/2026 | Documentación completa de temas, paleta, contraste, formularios, teclado, responsive, ayuda contextual y deuda accesible real |
