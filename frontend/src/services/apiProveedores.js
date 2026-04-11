const API_URL = 'http://127.0.0.1:8000/api';

// ==========================================================
// PROVEEDORES
// ==========================================================

export const listarProveedores = async () => {
  const res = await fetch(`${API_URL}/proveedores/listar/`);
  return res.json();
};

export const crearProveedor = async (datos) => {
  const res = await fetch(`${API_URL}/proveedores/crear/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return res.json();
};

export const editarProveedor = async (id, datos) => {
  const res = await fetch(`${API_URL}/proveedores/editar/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
  return res.json();
};

export const eliminarProveedor = async (id) => {
  const res = await fetch(`${API_URL}/proveedores/eliminar/${id}/`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
};

export const cambiarEstadoProveedor = async (id) => {
  const res = await fetch(`${API_URL}/proveedores/estado/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
};

// Tipos de documento (reutilizado)
export const listarTiposDocumento = async () => {
  const res = await fetch(`${API_URL}/tipos-documento/listar/`);
  return res.json();
};