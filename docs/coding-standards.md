# SofInventory — Estándar de codificación

> **Versión:** 2.0.0
>
> **Actualizado:** 8 de agosto de 2026
>
> **Proyecto:** SofInventory
>
> **Autores:** Alejandro Sepúlveda Duarte y Lucy Estefany Izquierdo Jaramillo
>
> **Tecnologías:** Angular 19 · TypeScript 5.6 · Django 6 · Django REST Framework 3.17 · PostgreSQL 15
>
> **Estado:** vigente para código nuevo y modificaciones

---

## 1. Propósito

Este documento establece las convenciones que permiten mantener SofInventory legible, seguro y consistente. Los ejemplos se adaptaron a la implementación real del repositorio; no describen el frontend HTML/JavaScript antiguo ni versiones instaladas únicamente en Windows.

El estándar aplica a:

- Backend Django y Django REST Framework.
- Frontend Angular standalone, TypeScript, templates HTML y CSS.
- Contratos entre frontend y backend.
- Pruebas automatizadas.
- Configuración Docker y variables de entorno.
- Documentación técnica y flujo de revisión.

La arquitectura detallada del frontend está en [frontend-architecture.md](frontend-architecture.md) y el sistema visual en [accessibility-visual-guide.md](accessibility-visual-guide.md).

---

## 2. Fuentes de verdad

Cuando exista una diferencia entre un ejemplo histórico y el repositorio, prevalece este orden:

1. Reglas de negocio y permisos del backend.
2. Migraciones y restricciones de PostgreSQL.
3. Serializers, servicios y pruebas automatizadas vigentes.
4. Interfaces y servicios TypeScript.
5. Templates y estilos actuales.
6. Documentación.

La documentación debe actualizarse en el mismo cambio que modifica un contrato, una convención o un comportamiento visible.

---

## 3. Runtime de referencia

Las versiones técnicas deben verificarse dentro de los contenedores Docker. No se debe presentar una instalación local de Windows como runtime del sistema.

| Componente | Versión de referencia |
|---|---:|
| Python | 3.12.13 |
| Django | 6.0.4 |
| Django REST Framework | 3.17.1 |
| PostgreSQL | 15.18 |
| Node.js | 20 Alpine |
| Angular | 19.2.21 |
| TypeScript | 5.6.3 |
| Nginx | 1.31.3 sobre Alpine 3.24.1 |

Las versiones fijadas por el código se consultan en `backend/requirements.txt`, `frontend/package-lock.json`, los Dockerfiles y `docker-compose.yml`.

---

## 4. Estructura actual del repositorio

```text
sofinventory/
├── backend/
│   ├── config/
│   ├── catalogos/
│   ├── usuarios/
│   ├── productos/
│   ├── proveedores/
│   ├── clientes/
│   ├── inventario/
│   ├── compras/
│   ├── ventas/
│   ├── empresa/
│   ├── dashboard/
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   ├── pages/
│   │   │   └── shared/
│   │   ├── environments/
│   │   ├── assets/
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css
│   ├── tests/
│   ├── angular.json
│   └── package.json
├── docs/
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

No crear un frontend paralelo en archivos HTML/JavaScript estáticos. Las pantallas nuevas pertenecen a `frontend/src/app`.

---

## 5. Principios generales

| Principio | Aplicación en SofInventory |
|---|---|
| Legibilidad | Nombres del dominio completos y estructura predecible |
| Responsabilidad única | La vista coordina, el serializer valida, el servicio ejecuta reglas complejas y el componente presenta |
| Tipado | Contratos TypeScript y validación de entrada en DRF |
| Defensa en profundidad | Frontend orienta; backend y base de datos protegen la regla definitiva |
| Atomicidad | Compras, ventas, anulaciones y movimientos se ejecutan en transacciones |
| Trazabilidad | Operaciones sensibles conservan responsable, fecha, motivo y referencias |
| Accesibilidad | Semántica HTML, teclado, foco, errores asociados y temas legibles |
| Seguridad | Secretos fuera del código; no registrar credenciales, tokens o información personal |
| Reutilización | Validadores, ubicaciones, errores, notificaciones y ayuda se centralizan en `shared` |
| Evidencia | Una prueba se considera aprobada únicamente después de ejecutarse |

---

## 6. Formato e idioma

### 6.1 Indentación

| Lenguaje | Regla |
|---|---|
| Python | 4 espacios |
| TypeScript | 2 espacios |
| HTML de Angular | 2 espacios por nivel lógico |
| CSS | 2 espacios |
| JSON/YAML | 2 espacios, respetando el archivo existente |

No usar tabulaciones. El repositorio no tiene actualmente un formateador o linter configurado como script obligatorio; por ello la revisión de formato y `ng build` son indispensables.

### 6.2 Longitud y división de líneas

- Objetivo general: hasta 100 caracteres cuando sea práctico.
- Se permiten líneas mayores en URLs, expresiones de template o firmas que pierdan claridad al fragmentarse.
- Dividir argumentos y colecciones con una entrada por línea y coma final donde el lenguaje la admita.
- No alinear manualmente grandes bloques con espacios si aumenta el ruido del diff.

```python
movimientos = (
    MovimientoInventario.objects.select_for_update()
    .filter(compra=compra, tipo='ENTRADA_COMPRA')
    .order_by('producto_id', 'pk')
)
```

```typescript
readonly filteredProducts = computed(() =>
  this.products().filter((product) =>
    this.productLabel(product).includes(this.searchTerm().toLowerCase()),
  ),
);
```

### 6.3 Idioma

- Entidades, campos del negocio y mensajes al usuario se mantienen en español.
- Nombres propios de Angular, Django, HTTP y librerías conservan su terminología oficial.
- No mezclar dos nombres para el mismo concepto: usar `almacen`, no alternar con `bodega` en código.
- Los mensajes visibles deben llevar tildes y redacción natural.
- Los identificadores existentes sin tilde o con nombres históricos no se renombran sin analizar contratos y migraciones.

### 6.4 Comentarios

Comentar el motivo, la regla o el riesgo, no la sintaxis evidente.

```python
# Bloquear las filas en un orden estable evita interbloqueos entre transferencias concurrentes.
almacenes = (
    Almacen.objects.select_for_update()
    .filter(pk__in=sorted([origen_id, destino_id]))
    .order_by('pk')
)
```

Evitar:

```typescript
// Cambia loading a true.
this.loading.set(true);
```

Los encabezados de sección extensos existentes se pueden conservar, pero no son obligatorios en archivos pequeños.

---

## 7. Convenciones de nombres

### 7.1 Backend Python

| Elemento | Convención | Ejemplo actual |
|---|---|---|
| App y paquete | `snake_case` | `inventario`, `dashboard` |
| Archivo | `snake_case.py` | `password_validators.py`, `test_settings.py` |
| Clase | `PascalCase` | `Producto`, `ServicioInventario`, `APITokenAuthentication` |
| Función o método | `snake_case` | `registrar_compra`, `validar_disponibilidad` |
| Variable | `snake_case` | `stock_anterior`, `iva_total` |
| Constante | `UPPER_SNAKE_CASE` | `LOGIN_THROTTLE_RATE`, `TIPOS_ENTRADA` |
| Método de prueba | `test_<comportamiento>` | `test_anular_venta_restaura_stock` |
| Tabla | plural en `snake_case` | `productos`, `sesiones_api` |
| Constraint o índice | descriptivo y estable | `productos_stock_no_negativo` |

### 7.2 Angular y TypeScript

| Elemento | Convención | Ejemplo actual |
|---|---|---|
| Carpeta | `kebab-case` o nombre simple de dominio | `form-help`, `productos` |
| Componente | `<nombre>.component.ts` | `location-fields.component.ts` |
| Servicio | `<nombre>.service.ts` | `auth.service.ts`, `theme.service.ts` |
| Guard | `<nombre>.guard.ts` | `auth.guard.ts` |
| Interceptor | `<nombre>.interceptor.ts` | `auth.interceptor.ts` |
| Clase/interfaz/tipo | `PascalCase` | `FormHelpContent`, `DashboardData` |
| Variable/método | `camelCase` | `currentUser`, `closeHelp` |
| Signal privado | `_camelCase` si expone versión pública | `_token`, `_current` |
| Constante de módulo | `UPPER_SNAKE_CASE` | `LS_TOKEN`, `THEME_OPTIONS` |
| Selector | prefijo `app-` y `kebab-case` | `app-form-help` |
| Clase e ID HTML | `kebab-case` | `form-help-panel`, `product-name` |

No usar abreviaturas ambiguas como `x`, `tmp`, `obj1` o `data2` fuera de un contexto mínimo y evidente.

---

## 8. Backend Django

### 8.1 Anatomía de una app

Una app de negocio puede contener:

| Archivo | Responsabilidad |
|---|---|
| `models.py` | Entidades, relaciones, constraints e índices |
| `serializers.py` | Contratos de entrada/salida y validación |
| `views.py` | Coordinación HTTP y permisos |
| `services.py` | Reglas transaccionales o cálculos reutilizables |
| `urls.py` | Rutas de la app |
| `permissions.py` / `authentication.py` | Infraestructura de seguridad cuando aplica |
| `tests.py` | Pruebas unitarias y de integración de la app |
| `migrations/` | Evolución versionada del esquema |
| `management/commands/` | Operaciones administrativas explícitas |

No todas las apps necesitan todos los archivos. `dashboard` usa `services.py`; `catalogos` no define modelos; `usuarios` concentra autenticación, permisos, throttling y validadores.

### 8.2 Modelos

- Declarar `db_table`, nombres legibles y orden cuando aporte valor.
- Elegir `PROTECT`, `CASCADE` o `SET_NULL` según la consecuencia real.
- Proteger reglas críticas con constraints de base de datos cuando sea posible.
- Usar `DecimalField` para dinero; nunca `float`.
- Los campos derivados de inventario no se actualizan directamente desde cualquier vista.
- Las relaciones históricas deben conservar snapshots cuando el comprobante lo requiere.

Ejemplo basado en `Producto`:

```python
class Producto(models.Model):
    nombre = models.CharField(max_length=150)
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        related_name='productos',
    )
    stock = models.IntegerField(default=0)

    class Meta:
        db_table = 'productos'
        ordering = ['nombre']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stock__gte=0),
                name='productos_stock_no_negativo',
            ),
        ]
```

### 8.3 Serializers y validación

- El serializer valida formato, obligatoriedad, unicidad y coherencia de entrada.
- Normalizar texto antes de comparar duplicados.
- Usar mensajes en español y asociados al campo.
- Separar serializer de lectura y escritura cuando los contratos difieran.
- Retirar campos auxiliares `write_only` antes de crear el modelo.
- Las imágenes pasan por `validate_uploaded_image` y una ruta segura.
- No confiar en validaciones del frontend.

```python
class ProductoEscrituraSerializer(serializers.ModelSerializer):
    quitar_imagen = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
    )

    def validate_iva_porcentaje(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                'El IVA debe estar entre 0 y 100.'
            )
        return value

    def create(self, validated_data):
        validated_data.pop('quitar_imagen', None)
        return super().create(validated_data)
```

### 8.4 Servicios de dominio y transacciones

Las operaciones que modifican varias filas o módulos pertenecen a un servicio de dominio. `ServicioInventario` es la única puerta de escritura de existencias.

```python
class ServicioInventario:
    @classmethod
    @transaction.atomic
    def salida(cls, *, producto, almacen, cantidad, usuario, observacion=''):
        cantidad = cls._validar_cantidad(cantidad)
        producto = cls._bloquear_producto(producto)
        almacen = cls._bloquear_almacen(almacen)
        stock = cls._stock_bloqueado(producto, almacen)

        if stock.cantidad < cantidad:
            raise InventarioError('Stock insuficiente.')

        # Registrar stock y movimiento dentro de la misma transacción.
```

Reglas:

- Usar `transaction.atomic` en compras, ventas, anulaciones, transferencias y ajustes.
- Usar `select_for_update` cuando dos solicitudes puedan modificar la misma existencia.
- Adquirir bloqueos en un orden estable.
- Una anulación debe ser auditable e idempotente.
- No duplicar cálculos de stock en vistas diferentes.
- Convertir errores de negocio conocidos en respuestas controladas; no ocultar errores inesperados como si fueran validaciones.

### 8.5 Vistas y permisos

- Toda vista DRF declara métodos con `@api_view`.
- Toda operación sensible declara roles con `@require_roles` o una clase de permiso equivalente.
- El usuario responsable siempre proviene de `request.user`; nunca del payload.
- La ocultación de un menú en Angular no reemplaza la autorización del backend.
- Consultas frecuentes deben usar `select_related`, `prefetch_related` y agregaciones cuando corresponda.

```python
@api_view(['PATCH'])
@require_roles('Administrador', 'Supervisor')
def anular_compra(request, id):
    entrada = AnularCompraSerializer(data=request.data)
    if not entrada.is_valid():
        return Response(
            {'error': _primer_error(entrada.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # La operación continúa dentro de transaction.atomic().
```

### 8.6 Rutas y HTTP

Las rutas actuales viven bajo `/api/` y conservan acciones explícitas:

| Método | Patrón actual | Uso |
|---|---|---|
| `GET` | `/api/productos/listar/` | Listado |
| `POST` | `/api/compras/registrar/` | Creación transaccional |
| `GET` | `/api/ventas/detalle/<id>/` | Detalle |
| `PUT` | `/api/clientes/editar/<id>/` | Actualización completa |
| `PATCH` | `/api/ventas/anular/<id>/` | Cambio parcial o acción |
| `DELETE` | `/api/almacenes/eliminar/<id>/` | Eliminación autorizada |

No introducir un estilo de URL distinto dentro del mismo módulo sin una decisión de arquitectura y migración de consumidores.

### 8.7 Respuestas y errores

| Estado | Uso esperado |
|---:|---|
| `200` | Lectura, actualización o acción completada |
| `201` | Recurso creado |
| `400` | Entrada inválida o regla de negocio incumplida |
| `401` | Credenciales ausentes o inválidas |
| `403` | Usuario autenticado sin permiso |
| `404` | Recurso inexistente |
| `409` | Conflicto de relación o estado cuando el contrato lo adopte |
| `429` | Límite de solicitudes excedido |
| `500` | Error inesperado, sin exponer traza al cliente |

Los errores pueden llegar como `{'error': '...'}` o como errores por campo del serializer. El frontend actual normaliza ambas formas mediante `FormFeedbackService`.

```json
{
  "error": "El almacén de origen y el de destino deben ser diferentes."
}
```

No devolver al usuario nombres de tablas, SQL, rutas internas, excepciones o trazas.

### 8.8 Migraciones

- Crear migraciones con `python manage.py makemigrations <app>`.
- Revisar el SQL y las operaciones antes de aplicarlas.
- No editar una migración ya desplegada; crear una nueva migración correctiva.
- Versionar las migraciones y sus `__init__.py`.
- Probar restricciones y concurrencia en PostgreSQL, no únicamente en SQLite.
- Toda migración de datos debe ser reversible o documentar por qué no lo es.

---

## 9. Seguridad del backend

### 9.1 Configuración

- `SECRET_KEY`, credenciales de PostgreSQL, contraseña administrativa inicial, hosts y orígenes provienen de variables de entorno.
- `DEBUG=False` es el valor seguro predeterminado.
- Con `DEBUG=False`, `ALLOWED_HOSTS` no puede quedar vacío.
- CORS y orígenes confiables se configuran de forma explícita.
- `.env` nunca se versiona; `.env.example` solo contiene marcadores no secretos.

### 9.2 Autenticación y autorización

- `APITokenAuthentication` procesa `Authorization: Bearer <token>`.
- `SesionAPI` controla estado, usuario, expiración y actividad.
- El login aplica límite por IP mediante `LoginRateThrottle`.
- Los intentos fallidos y bloqueos se registran sin guardar contraseñas.
- `require_roles` valida autenticación y rol en el servidor.
- Un cambio de contraseña debe pasar los validadores configurados y almacenarse con hash.

Nunca escribir el token completo, contraseña, hash, encabezado `Authorization` o datos personales en logs, respuestas, capturas o pruebas documentales.

### 9.3 Archivos

- Validar contenido real, tamaño y formato; no confiar solo en extensión o MIME declarado.
- Generar rutas seguras con utilidades compartidas.
- No versionar `media/`.
- No devolver rutas físicas del servidor.

---

## 10. Frontend Angular

### 10.1 Componentes standalone

Todos los componentes actuales son standalone. Una página declara de forma explícita sus dependencias.

```typescript
@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutComponent,
    FormErrorSummaryComponent,
    FieldErrorComponent,
    FieldValidationDirective,
    FormHelpComponent,
  ],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css'],
})
export class CategoriasComponent {
  readonly categorias = signal<Categoria[]>([]);
  readonly showModal = signal(false);
}
```

Reglas:

- No crear `NgModule` para una pantalla nueva.
- Mantener el componente enfocado en estado de presentación y coordinación.
- Extraer una función pura o componente compartido cuando la regla se repita.
- Usar `readonly` para signals y referencias que no se reasignan.
- Limpiar suscripciones de larga duración; las solicitudes HTTP completan por sí mismas.
- No usar manipulación directa del DOM salvo foco, integración con librerías o accesibilidad justificada.

### 10.2 Estado con signals

```typescript
readonly productos = signal<Producto[]>([]);
readonly searchTerm = signal('');

readonly filteredProducts = computed(() => {
  const term = this.searchTerm().trim().toLocaleLowerCase('es-CO');
  return this.productos().filter((product) =>
    `${product.sku} ${product.nombre}`.toLocaleLowerCase('es-CO').includes(term),
  );
});
```

- Usar `signal` para estado mutable de interfaz.
- Usar `computed` para valores derivados sin efectos secundarios.
- No mutar directamente un array alojado en un signal; crear un valor nuevo o usar `update`.
- No usar una propiedad ordinaria dentro de `computed`, porque no dispara reactividad.
- Reservar RxJS para HTTP, streams y composición asíncrona.
- No añadir una librería global de estado si signals y servicios cubren el caso.

### 10.3 Tipos

`tsconfig.json` activa `strict`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` y templates estrictos.

- Reutilizar contratos de `core/models/index.ts`.
- Preferir uniones literales para estados y operaciones.
- Evitar `any` en código nuevo; usar `unknown`, genéricos o interfaces pequeñas.
- Representar IDs y relaciones conforme al contrato real.
- No copiar una interfaz en varias páginas.

```typescript
export type FormHelpOperation = 'create' | 'edit';

export interface FormHelpContent {
  title: FormHelpText;
  purpose: FormHelpText;
  recommendations: readonly string[];
  relationships: readonly string[];
  checklist: readonly string[];
}
```

### 10.4 Servicios HTTP y adaptación de payloads

La URL base proviene de `environment.apiUrl`. Los componentes no construyen endpoints ni agregan el token.

```typescript
@Injectable({ providedIn: 'root' })
export class ClientesService {
  constructor(private http: HttpClient) {}

  listar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${API}/clientes/listar/`);
  }

  crear(data: Partial<Cliente>): Observable<unknown> {
    return this.http.post(
      `${API}/clientes/crear/`,
      this.toPayload(data),
    );
  }
}
```

- Adaptar nombres, IDs y estructuras en un método privado `toPayload` o servicio.
- Usar `FormData` solo para archivos o contratos multipart.
- Tipar la respuesta cuando el componente consume sus campos.
- No calcular la regla definitiva de inventario en Angular.
- El interceptor añade `Authorization` de forma centralizada.
- Los errores del formulario pasan por `FormFeedbackState.fromHttp`.

### 10.5 Sesión y almacenamiento

La implementación vigente encapsula en `AuthService` las claves `auth_token`, `auth_expires_at` y `auth_user` de `localStorage`. El tema utiliza `sof_inventory_theme`.

Reglas:

- Ningún componente de página debe leer o escribir directamente las claves de autenticación.
- Nunca almacenar contraseñas, datos de formularios, permisos calculados o contenido de ayuda.
- No crear claves nuevas sin definir propietario, finalidad, expiración y limpieza.
- Toda modificación de la estrategia de sesión requiere análisis de seguridad, compatibilidad y pruebas.
- El contenido de ayuda permanece en memoria y en configuración TypeScript estática.

### 10.6 Guards e interceptor

- `authGuard`: exige sesión local vigente.
- `guestGuard`: evita volver a Login con una sesión activa.
- `adminGuard`: restringe las páginas de Usuarios y Empresa.
- `authInterceptor`: adjunta el bearer token y actualmente limpia la sesión ante `401` fuera de Login/Logout.

Los guards mejoran navegación, pero los permisos efectivos siempre pertenecen al backend. El contrato de expiración `401/403` tiene un defecto abierto documentado y no debe ampliarse sin una prueba de regresión.

### 10.7 Templates

- Mantener expresiones cortas y declarativas.
- Usar interpolación y bindings; no concatenar HTML.
- Declarar `type="button"` en acciones que no envían formularios.
- Asociar `label`, `id`, `aria-describedby` y mensajes.
- Usar `aria-hidden="true"` en iconos decorativos.
- Utilizar texto visible o `aria-label` en botones de icono.
- No duplicar restricciones del campo dentro de la ayuda general.

```html
<button
  type="button"
  class="btn-secondary"
  [attr.aria-expanded]="isOpen()"
  [attr.aria-controls]="panelId"
  (click)="openHelp()"
>
  <i class="fas fa-circle-question" aria-hidden="true"></i>
  <span>Ayuda</span>
</button>
```

### 10.8 Formularios compartidos

Para formularios nuevos se deben reutilizar:

| Recurso | Responsabilidad |
|---|---|
| `FormFeedbackService` | Normalizar respuestas y mensajes seguros |
| `FormFeedbackState` | Resumen, errores por campo y foco |
| `FieldValidationDirective` | `is-invalid`, `aria-invalid` y `aria-describedby` |
| `FieldErrorComponent` | Mensaje visual del campo |
| `FormErrorSummaryComponent` | Resumen anunciado |
| `semantic-validators.ts` | Validación pura de nombres, lugares, usuarios y documentos |
| `LocationFieldsComponent` | Colombia/exterior y catálogo territorial |
| `FormHelpComponent` | Ayuda general contextual |
| `NotificationService` | Avisos globales temporizados |

No copiar su lógica en cada página.

### 10.9 CSS y temas

Los estilos globales definen tres temas y variables semánticas. Los colores principales son:

| Token | Oscuro | Claro | Azul |
|---|---:|---:|---:|
| `--bg-page` | `#0c0e14` | `#f3f5fb` | `#0f172a` |
| `--bg-card` | `#161923` | `#ffffff` | `#16223a` |
| `--text-primary` | `#eef0f8` | `#1c2333` | `#eaf1ff` |
| `--text-secondary` | `#8b91b8` | `#4a5572` | `#a8b7d8` |
| `--accent` | `#22d3c8` | `#2563eb` | `#38bdf8` |
| `--danger` | `#f87171` | `#dc2626` | `#f87171` |
| `--warning` | `#fb923c` | `#d97706` | `#fbbf24` |
| `--success` | `#4ade80` | `#16a34a` | `#4ade80` |

```css
.form-section {
  color: var(--text-primary);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}

.form-section button:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}
```

Reglas CSS:

- Usar variables de `styles.css`; no copiar hexadecimales de un tema.
- Estilos reutilizables en global; estilos exclusivos junto al componente.
- Nombres de clase en `kebab-case`.
- Evitar `!important`; solo se tolera al interoperar con una regla heredada difícil de superar y debe documentarse.
- No seleccionar por estructura profunda frágil.
- Definir estados `hover`, `focus-visible`, `disabled` y error.
- Revisar los tres temas.
- Añadir media queries donde el contenido, no un dispositivo concreto, lo requiera.
- Respetar `prefers-reduced-motion` para animaciones no esenciales.

La paleta completa, contraste y deuda actual se detallan en [accessibility-visual-guide.md](accessibility-visual-guide.md).

---

## 11. Pruebas

### 11.1 Backend

- Ubicar pruebas en `backend/<app>/tests.py` mientras el volumen actual no justifique un paquete `tests/`.
- Nombrar la clase por comportamiento: `FlujoInventarioTests`.
- Nombrar métodos como una afirmación: `test_anular_venta_restaura_stock`.
- Verificar estado HTTP, respuesta y efecto persistido.
- Incluir casos positivos, negativos, permisos, seguridad e integración.
- Usar datos ficticios y limpiar cualquier archivo temporal.
- Ejecutar la suite rápida con SQLite y la integración obligatoria con PostgreSQL para constraints, bloqueos y concurrencia.

```python
def test_vender_mas_que_disponible(self):
    response = self.client.post(
        '/api/ventas/crear/',
        self.payload_con_cantidad_excesiva(),
        format='json',
    )

    self.assertEqual(response.status_code, 400)
    self.stock.refresh_from_db()
    self.assertGreaterEqual(self.stock.cantidad, 0)
```

### 11.2 Frontend

La suite actual usa `node:test` para funciones puras y contratos estáticos de componentes compartidos.

```javascript
test('Escape cierra solo la ayuda y devuelve el foco', () => {
  assert.match(componentSource, /event\.key !== 'Escape'/);
  assert.match(componentSource, /helpButton.*focus/s);
});
```

Para lógica nueva:

- Extraer funciones puras cuando sea viable.
- Probar límites, normalización y transiciones de estado.
- Agregar pruebas DOM/E2E para interacción, foco, red y responsive cuando una prueba estática no sea suficiente.
- Ejecutar `npm test` y `npm run build`.
- No afirmar que un caso pasó únicamente porque el archivo de prueba existe.

### 11.3 Comandos de verificación

Desde los entornos configurados:

```text
Backend rápido:      python manage.py test --settings=config.test_settings
Backend integrado:  python manage.py test con PostgreSQL aislado
Frontend:            npm test
Build:               npm run build -- --configuration=production
```

No ejecutar suites destructivas contra una base operativa.

---

## 12. Docker y configuración

- `docker-compose.yml` ejecuta PostgreSQL, backend y frontend Nginx.
- `frontend/docker-entrypoint.sh` genera `assets/env.js` y publica `/api` por el mismo origen.
- El Dockerfile raíz también permite compilar Angular e integrarlo en la imagen Django.
- No codificar hosts o URLs de API en componentes.
- Usar `environment.apiUrl`, que toma `window.__env__.apiUrl` o `${window.location.origin}/api`.
- Usar `npm ci`, no `npm install`, en builds reproducibles.
- No cambiar imágenes base o versiones sin probar backend, frontend y build.

---

## 13. Git y revisión

### Ramas

Usar nombres descriptivos en `kebab-case` con un prefijo que identifique el propósito:

```text
feature/ayuda-contextual-formularios
fix/stock-negativo-transferencia
docs/actualizacion-calidad-seguridad
```

### Commits

Cuando el flujo autorice commits, se recomienda Conventional Commits:

```text
feat(inventario): agregar transferencia entre almacenes
fix(usuarios): hacer reactivo el filtro del listado
test(ventas): cubrir anulación y restauración de stock
docs(frontend): documentar temas y accesibilidad
```

Evitar mensajes como `cambios`, `arreglos`, `update` o `wip` en una rama lista para revisión.

### Revisión

- Un cambio lógico por commit.
- No mezclar refactorizaciones no relacionadas con una corrección urgente.
- Revisar `git diff` y `git status` antes de entregar.
- No sobrescribir cambios ajenos de un worktree sucio.
- No versionar `.env`, `media/`, bases locales, tokens, logs, `node_modules/`, `dist/` ni `staticfiles/`.

---

## 14. Antipatrones

| Evitar | Motivo | Alternativa |
|---|---|---|
| Endpoint construido en un componente | Duplica infraestructura | Servicio en `core/services` |
| `any` por comodidad | Oculta contratos inválidos | Interfaz, unión o `unknown` |
| Propiedad ordinaria usada por `computed` | No es reactiva | `signal` |
| Actualizar `Producto.stock` desde una vista | Rompe trazabilidad | `ServicioInventario` |
| Validar permisos solo ocultando el menú | Permite acceso directo | `@require_roles` en backend |
| Devolver `str(exception)` al cliente | Puede exponer detalles internos | Mensaje controlado y log seguro |
| Guardar formularios o ayuda en storage | Persiste datos innecesarios | Estado local del componente |
| Color hexadecimal en componente | Rompe temas | Token semántico |
| `div` con evento como botón | Dificulta teclado y semántica | `<button type="button">` |
| Usar placeholder como label | Pierde contexto al escribir | `label` asociado |
| Copiar validadores entre páginas | Divergencia | `shared/forms` |
| Ejecutar pruebas sobre datos reales | Riesgo operativo | Base aislada y datos ficticios |

---

## 15. Lista de verificación antes de entregar código

### Backend

- [ ] Entradas validadas por serializer o validador compartido.
- [ ] Permisos definidos en el servidor.
- [ ] Operaciones múltiples dentro de una transacción.
- [ ] Bloqueo de filas cuando existe concurrencia.
- [ ] Errores en español sin trazas ni secretos.
- [ ] Migraciones y constraints revisados.
- [ ] Pruebas positivas, negativas y de permisos actualizadas.

### Frontend

- [ ] Contratos reutilizados desde `core/models`.
- [ ] HTTP encapsulado en servicios.
- [ ] Estado reactivo con signals o RxJS según corresponda.
- [ ] Errores gestionados con los componentes compartidos.
- [ ] Botones con tipo y nombre accesible.
- [ ] Colores mediante tokens globales.
- [ ] Claro, Azul, Oscuro, escritorio y móvil revisados.
- [ ] `npm test` y build ejecutados.

### Seguridad y repositorio

- [ ] No hay secretos, tokens, contraseñas ni datos personales.
- [ ] No se añadió almacenamiento persistente innecesario.
- [ ] Los archivos modificados coinciden con el alcance.
- [ ] La documentación refleja cualquier contrato cambiado.
- [ ] `git status` fue revisado antes de la entrega.

---

## 16. Glosario de nombres del dominio

| Término | Significado |
|---|---|
| `StockAlmacen` | Existencia de un producto en un almacén específico |
| `MovimientoInventario` | Registro auditable de un cambio de existencias |
| `Traslado` | Operación que descuenta del origen e incrementa el destino |
| `ServicioInventario` | Única puerta de escritura de existencias |
| `Compra` / `DetalleCompra` | Cabecera y líneas de ingreso desde un proveedor |
| `Venta` / `DetalleVenta` | Cabecera y líneas de salida hacia un cliente |
| `empresa_snapshot` | Copia histórica de datos de empresa para comprobantes |
| `SesionAPI` | Sesión autenticada mediante token bearer |
| `FormFeedbackState` | Estado de resumen y errores por campo en Angular |
| `FormHelpContent` | Contrato del contenido general de ayuda contextual |

---

## 17. Control de cambios

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 15/03/2026 | Estándar inicial basado en Django y frontend estático |
| 2.0.0 | 08/08/2026 | Reescritura conforme a Angular standalone, servicios actuales, temas, accesibilidad, seguridad, Docker y estrategia de pruebas vigente |
