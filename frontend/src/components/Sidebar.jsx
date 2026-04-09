import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

// Definición de módulos con sus roles permitidos
const MENU_ITEMS = [
  {
    label: 'Inicio',
    icon: 'fa-home',
    module: 'dashboard',
    roles: ['Administrador', 'Vendedor', 'Bodeguero'],
  },
  {
    label: 'Productos',
    icon: 'fa-box',
    roles: ['Administrador', 'Bodeguero'],
    submenu: [
      { label: 'Gestionar Productos', icon: 'fa-list', module: 'gestion-productos', roles: ['Administrador', 'Bodeguero'] },
      { label: 'Categorías',          icon: 'fa-tags', module: 'categorias',        roles: ['Administrador', 'Bodeguero'] },
    ],
  },
  {
    label: 'Inventario',
    icon: 'fa-warehouse',
    roles: ['Administrador', 'Vendedor', 'Bodeguero'],
    submenu: [
      { label: 'Stock Actual', icon: 'fa-cubes',         module: 'stock',     roles: ['Administrador', 'Vendedor', 'Bodeguero'] },
      { label: 'Almacenes',    icon: 'fa-map-marker-alt', module: 'almacenes', roles: ['Administrador', 'Bodeguero'] },
    ],
  },
  {
    label: 'Ventas',
    icon: 'fa-cash-register',
    roles: ['Administrador', 'Vendedor'],
    submenu: [
      { label: 'Nueva Venta',    icon: 'fa-plus-circle', module: 'nueva-venta',  roles: ['Administrador', 'Vendedor'] },
      { label: 'Lista de Ventas', icon: 'fa-list-alt',   module: 'lista-ventas', roles: ['Administrador', 'Vendedor'] },
    ],
  },
  {
    label: 'Compras',
    icon: 'fa-shopping-cart',
    roles: ['Administrador', 'Bodeguero'],
    submenu: [
      { label: 'Nueva Compra',    icon: 'fa-cart-plus', module: 'nueva-compra',    roles: ['Administrador'] },
      { label: 'Historial Compras', icon: 'fa-history', module: 'historial-compras', roles: ['Administrador', 'Bodeguero'] },
    ],
  },
  {
    label: 'Clientes',
    icon: 'fa-users',
    roles: ['Administrador', 'Vendedor'],
    submenu: [
      { label: 'Gestión Clientes', icon: 'fa-user-friends', module: 'gestion-clientes', roles: ['Administrador', 'Vendedor'] },
    ],
  },
  {
    label: 'Proveedores',
    icon: 'fa-truck',
    roles: ['Administrador', 'Bodeguero'],
    submenu: [
      { label: 'Gestión Proveedores', icon: 'fa-truck-loading', module: 'gestion-proveedores', roles: ['Administrador', 'Bodeguero'] },
      { label: 'Listado Proveedores', icon: 'fa-list',          module: 'listado-proveedores', roles: ['Administrador', 'Bodeguero'] },
    ],
  },
  {
    label: 'Usuarios',
    icon: 'fa-user-cog',
    roles: ['Administrador'],
    submenu: [
      { label: 'Gestionar Usuarios', icon: 'fa-user-edit', module: 'usuarios',          roles: ['Administrador'] },
      { label: 'Listado Usuarios',   icon: 'fa-list',      module: 'listado-usuarios',  roles: ['Administrador'] },
      { label: 'Roles',              icon: 'fa-shield-alt', module: 'roles',            roles: ['Administrador'] },
    ],
  },
]

function canSee(item, rol) {
  return item.roles.includes(rol)
}

export default function Sidebar({ isOpen, activeModule, onModuleChange }) {
  const { user } = useAuth()
  const [openMenus, setOpenMenus] = useState({})

  function toggleSubmenu(label) {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <>
      {/* Overlay para cerrar en móvil */}
      {isOpen && <div className="overlay" onClick={() => onModuleChange(activeModule)} />}

      <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo">
          <h3>SofInventory</h3>
        </div>

        <ul>
          {MENU_ITEMS.map(item => {
            if (!canSee(item, user?.rol)) return null

            // Item sin submenú (ej: Inicio)
            if (!item.submenu) {
              return (
                <li
                  key={item.label}
                  className={activeModule === item.module ? 'active' : ''}
                  onClick={() => onModuleChange(item.module)}
                >
                  <i className={`fas ${item.icon}`} />
                  <span>{item.label}</span>
                </li>
              )
            }

            // Item con submenú
            const isExpanded = openMenus[item.label]
            return (
              <div key={item.label}>
                <li
                  className={`has-submenu ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleSubmenu(item.label)}
                >
                  <i className={`fas ${item.icon}`} />
                  <span>{item.label}</span>
                  <i className={`fas fa-chevron-right submenu-toggle ${isExpanded ? 'rotated' : ''}`} />
                </li>

                {isExpanded && (
                  <ul className="submenu">
                    {item.submenu.map(sub => {
                      if (!canSee(sub, user?.rol)) return null
                      return (
                        <li
                          key={sub.module}
                          className={activeModule === sub.module ? 'active' : ''}
                          onClick={() => onModuleChange(sub.module)}
                        >
                          <i className={`fas ${sub.icon}`} />
                          <span>{sub.label}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
