<div align="center">

![SofInventory — Software Inventory System](docs/assets/logo.png)

# SofInventory

**Sistema web para administrar productos, terceros, almacenes, inventario, compras y ventas.**

Angular 19 · Django 6 · Django REST Framework 3.17 · PostgreSQL 15 · Docker

</div>

---

## Descripción

SofInventory centraliza la operación comercial y de inventario de una empresa. Integra catálogo de productos, existencias por almacén, movimientos auditables, compras, ventas, comprobantes, usuarios con roles, configuración empresarial e indicadores del Dashboard.

El sistema está compuesto por una SPA Angular y un backend Django REST Framework. PostgreSQL conserva la información y sus restricciones; Nginx publica el frontend y enruta las solicitudes del entorno Docker.

### Características principales

- Inventario por producto y almacén.
- Entradas, salidas, ajustes y transferencias con trazabilidad.
- Compras con ingreso de existencias y anulación controlada.
- Ventas con validación de stock, pagos, anulación y comprobante.
- Gestión de categorías, productos, proveedores y clientes.
- Usuarios, sesiones, bloqueo por intentos fallidos, roles y auditoría.
- Configuración de empresa, logo y datos históricos en comprobantes.
- Dashboard con periodos, comparaciones, gráficas y zona horaria de Colombia.
- Tres temas visuales: Claro, Azul y Oscuro.
- Formularios responsive con validación semántica, ubicación Colombia/exterior y ayuda contextual.
- Suites automatizadas para backend y lógica compartida del frontend.

---

## Módulos y alcance funcional

| Módulo | Funcionalidad principal |
|---|---|
| Login y sesiones | Autenticación, expiración, cierre, límite de intentos y bloqueo |
| Usuarios | Cuentas, roles, estado, desbloqueo y auditoría |
| Categorías | Clasificación y tipo de control de productos |
| Productos | Identificación, referencia, precios, IVA, imagen, estado y stock mínimo |
| Proveedores | Identificación, contacto, ubicación y relación con compras |
| Clientes | Persona natural o jurídica, contacto, ubicación y relación con ventas |
| Almacenes | Ubicaciones físicas, capacidad, responsable y estado |
| Inventario | Existencias, alertas, movimientos, ajustes y transferencias |
| Compras | Proveedor, almacén, productos, costos, impuestos, totales y anulación |
| Ventas | Cliente, almacén, productos, disponibilidad, pago, comprobante y anulación |
| Empresa | Identidad, ubicación, contacto, logo y mensaje del comprobante |
| Dashboard | Métricas, periodos, margen, series, alertas y actividad reciente |
| Frontend compartido | Temas, notificaciones, validaciones, ayuda contextual y responsive |

### Roles

| Rol | Responsabilidad general |
|---|---|
| Administrador | Configuración, usuarios y operación completa autorizada |
| Supervisor | Supervisión y operaciones comerciales e inventario permitidas |
| Bodega | Compras, almacenes y movimientos autorizados |
| Vendedor | Clientes, ventas y consultas permitidas |

La interfaz adapta rutas y acciones, pero los permisos efectivos siempre se validan en el backend.

---

## Arquitectura

```text
┌─────────────────────────────────────────────────────────────┐
│                      Navegador web                          │
│  Angular standalone · Signals · Router · HttpClient        │
└──────────────────────────────┬──────────────────────────────┘
                               │ /api
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                         Nginx                               │
│  SPA fallback · Proxy API · Archivos estáticos y media     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Django REST Framework                      │
│  Autenticación · Permisos · Validación · Reglas de negocio │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL                            │
│  Persistencia · Constraints · Transacciones · Bloqueos     │
└─────────────────────────────────────────────────────────────┘
```

### Decisiones relevantes

- Componentes Angular standalone y rutas con carga diferida.
- Estado local con signals y valores derivados con `computed`.
- HTTP centralizado en servicios; los componentes no construyen endpoints.
- Token bearer agregado mediante interceptor.
- Permisos definitivos mediante autenticación y roles en Django.
- `ServicioInventario` como puerta de escritura de existencias.
- `transaction.atomic` y `select_for_update` en operaciones concurrentes.
- Contratos históricos mediante snapshots de empresa y detalle.
- Custom properties CSS como fuente de verdad de temas y colores.
- Infraestructura compartida para errores, ubicaciones, notificaciones y ayuda.

Consulta [Arquitectura del frontend](docs/frontend-architecture.md) y [Arquitectura de inventario](docs/ARQUITECTURA_INVENTARIO.md) para el detalle técnico.

---

## Tecnologías

Las versiones de referencia son las verificadas dentro de los contenedores, no las instaladas en Windows.

| Capa | Tecnología | Versión verificada |
|---|---|---:|
| Frontend | Angular | 19.2.21 |
| Lenguaje frontend | TypeScript | 5.6.3 |
| Runtime de build | Node.js Alpine | 20 |
| Gráficas | Chart.js | 4.5.1 |
| Iconos | Font Awesome | 7.2.0 |
| Backend | Django | 6.0.4 |
| API | Django REST Framework | 3.17.1 |
| Runtime backend | Python | 3.12.13 |
| Base de datos | PostgreSQL | 15.18 |
| Servidor frontend | Nginx sobre Alpine | 1.31.3 / 3.24.1 |
| Contenedores | Docker Compose | Servicios `db`, `backend` y `frontend` |

---

## Estructura del repositorio

```text
sofinventory/
├── backend/
│   ├── config/          # Configuración Django
│   ├── catalogos/       # Catálogo territorial y utilidades de archivos
│   ├── usuarios/        # Sesiones, roles, permisos y auditoría
│   ├── productos/       # Categorías y productos
│   ├── proveedores/
│   ├── clientes/
│   ├── inventario/      # Almacenes, stock, movimientos y transferencias
│   ├── compras/
│   ├── ventas/
│   ├── empresa/
│   ├── dashboard/
│   └── requirements.txt
├── frontend/
│   ├── src/app/core/    # Guards, interceptor, contratos y servicios
│   ├── src/app/pages/   # Pantallas funcionales
│   ├── src/app/shared/  # Layout, formularios, ayuda y notificaciones
│   ├── src/styles.css   # Temas y sistema visual
│   └── tests/           # Pruebas Node de lógica compartida
├── docs/                # Manuales, arquitectura y pruebas
├── docker-compose.yml
├── Dockerfile           # Variante combinada Angular + Django
└── .env.example
```

---

## Inicio rápido con Docker

### Requisitos

- Docker con soporte para Compose.
- Puertos locales `80` y `8000` disponibles.
- Valores seguros para base de datos, Django y administrador inicial.

### 1. Preparar variables de entorno

El `docker-compose.yml` actual utiliza `.env` para interpolar valores y requiere `backend/.env` como archivo de entorno del servicio Django. Ambos deben contener los mismos valores seguros.

PowerShell:

```powershell
Copy-Item .env.example .env
# Edite .env y reemplace todos los valores de ejemplo.
Copy-Item .env backend/.env
```

Linux o macOS:

```bash
cp .env.example .env
# Edite .env y reemplace todos los valores de ejemplo.
cp .env backend/.env
```

No utilice en un entorno real las contraseñas o claves ilustrativas de `.env.example`.

Variables principales:

| Variable | Finalidad |
|---|---|
| `POSTGRES_DB` | Nombre de la base PostgreSQL |
| `POSTGRES_USER` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL |
| `SECRET_KEY` | Clave criptográfica de Django |
| `DEBUG` | Depuración; debe ser `False` fuera de desarrollo |
| `TIME_ZONE` | Zona de negocio, normalmente `America/Bogota` |
| `ALLOWED_HOSTS` | Hosts autorizados por Django |
| `CSRF_TRUSTED_ORIGINS` | Orígenes confiables cuando aplique |
| `INITIAL_ADMIN_*` | Datos del administrador inicial |

### 2. Construir e iniciar servicios

```powershell
docker compose up --build -d
docker compose ps
```

El arranque del backend aplica migraciones, ejecuta la inicialización idempotente de catálogos/roles/administrador y recopila archivos estáticos.

### 3. Abrir la aplicación

| Servicio | Dirección |
|---|---|
| Aplicación web | `http://localhost/` |
| Prefijo API directo | `http://localhost:8000/api/` |
| Prefijo API a través de Nginx | `http://localhost/api/` |

PostgreSQL no publica un puerto al host en la configuración actual; solo es accesible por los servicios de la red Docker.

### 4. Consultar registros

```powershell
docker compose logs -f backend
docker compose logs -f frontend
```

No comparta salidas que contengan datos personales, secretos o credenciales iniciales.

### 5. Detener el entorno

```powershell
docker compose down
```

Este comando conserva los volúmenes. `docker compose down -v` elimina los datos locales de PostgreSQL y media; úselo únicamente cuando se pretenda descartar expresamente ese entorno.

---

## Desarrollo y comandos útiles

### Frontend

Desde `frontend/`:

```powershell
npm ci
npm test
npm run build -- --configuration=production
```

`npm start` ejecuta el servidor de desarrollo Angular, pero la aplicación completa necesita además una configuración de API compatible. Docker es la vía reproducible documentada para ejecutar todos los servicios juntos.

### Backend

Dentro del contenedor backend:

```powershell
docker compose exec backend python manage.py check
docker compose exec backend python manage.py test --settings=config.test_settings
```

La configuración `config.test_settings` usa SQLite temporal para una ejecución rápida. Las restricciones, transacciones y concurrencia deben verificarse además en PostgreSQL aislado.

### Auditoría de inventario

```powershell
docker compose exec backend python manage.py auditar_inventario
```

Antes de ejecutar comandos administrativos, confirme su alcance y el entorno de destino.

---

## Seguridad

- Los secretos se cargan desde variables de entorno.
- `DEBUG` es falso por defecto y `ALLOWED_HOSTS` es obligatorio fuera de desarrollo.
- La API utiliza sesiones con token bearer y expiración de 12 horas.
- El login aplica throttling por IP y registra intentos fallidos.
- Las contraseñas pasan validadores de Django y se almacenan con hash.
- Los roles se validan en el backend mediante permisos explícitos.
- Las operaciones de usuario generan eventos de auditoría sin incluir secretos.
- Las imágenes se validan por contenido, tamaño y ruta segura.
- Nginx añade encabezados contra framing, detección MIME y fugas de referrer.

### Persistencia actual de sesión

El frontend conserva `auth_token`, `auth_expires_at` y `auth_user` en `localStorage`, encapsulados por `AuthService`. Ningún componente nuevo debe manipular directamente esas claves ni almacenar contraseñas, formularios o permisos calculados.

Existe una diferencia abierta entre el estado que puede devolver una sesión expirada (`403`) y el que el interceptor limpia automáticamente (`401`). El detalle y la revalidación necesaria están en [DEFECTOS.md](docs/test-cases/DEFECTOS.md).

No reporte vulnerabilidades incluyendo tokens, contraseñas, encabezados `Authorization`, secretos o datos personales.

---

## Temas, accesibilidad y responsive

El frontend ofrece:

- Tema Oscuro con acento turquesa.
- Tema Claro con acento azul.
- Tema Azul corporativo con acento celeste.
- Variables CSS semánticas para fondos, texto, estados, radios y sombras.
- Formularios con labels, errores por campo, resúmenes y foco al primer inválido.
- Notificaciones con región accesible y pausa por foco o puntero.
- Ayuda contextual con títulos dinámicos, teclado, `Escape` y retorno del foco.
- Sidebar, modales y paneles adaptados a móvil.
- Preferencia de movimiento reducido en componentes que ya la implementan.

La aplicación tiene deuda accesible documentada; la existencia de atributos ARIA no equivale a una certificación. Consulte la [Guía de accesibilidad y diseño visual](docs/accessibility-visual-guide.md).

---

## Estado de calidad

Última ejecución documentada: **8 de agosto de 2026**.

### Automatización y build

| Verificación | Resultado |
|---|---|
| Backend con SQLite temporal | 99/99 aprobadas |
| Backend con PostgreSQL 15 aislado | 99/99 aprobadas |
| Pruebas Node del frontend | 24/24 aprobadas |
| Build Angular de producción | Aprobado con advertencias de presupuesto |

### Casos funcionales

| Total | Aprobados | Parcial | Fallidos |
|---:|---:|---:|---:|
| 78 | 67 | 1 | 10 |

La decisión vigente es **aprobación condicionada**. Las suites automatizadas están aprobadas, pero la liberación a producción no se recomienda hasta corregir y reejecutar los defectos funcionales abiertos.

Documentos de calidad:

- [Matriz de cobertura](docs/test-cases/MATRIZ_COBERTURA.md)
- [Resultados de ejecución](docs/test-cases/RESULTADOS_EJECUCION_2026-08-08.md)
- [Registro de defectos](docs/test-cases/DEFECTOS.md)
- [Manifiesto de evidencias](docs/test-cases/evidencias-ejecucion/README.md)

---

## Documentación

| Documento | Contenido |
|---|---|
| [Portada documental](docs/README.md) | Alcance de calidad, resultados e índice de casos |
| [Manual de usuario](docs/MANUAL_USUARIO.md) | Uso funcional del sistema |
| [Manual técnico](docs/MANUAL_TECNICO.md) | Instalación, componentes y operación técnica |
| [Arquitectura del frontend](docs/frontend-architecture.md) | Capas, rutas, estado, servicios y despliegue |
| [Arquitectura de inventario](docs/ARQUITECTURA_INVENTARIO.md) | Integridad, movimientos, bloqueos y anulaciones |
| [Estándar de codificación](docs/coding-standards.md) | Convenciones de Python, Angular, HTML, CSS, API y pruebas |
| [Accesibilidad y diseño visual](docs/accessibility-visual-guide.md) | Temas, paleta, contraste, teclado, responsive y deuda actual |

El sitio MkDocs se configura mediante `mkdocs.yml`.

---

## Convenciones para colaborar

- Crear ramas descriptivas como `feature/...`, `fix/...` o `docs/...`.
- Mantener cambios enfocados y no sobrescribir trabajo ajeno.
- No versionar `.env`, bases locales, archivos de `media`, tokens o credenciales.
- Reutilizar servicios, contratos, validadores y componentes compartidos.
- Añadir pruebas de regresión para correcciones.
- Ejecutar las pruebas relevantes y el build antes de proponer una integración.
- Actualizar la documentación cuando cambie un contrato o flujo visible.
- Revisar `git diff` y `git status` antes de entregar.

Consulte el [Estándar de codificación](docs/coding-standards.md) antes de modificar el proyecto.

---

## Autores

- Alejandro Sepúlveda Duarte
- Lucy Estefany Izquierdo Jaramillo

© 2026 SofInventory
