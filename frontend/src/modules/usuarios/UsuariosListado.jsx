import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  listarUsuarios, 
  eliminarUsuario, 
  cambiarEstadoUsuario,
  listarRoles,
  listarTiposDocumento,
  editarUsuario
} from '../../services/apiUsuarios';
import './UsuariosListado.css';

// Modal de edición
function ModalEditar({ usuario, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    tipo_documento: '',
    numero_documento: '',
    email: '',
    username: '',
    rol: '',
    observaciones: ''
  });
  const [roles, setRoles] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
    if (usuario) {
      setFormData({
        nombre_completo: usuario.nombre_completo || '',
        tipo_documento: usuario.tipo_documento || '',
        numero_documento: usuario.numero_documento || '',
        email: usuario.email || '',
        username: usuario.username || '',
        rol: usuario.rol || '',
        observaciones: usuario.observaciones || ''
      });
    }
  }, [usuario]);

  const cargarDatos = async () => {
    try {
      const [rolesData, tiposData] = await Promise.all([
        listarRoles(),
        listarTiposDocumento()
      ]);
      setRoles(rolesData);
      setTiposDoc(tiposData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const datosActualizados = {
        nombre_completo: formData.nombre_completo,
        tipo_documento: parseInt(formData.tipo_documento),
        numero_documento: formData.numero_documento,
        email: formData.email,
        username: formData.username,
        rol: parseInt(formData.rol),
        observaciones: formData.observaciones
      };
      
      const result = await editarUsuario(usuario.id, datosActualizados);
      if (result.error) {
        alert('Error al actualizar: ' + JSON.stringify(result));
      } else {
        alert('✅ Usuario actualizado correctamente.');
        onSave();
        onClose();
      }
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Editar Usuario</h2>
        <form onSubmit={handleSubmit}>
          <input type="hidden" id="editarId" value={usuario?.id} />
          
          <label>Nombre Completo</label>
          <input type="text" id="nombre_completo" value={formData.nombre_completo} onChange={handleChange} required />
          
          <label>Tipo de Documento</label>
          <select id="tipo_documento" value={formData.tipo_documento} onChange={handleChange} required>
            <option value="">Seleccione</option>
            {tiposDoc.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          
          <label>N° Documento</label>
          <input type="text" id="numero_documento" value={formData.numero_documento} onChange={handleChange} required />
          
          <label>Correo</label>
          <input type="email" id="email" value={formData.email} onChange={handleChange} required />
          
          <label>Usuario</label>
          <input type="text" id="username" value={formData.username} onChange={handleChange} required />
          
          <label>Rol</label>
          <select id="rol" value={formData.rol} onChange={handleChange} required>
            <option value="">Seleccione un rol</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          
          <label>Observaciones</label>
          <textarea id="observaciones" value={formData.observaciones} onChange={handleChange} rows="3"></textarea>
          
          <div className="modal-buttons">
            <button type="button" className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsuariosListado() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!user || user.rol !== 'Administrador') {
      alert('Acceso denegado. Solo administradores pueden ver esta página.');
      return;
    }
    cargarUsuarios();
  }, [user]);

  useEffect(() => {
    const filtered = usuarios.filter(u =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsuarios(filtered);
  }, [searchTerm, usuarios]);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
      setFilteredUsuarios(data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id, nombre) => {
    if (!confirm(`¿Seguro que deseas eliminar al usuario "${nombre}"?`)) return;
    try {
      await eliminarUsuario(id);
      alert('✅ Usuario eliminado correctamente.');
      cargarUsuarios();
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
    }
  };

  const handleCambiarEstado = async (id) => {
    try {
      await cambiarEstadoUsuario(id);
      cargarUsuarios();
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
    }
  };

  const handleEditar = (usuario) => {
    setSelectedUser(usuario);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  if (!user || user.rol !== 'Administrador') {
    return null;
  }

  return (
    <div className="container">
      <h2>Listado de Usuarios</h2>

      <div className="search-box">
        <input
          type="text"
          id="buscar"
          placeholder="Buscar usuario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: 40 }}>Cargando usuarios...</p>
      ) : (
        <table id="tablaUsuarios">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No hay usuarios registrados.</td>
              </tr>
            ) : (
              filteredUsuarios.map(u => (
                <tr key={u.id}>
                  <td data-label="Usuario">{u.username}</td>
                  <td data-label="Nombre">{u.nombre_completo}</td>
                  <td data-label="Correo">{u.email}</td>
                  <td data-label="Rol">{u.rol_nombre}</td>
                  <td data-label="Estado">
                    <span className={`badge ${u.estado === 'activo' ? 'badge-activo' : 'badge-inactivo'}`}>
                      {u.estado}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <div className="acciones-movil">
                      <button onClick={() => handleEditar(u)} className="btn-editar">
                        <i className="fas fa-edit"></i> Editar
                      </button>
                      <button onClick={() => handleEliminar(u.id, u.nombre_completo)} className="btn-delete">
                        <i className="fas fa-trash-alt"></i> Eliminar
                      </button>
                      <button onClick={() => handleCambiarEstado(u.id)} className="btn-status">
                        {u.estado === "activo" ? (
                          <><i className="fas fa-ban"></i> Inactivar</>
                        ) : (
                          <><i className="fas fa-check"></i> Activar</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <ModalEditar
          usuario={selectedUser}
          onClose={handleModalClose}
          onSave={cargarUsuarios}
        />
      )}
    </div>
  );
}