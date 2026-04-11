import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  listarProveedores, 
  eliminarProveedor, 
  cambiarEstadoProveedor,
  editarProveedor,
  listarTiposDocumento
} from '../../services/apiProveedores';
import './ProveedoresListado.css';

// Modal de edición
function ModalEditar({ proveedor, onClose, onSave }) {
  const [formData, setFormData] = useState({
    tipo_documento: '',
    numero_documento: '',
    razon_social: '',
    nombre_contacto: '',
    cargo_contacto: '',
    email: '',
    telefono: '',
    direccion: '',
    pais: '',
    departamento: '',
    ciudad: '',
    tipo_proveedor: '',
    estado: '',
    observaciones: ''
  });
  const [tiposDoc, setTiposDoc] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarTiposDocumento();
    if (proveedor) {
      setFormData({
        tipo_documento: proveedor.tipo_documento || '',
        numero_documento: proveedor.numero_documento || '',
        razon_social: proveedor.razon_social || '',
        nombre_contacto: proveedor.nombre_contacto || '',
        cargo_contacto: proveedor.cargo_contacto || '',
        email: proveedor.email || '',
        telefono: proveedor.telefono || '',
        direccion: proveedor.direccion || '',
        pais: proveedor.pais || '',
        departamento: proveedor.departamento || '',
        ciudad: proveedor.ciudad || '',
        tipo_proveedor: proveedor.tipo_proveedor || '',
        estado: proveedor.estado || '',
        observaciones: proveedor.observaciones || ''
      });
    }
  }, [proveedor]);

  const cargarTiposDocumento = async () => {
    try {
      const tipos = await listarTiposDocumento();
      setTiposDoc(tipos);
    } catch (error) {
      console.error('Error cargando tipos:', error);
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
        tipo_documento: parseInt(formData.tipo_documento),
        numero_documento: formData.numero_documento,
        razon_social: formData.razon_social,
        nombre_contacto: formData.nombre_contacto,
        cargo_contacto: formData.cargo_contacto,
        email: formData.email,
        telefono: formData.telefono,
        direccion: formData.direccion,
        pais: formData.pais,
        departamento: formData.departamento,
        ciudad: formData.ciudad,
        tipo_proveedor: formData.tipo_proveedor,
        estado: formData.estado,
        observaciones: formData.observaciones
      };
      
      const result = await editarProveedor(proveedor.id, datosActualizados);
      if (result.error) {
        alert('Error al actualizar: ' + JSON.stringify(result));
      } else {
        alert('✅ Proveedor actualizado correctamente.');
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
    <div className="modal-overlay-prov"  style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Editar Proveedor</h3>
        <form onSubmit={handleSubmit}>
          <input type="hidden" id="editId" value={proveedor?.id} />
          
          <div className="form-group">
            <label>Tipo de Documento</label>
            <select id="tipo_documento" value={formData.tipo_documento} onChange={handleChange} required>
              <option value="">Seleccione</option>
              {tiposDoc.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Número Documento</label>
            <input type="text" id="numero_documento" value={formData.numero_documento} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Razón Social</label>
            <input type="text" id="razon_social" value={formData.razon_social} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Nombre Contacto</label>
            <input type="text" id="nombre_contacto" value={formData.nombre_contacto} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Cargo Contacto</label>
            <input type="text" id="cargo_contacto" value={formData.cargo_contacto} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" id="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Teléfono</label>
            <input type="text" id="telefono" value={formData.telefono} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input type="text" id="direccion" value={formData.direccion} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>País</label>
            <input type="text" id="pais" value={formData.pais} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Departamento / Estado</label>
            <input type="text" id="departamento" value={formData.departamento} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Ciudad</label>
            <input type="text" id="ciudad" value={formData.ciudad} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>Tipo Proveedor</label>
            <select id="tipo_proveedor" value={formData.tipo_proveedor} onChange={handleChange} required>
              <option value="Bienes">Bienes (Productos)</option>
              <option value="Servicios">Servicios</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          <div className="form-group">
            <label>Estado</label>
            <select id="estado" value={formData.estado} onChange={handleChange} required>
              <option value="Activo">🟢 Activo</option>
              <option value="Inactivo">🔴 Inactivo</option>
            </select>
          </div>

          <div className="form-group">
            <label>Observaciones</label>
            <textarea id="observaciones" rows="3" value={formData.observaciones} onChange={handleChange}></textarea>
          </div>

          <div className="modal-buttons">
            <button type="submit" className="btn-guardar" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button type="button" className="btn-cerrar" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProveedoresListado() {
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [filteredProveedores, setFilteredProveedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);

  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    const filtered = proveedores.filter(p =>
      p.razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre_contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.numero_documento?.includes(searchTerm)
    );
    setFilteredProveedores(filtered);
  }, [searchTerm, proveedores]);

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      const data = await listarProveedores();
      setProveedores(data);
      setFilteredProveedores(data);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id, razon) => {
    if (!confirm(`¿Seguro que deseas eliminar al proveedor "${razon}"?`)) return;
    try {
      await eliminarProveedor(id);
      alert('✅ Proveedor eliminado correctamente.');
      cargarProveedores();
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
    }
  };

  const handleCambiarEstado = async (id) => {
    try {
      await cambiarEstadoProveedor(id);
      cargarProveedores();
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
    }
  };

  const handleEditar = (proveedor) => {
    setSelectedProveedor(proveedor);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProveedor(null);
  };

  return (
    <div className="container">
      <h2>Listado de Proveedores</h2>

      <div className="search-box">
        <input
          type="text"
          id="buscarProveedor"
          placeholder="Buscar proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: 40 }}>Cargando proveedores...</p>
      ) : (
        <table id="tablaProveedores">
          <thead>
            <tr>
              <th>Tipo Doc.</th>
              <th>N° Documento</th>
              <th>Razón Social</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Tipo Proveedor</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProveedores.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                  No hay proveedores registrados.
                </td>
              </tr>
            ) : (
              filteredProveedores.map(p => (
                <tr key={p.id}>
                  <td data-label="Tipo Doc.">{p.tipo_documento_nombre}</td>
                  <td data-label="N° Documento">{p.numero_documento}</td>
                  <td data-label="Razón Social">{p.razon_social}</td>
                  <td data-label="Contacto">
                    {p.nombre_contacto}<br />
                    <small style={{ color: '#888' }}>{p.cargo_contacto || ''}</small>
                  </td>
                  <td data-label="Email">{p.email}</td>
                  <td data-label="Teléfono">{p.telefono}</td>
                  <td data-label="Tipo Proveedor">{p.tipo_proveedor}</td>
                  <td data-label="Estado" className={p.estado === 'Activo' ? 'estado-activo' : 'estado-inactivo'}>
                    {p.estado}
                  </td>
                  <td data-label="Acciones" className="acciones">
                    <button className="btn btn-edit" onClick={() => handleEditar(p)}>Editar</button>
                    <button className="btn btn-status" onClick={() => handleCambiarEstado(p.id)}>
                      {p.estado === 'Activo' ? 'Inactivar' : 'Activar'}
                    </button>
                    <button className="btn btn-delete" onClick={() => handleEliminar(p.id, p.razon_social)}>Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <ModalEditar
          proveedor={selectedProveedor}
          onClose={handleModalClose}
          onSave={cargarProveedores}
        />
      )}
    </div>
  );
}