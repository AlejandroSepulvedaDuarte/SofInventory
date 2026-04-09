# SofInventory — Frontend React

Frontend migrado de JS puro a **React + Vite**, consumiendo la API de Django.

## 📁 Estructura del proyecto

```
sofinventory-frontend/        ← Esta carpeta va dentro de sofInventory/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx              ← Punto de entrada
    ├── App.jsx               ← Rutas (React Router)
    ├── context/
    │   └── AuthContext.jsx   ← Manejo de sesión SIN sessionStorage/localStorage
    ├── pages/
    │   ├── Login.jsx         ← Módulo 1: Login
    │   └── Dashboard.jsx     ← Layout con Header + Sidebar + Módulo activo
    ├── components/
    │   ├── Header.jsx        ← Header con usuario y botón de salir
    │   └── Sidebar.jsx       ← Menú lateral con control de roles
    ├── modules/
    │   └── DashboardHome.jsx ← Módulo 2: Panel de control con métricas
    └── assets/styles/
        └── global.css
```

## 🚀 Instalación y uso

### 1. Colocar la carpeta en el proyecto Django

```
sofInventory/
├── frontend/          ← Pegar sofinventory-frontend aquí con este nombre
├── config/
├── usuarios/
└── ...
```

### 2. Instalar dependencias

```bash
cd sofInventory/frontend
npm install
```

### 3. Copiar el logo

Copiar `sofInventory/public/assets/images/logo.png` a `sofInventory/frontend/public/logo.png`

### 4. Levantar el servidor de desarrollo

```bash
# Terminal 1 — Django
cd sofInventory
python manage.py runserver

# Terminal 2 — React
cd sofInventory/frontend
npm run dev
```

React corre en **http://localhost:3000**  
Django corre en **http://localhost:8000**

El proxy en `vite.config.js` redirige `/api/*` → Django automáticamente.

### 5. Build para producción (opcional)

```bash
npm run build
```

Genera los archivos en `sofInventory/public/react/`.

---

## 🔐 Manejo de sesión (sin storage)

El usuario autenticado vive en **React Context** (memoria del navegador).  
No se usa `sessionStorage`, `localStorage` ni cookies.  
Al cerrar el navegador o recargar, el usuario debe volver a iniciar sesión.

```jsx
// Cualquier componente puede acceder al usuario así:
import { useAuth } from '../context/AuthContext'

function MiComponente() {
  const { user, logout } = useAuth()
  return <p>Hola {user.nombre}</p>
}
```

---

## 📦 Módulos migrados

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Login | ✅ Listo |
| 2 | Dashboard (métricas) | ✅ Listo |
| 3 | Gestión Productos | 🔜 Pendiente |
| 4 | Categorías | 🔜 Pendiente |
| 5 | Stock Actual | 🔜 Pendiente |
| 6 | Almacenes | 🔜 Pendiente |

---

## ➕ Cómo agregar un nuevo módulo

1. Crear `src/modules/NuevoModulo.jsx`
2. Importarlo en `src/pages/Dashboard.jsx`
3. Agregarlo al `MODULE_MAP`:

```jsx
import NuevoModulo from '../modules/NuevoModulo'

const MODULE_MAP = {
  'dashboard': <DashboardHome />,
  'nuevo-modulo': <NuevoModulo />,   // ← aquí
}
```

El `module` debe coincidir con el definido en `Sidebar.jsx`.
