import { useState, useEffect } from 'react';
import { reporteRoles } from '../../services/apiUsuarios';
import './RolesReporte.css';

const ICONOS = {
  'Administrador': 'fas fa-user-shield',
  'Supervisor': 'fas fa-user-tie',
  'Vendedor': 'fas fa-cash-register',
  'Bodega': 'fas fa-warehouse',
};

const COLORES = {
  'Administrador': '#262B50',
  'Supervisor': '#17a2b8',
  'Vendedor': '#28a745',
  'Bodega': '#fd7e14',
};

export default function RolesReporte() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    setLoading(true);
    try {
      const data = await reporteRoles();
      setRoles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-roles">
        <h2>Roles del Sistema</h2>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <p>Cargando roles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-roles">
        <h2>Roles del Sistema</h2>
        <div style={{ textAlign: 'center', padding: 40, color: '#dc3545' }}>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
          <p>Error al cargar roles: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-roles">
      <h2>Roles del Sistema</h2>
      <div id="rolesContainer" className="roles-grid">
        {roles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, gridColumn: '1/-1' }}>
            <i className="fas fa-users-slash" style={{ fontSize: '2rem' }}></i>
            <p>No hay roles registrados</p>
          </div>
        ) : (
          roles.map(rol => {
            const icono = ICONOS[rol.nombre] || 'fas fa-user-tag';
            const color = COLORES[rol.nombre] || '#6c757d';
            
            const usuariosHTML = rol.usuarios.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: '0.85rem', textAlign: 'center', margin: '10px 0' }}>
                Sin usuarios asignados
              </p>
            ) : (
              rol.usuarios.map(u => (
                <div key={u.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{u.nombre_completo}</span><br />
                    <small style={{ color: '#888' }}>@{u.username}</small>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    background: u.estado === 'activo' ? '#d4edda' : '#f8d7da',
                    color: u.estado === 'activo' ? '#155724' : '#721c24'
                  }}>
                    {u.estado}
                  </span>
                </div>
              ))
            );

            return (
              <div key={rol.id} className="role-card" style={{ borderTop: `4px solid ${color}` }}>
                <div style={{ padding: '20px', background: `${color}08` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className={icono} style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                    </div>
                    <div>
                      <div className="role-title">{rol.nombre}</div>
                      <div className="role-desc">{rol.descripcion}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{rol.total}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>Total</div>
                    </div>
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#28a745' }}>{rol.activos}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>Activos</div>
                    </div>
                    <div style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#fff',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc3545' }}>{rol.inactivos}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>Inactivos</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '15px' }}>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px'
                  }}>
                    <i className="fas fa-users" style={{ marginRight: '5px' }}></i>Usuarios
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    {usuariosHTML}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}