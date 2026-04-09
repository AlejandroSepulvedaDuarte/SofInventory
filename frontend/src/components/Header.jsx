import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()           // limpia el estado de React
    navigate('/')      // redirige al login
  }

  return (
    <header className="main-content">
      <div className="header-inner">
        <button className="hamburger-btn" onClick={onMenuToggle} title="Menú">
          ☰
        </button>
        <img src="/logo.png" alt="SofInventory Logo" id="headerLogo" />
      </div>

      <div className="header-actions">
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Buscar productos, clientes..."
          />
        </div>

        <div className="user-actions">
          <div className="user-info">
            <div className="user-avatar">
              <i className="fas fa-user" />
            </div>
            <span id="user-name">
              {user?.nombre || user?.username || 'Usuario'}
            </span>
            <span className="user-role">({user?.rol})</span>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Cerrar sesión">
            <i className="fas fa-sign-out-alt" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
