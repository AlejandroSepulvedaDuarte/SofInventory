import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import DashboardHome from '../modules/DashboardHome'
import './Dashboard.css'
import Usuarios from '../modules/usuarios/Usuarios';
import UsuariosListado from '../modules/usuarios/UsuariosListado';
import RolesReporte from '../modules/roles/RolesReporte';

// Mapa de módulos — se irán agregando conforme se migren
const MODULE_MAP = {
  'dashboard': <DashboardHome />,
  'registro-usuarios': <Usuarios />,
  'listado-usuarios': <UsuariosListado />,
  'roles': <RolesReporte />,
  // Próximos módulos:
  // 'gestion-productos': <GestionProductos />,
  // 'categorias': <Categorias />,
  // 'stock': <StockActual />,
  // 'almacenes': <Almacenes />,
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeModule, setActiveModule] = useState('dashboard')

  function handleModuleChange(module) {
    setActiveModule(module)
    setSidebarOpen(false) // cierra el menú en móvil al navegar
  }

  const currentModule = MODULE_MAP[activeModule] || (
    <div className="module-placeholder">
      <i className="fas fa-tools" />
      <h3>Módulo en construcción</h3>
      <p>Este módulo aún no ha sido migrado a React.</p>
    </div>
  )

  return (
    <div className="dashboard-layout">
      <Header onMenuToggle={() => setSidebarOpen(o => !o)} />

      <Sidebar
        isOpen={sidebarOpen}
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
      />

      <main className="dashboard-main">
        {currentModule}
      </main>
    </div>
  )
}
