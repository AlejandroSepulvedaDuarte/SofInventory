import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

const API_URL = 'http://127.0.0.1:8000/api'

export function AuthProvider({ children }) {
  // El usuario vive en memoria (estado de React), NO en sessionStorage ni localStorage
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión.')
        return false
      }

      // Guardamos el usuario en el estado de React, SIN tocar ningún storage
      setUser({
        id:       data.usuario.id,
        username: data.usuario.username,
        nombre:   data.usuario.nombre,
        rol:      data.usuario.rol,
        estado:   data.usuario.estado,
      })

      return true
    } catch {
      setError('No se pudo conectar con el servidor. Verifique su conexión.')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    // Solo limpiamos el estado, nada de storage
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, setError }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook para consumir el contexto fácilmente
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
