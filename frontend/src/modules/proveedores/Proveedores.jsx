import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { crearProveedor, listarTiposDocumento } from '../../services/apiProveedores';
import './Proveedores.css';

export default function Proveedores() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tiposDoc, setTiposDoc] = useState([]);
  
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
    estado: 'Activo',
    observaciones: ''
  });

  useEffect(() => {
    cargarTiposDocumento();
  }, []);

  const cargarTiposDocumento = async () => {
    try {
      const tipos = await listarTiposDocumento();
      setTiposDoc(tipos);
    } catch (error) {
      console.error('Error cargando tipos de documento:', error);
    }
  };

  const validarEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validarTelefono = (tel) => {
    return /^[0-9\s\-\+]+$/.test(tel);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarEmail(formData.email)) {
      alert("❌ Correo electrónico inválido.");
      return;
    }

    if (!validarTelefono(formData.telefono)) {
      alert("❌ Teléfono inválido. Solo números, espacios, guiones y +.");
      return;
    }

    setLoading(true);
    try {
      const nuevoProveedor = {
        tipo_documento: parseInt(formData.tipo_documento),
        numero_documento: formData.numero_documento.trim(),
        razon_social: formData.razon_social.trim(),
        nombre_contacto: formData.nombre_contacto.trim(),
        cargo_contacto: formData.cargo_contacto.trim(),
        email: formData.email.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
        pais: formData.pais.trim(),
        departamento: formData.departamento.trim(),
        ciudad: formData.ciudad.trim(),
        tipo_proveedor: formData.tipo_proveedor,
        estado: formData.estado,
        observaciones: formData.observaciones.trim(),
        creado_por: user?.id
      };

      const result = await crearProveedor(nuevoProveedor);
      
      if (result.error) {
        alert('Error al guardar proveedor: ' + JSON.stringify(result));
      } else {
        alert('✅ Proveedor guardado correctamente.');
        // Resetear formulario
        setFormData({
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
          estado: 'Activo',
          observaciones: ''
        });
      }
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    if (confirm("¿Cancelar registro?")) {
      setFormData({
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
        estado: 'Activo',
        observaciones: ''
      });
    }
  };

  return (
    <div className="main-wrapper">
      <div className="proveedores-container">
        <div className="form-header">
          <h2 className="titulo-modulo">Nuevo Proveedor</h2>
          <p className="subtitulo">Complete la información para registrar un aliado comercial.</p>
        </div>

        <form id="formProveedores" className="form-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de documento <span className="required">*</span></label>
            <select id="tipo_documento" value={formData.tipo_documento} onChange={handleChange} required>
              <option value="">Seleccione...</option>
              {tiposDoc.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Número de documento <span className="required">*</span></label>
            <input type="text" id="numero_documento" value={formData.numero_documento} onChange={handleChange} placeholder="Ej: 9001234561" required />
          </div>

          <div className="form-group">
            <label>Razón social / Nombre <span className="required">*</span></label>
            <input type="text" id="razon_social" value={formData.razon_social} onChange={handleChange} placeholder="Ej: Insumos y Suministros SAS" required />
          </div>

          <div className="form-group">
            <label>Nombre de contacto <span className="required">*</span></label>
            <input type="text" id="nombre_contacto" value={formData.nombre_contacto} onChange={handleChange} placeholder="Ej: Carlos Pérez" required />
          </div>

          <div className="form-group">
            <label>Cargo del contacto</label>
            <input type="text" id="cargo_contacto" value={formData.cargo_contacto} onChange={handleChange} placeholder="Ej: Gerente de ventas" />
          </div>

          <div className="form-group">
            <label>Correo electrónico <span className="required">*</span></label>
            <input type="email" id="email" value={formData.email} onChange={handleChange} placeholder="contacto@empresa.com" required />
          </div>

          <div className="form-group">
            <label>Teléfono / Móvil <span className="required">*</span></label>
            <input type="text" id="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej: 300 123 4567" required />
          </div>

          <div className="form-group">
            <label>Dirección física <span className="required">*</span></label>
            <input type="text" id="direccion" value={formData.direccion} onChange={handleChange} placeholder="Calle 10 # 20 - 30" required />
          </div>

          <div className="form-group">
            <label>País <span className="required">*</span></label>
            <input type="text" id="pais" value={formData.pais} onChange={handleChange} placeholder="Ej: Colombia" required />
          </div>

          <div className="form-group">
            <label>Departamento / Estado <span className="required">*</span></label>
            <input type="text" id="departamento" value={formData.departamento} onChange={handleChange} placeholder="Ej: Antioquia" required />
          </div>

          <div className="form-group">
            <label>Ciudad <span className="required">*</span></label>
            <input type="text" id="ciudad" value={formData.ciudad} onChange={handleChange} placeholder="Ej: Medellín" required />
          </div>

          <div className="form-group">
            <label>Tipo de proveedor <span className="required">*</span></label>
            <select id="tipo_proveedor" value={formData.tipo_proveedor} onChange={handleChange} required>
              <option value="">Seleccione...</option>
              <option value="Bienes">Bienes (Productos)</option>
              <option value="Servicios">Servicios</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>

          <div className="form-group">
            <label>Estado <span className="required">*</span></label>
            <select id="estado" value={formData.estado} onChange={handleChange} required>
              <option value="Activo">🟢 Activo</option>
              <option value="Inactivo">🔴 Inactivo</option>
            </select>
          </div>

          <div className="form-group full">
            <label>Observaciones adicionales</label>
            <textarea id="observaciones" rows="3" value={formData.observaciones} onChange={handleChange} placeholder="Información extra sobre pagos, entregas, etc."></textarea>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancelar-proveedor" onClick={handleCancelar}>
              Cancelar
            </button>
            <button type="submit" className="btn-guardar-proveedor" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}