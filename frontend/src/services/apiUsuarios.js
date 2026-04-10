const API_URL = 'http://127.0.0.1:8000/api';

// Usuarios
export const listarUsuarios = async () => {
  const res = await fetch(`${API_URL}/usuarios/listar/`);
  return res.json();
};

export const crearUsuario = async (datos) => {
  const res = await fetch(`${API_URL}/usuarios/crear/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return res.json();
};

export const editarUsuario = async (id, datos) => {
  const res = await fetch(`${API_URL}/usuarios/editar/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return res.json();
};

export const eliminarUsuario = async (id) => {
  const res = await fetch(`${API_URL}/usuarios/eliminar/${id}/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
};

export const cambiarEstadoUsuario = async (id) => {
  const res = await fetch(`${API_URL}/usuarios/estado/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
};

// Roles y tipos
export const listarRoles = async () => {
  const res = await fetch(`${API_URL}/roles/listar/`);
  return res.json();
};

export const listarTiposDocumento = async () => {
  const res = await fetch(`${API_URL}/tipos-documento/listar/`);
  return res.json();
};

export const reporteRoles = async () => {
  const res = await fetch(`${API_URL}/roles/reporte/`);
  return res.json();
};