import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { login, loading, error, setError } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [success, setSuccess]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess('')

    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingrese su usuario y contraseña.')
      return
    }

    const ok = await login(username.trim(), password.trim())
    if (ok) {
      setSuccess(`¡Bienvenido!`)
      setTimeout(() => navigate('/dashboard'), 1200)
    }
  }

  return (
    <div className="theme-blue">
      <div className="login-container">
        <img src="/logo-loginB.jpg" alt="SofInventory Logo" />
        <h2>Bienvenido a SofInventory</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                placeholder="Ingresa la contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <span
                className="toggle-password"
                onClick={() => setShowPass(p => !p)}
              >
                <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
              </span>
            </div>
          </div>

          {error   && <div className="form-message error">{error}</div>}
          {success && <div className="form-message success">{success}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="register-prompt">
          <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
        </div>
      </div>
    </div>
  )
}
