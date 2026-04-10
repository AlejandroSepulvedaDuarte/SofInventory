import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { crearUsuario, listarRoles, listarTiposDocumento } from '../../services/apiUsuarios';
import './Usuarios.css';

export default function Usuarios() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [tiposDoc, setTiposDoc] = useState([]);
  
  const [formData, setFormData] = useState({
    tipo_documento: '',
    numero_documento: '',
    nombre_completo: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    rol: '',
    estado: 'activo',
    fecha_creacion: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validaciones
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passRegex = /^(?=.*[A-Za-z])(?=.*[0-9!@#$%^&*()_\-+=?¿¡.,;])[A-Za-z0-9!@#$%^&*()_\-+=?¿¡.,;]{8}$/;

  useEffect(() => {
    cargarRolesYTipos();
  }, []);

  const cargarRolesYTipos = async () => {
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
    // Limpiar error del campo
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }));
  };

  const validarCampos = () => {
    const newErrors = {};
    
    if (!formData.tipo_documento) newErrors.tipo_documento = true;
    if (!formData.numero_documento.trim()) newErrors.numero_documento = true;
    if (!formData.nombre_completo.trim()) newErrors.nombre_completo = true;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = true;
    if (!formData.username.trim() || formData.username.length < 6) newErrors.username = true;
    if (!formData.password || formData.password.length !== 8 || !passRegex.test(formData.password)) newErrors.password = true;
    if (formData.confirmPassword !== formData.password) newErrors.confirmPassword = true;
    if (!formData.rol) newErrors.rol = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verificar permisos
    if (!user || user.rol !== 'Administrador') {
      alert('Solo los administradores pueden crear usuarios.');
      return;
    }

    if (!validarCampos()) return;

    setLoading(true);
    try {
      const nuevoUsuario = {
        tipo_documento: parseInt(formData.tipo_documento),
        numero_documento: formData.numero_documento.trim(),
        nombre_completo: formData.nombre_completo.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        rol: parseInt(formData.rol),
        estado: formData.estado,
        fecha_creacion: formData.fecha_creacion,
        observaciones: formData.observaciones.trim(),
        rol_solicitante: user.rol
      };

      const result = await crearUsuario(nuevoUsuario);
      
      if (result.error) {
        alert('Error al crear usuario: ' + JSON.stringify(result));
      } else {
        alert('✅ Usuario creado exitosamente');
        // Resetear formulario
        setFormData({
          tipo_documento: '',
          numero_documento: '',
          nombre_completo: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          rol: '',
          estado: 'activo',
          fecha_creacion: new Date().toISOString().split('T')[0],
          observaciones: ''
        });
        setErrors({});
      }
    } catch (error) {
      alert('No se pudo conectar con el servidor.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-usuarios">
      <h2>Registro de Usuario</h2>
      <form id="formUsuarios" onSubmit={handleSubmit}>
        {/* Columna izquierda */}
        <div>
          <div className="form-group">
            <label htmlFor="tipo_documento">Tipo de documento *</label>
            <select
              id="tipo_documento"
              value={formData.tipo_documento}
              onChange={handleChange}
              className={errors.tipo_documento ? 'invalid' : ''}
            >
              <option value="">Seleccione su Documento</option>
              {tiposDoc.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
            <span className={`error-text ${errors.tipo_documento ? 'active' : ''}`}>
              Debe seleccionar un tipo de documento.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="numero_documento">Número de documento *</label>
            <input
              type="text"
              id="numero_documento"
              value={formData.numero_documento}
              onChange={handleChange}
              placeholder="Ingresa el Documento"
              className={errors.numero_documento ? 'invalid' : ''}
            />
            <span className={`error-text ${errors.numero_documento ? 'active' : ''}`}>
              El número de documento es obligatorio.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="nombre_completo">Nombre completo *</label>
            <input
              type="text"
              id="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              placeholder="Ej: Juan Pérez Gómez"
              className={errors.nombre_completo ? 'invalid' : ''}
            />
            <span className={`error-text ${errors.nombre_completo ? 'active' : ''}`}>
              El nombre completo es obligatorio.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico *</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ej: usuario@empresa.com"
              className={errors.email ? 'invalid' : ''}
            />
            <span className={`error-text ${errors.email ? 'active' : ''}`}>
              Ingrese un correo electrónico válido.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="username">Usuario *</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Ej: juanperez"
              minLength="6"
              className={errors.username ? 'invalid' : ''}
            />
            <span className={`error-text ${errors.username ? 'active' : ''}`}>
              El usuario debe tener al menos 6 caracteres.
            </span>
          </div>
        </div>

        {/* Columna derecha */}
        <div>
          <div className="form-group">
            <label htmlFor="password">Contraseña *</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Crea una contraseña"
                maxLength="8"
                minLength="8"
                className={errors.password ? 'invalid' : ''}
              />
              <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            <span className={`error-text ${errors.password ? 'active' : ''}`}>
              La contraseña debe tener exactamente 8 caracteres, incluyendo letras y al menos un número.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirma la contraseña"
                maxLength="8"
                minLength="8"
                className={errors.confirmPassword ? 'invalid' : ''}
              />
              <span className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </span>
            </div>
            <span className={`error-text ${errors.confirmPassword ? 'active' : ''}`}>
              Las contraseñas no coinciden.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="rol">Rol *</label>
            <select
              id="rol"
              value={formData.rol}
              onChange={handleChange}
              className={errors.rol ? 'invalid' : ''}
            >
              <option value="">Seleccione un rol</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
            <span className={`error-text ${errors.rol ? 'active' : ''}`}>
              Debe seleccionar un rol.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="estado">Estado *</label>
            <select id="estado" value={formData.estado} onChange={handleChange}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fecha_creacion">Fecha de Creación *</label>
            <input
              type="date"
              id="fecha_creacion"
              value={formData.fecha_creacion}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Campos de ancho completo */}
        <div className="form-group full-width">
          <label htmlFor="observaciones">Observaciones</label>
          <textarea
            id="observaciones"
            rows="3"
            value={formData.observaciones}
            onChange={handleChange}
            placeholder="Notas administrativas"
          ></textarea>
        </div>

        <button className="rejistrar-usuarios" type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar Usuario'}
        </button>
      </form>
    </div>
  );
}