import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// Ruta protegida: si no hay usuario en memoria, redirige al login
function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Login — si ya hay sesión activa, va directo al dashboard */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Dashboard y módulos protegidos */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
