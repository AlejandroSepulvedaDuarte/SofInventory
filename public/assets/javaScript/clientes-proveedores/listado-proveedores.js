// =========================================================
// CONFIGURACIÓN
// =========================================================
const API_URL_PROV = 'http://127.0.0.1:8000/api';

// =========================================================
// ELEMENTOS DEL DOM
// =========================================================
const tablaProveedores = document.querySelector("#tablaProveedores tbody");
const modal            = document.getElementById("modalEditar");

// =========================================================
// CARGAR TIPOS DOCUMENTO EN MODAL
// =========================================================
async function cargarTiposDocumentoModal() {
    try {
        const response = await fetch(`${API_URL_PROV}/tipos-documento/listar/`);
        const tipos = await response.json();

        const select = document.getElementById("editTipoDoc");
        select.innerHTML = '';
        tipos.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.nombre;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Error al cargar tipos de documento:', error);
    }
}

// =========================================================
// CARGAR Y RENDERIZAR PROVEEDORES
// =========================================================
async function cargarProveedores() {
    try {
        const response = await fetch(`${API_URL_PROV}/proveedores/listar/`);
        const proveedores = await response.json();

        tablaProveedores.innerHTML = '';

        if (proveedores.length === 0) {
            tablaProveedores.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding:20px; color:#666;">
                        No hay proveedores registrados.
                    </td>
                </tr>`;
            return;
        }

        proveedores.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="Tipo Doc.">${p.tipo_documento_nombre}</td>
                <td data-label="N° Documento">${p.numero_documento}</td>
                <td data-label="Razón Social">${p.razon_social}</td>
                <td data-label="Contacto">
                    ${p.nombre_contacto}<br>
                    <small style="color:#888">${p.cargo_contacto || ''}</small>
                </td>
                <td data-label="Email">${p.email}</td>
                <td data-label="Teléfono">${p.telefono}</td>
                <td data-label="Tipo Proveedor">${p.tipo_proveedor}</td>
                <td data-label="Estado" class="${p.estado === 'Activo' ? 'estado-activo' : 'estado-inactivo'}">
                    ${p.estado}
                </td>
                <td data-label="Acciones" class="acciones">
                    <button class="btn btn-edit" onclick="editarProveedor(${p.id})">Editar</button>
                    <button class="btn btn-status" onclick="cambiarEstadoProveedor(${p.id})">
                        ${p.estado === 'Activo' ? 'Inactivar' : 'Activar'}
                    </button>
                    <button class="btn btn-delete" onclick="eliminarProveedor(${p.id})">Eliminar</button>
                </td>`;
            tablaProveedores.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al cargar proveedores:', error);
        tablaProveedores.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color:red;">
                    Error al conectar con el servidor.
                </td>
            </tr>`;
    }
}

// =========================================================
// ABRIR MODAL EDITAR
// =========================================================
window.editarProveedor = async function (id) {
    try {
        await cargarTiposDocumentoModal();

        const response = await fetch(`${API_URL_PROV}/proveedores/listar/`);
        const proveedores = await response.json();
        const p = proveedores.find(x => x.id === id);

        if (!p) return alert("Error al cargar proveedor.");

        document.getElementById("editId").value              = p.id;
        document.getElementById("editTipoDoc").value         = p.tipo_documento;
        document.getElementById("editNumDoc").value          = p.numero_documento;
        document.getElementById("editRazon").value           = p.razon_social;
        document.getElementById("editNombreContacto").value  = p.nombre_contacto;
        document.getElementById("editCargoContacto").value   = p.cargo_contacto || '';
        document.getElementById("editEmail").value           = p.email;
        document.getElementById("editTelefono").value        = p.telefono;
        document.getElementById("editDireccion").value       = p.direccion;
        document.getElementById("editPais").value            = p.pais;
        document.getElementById("editDepartamento").value    = p.departamento;
        document.getElementById("editCiudad").value          = p.ciudad;
        document.getElementById("editTipoProveedor").value   = p.tipo_proveedor;
        document.getElementById("editEstado").value          = p.estado;
        document.getElementById("editObservaciones").value   = p.observaciones || '';

        modal.style.display = "flex";

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
};

// =========================================================
// CERRAR MODAL
// =========================================================
window.cerrarModalProveedor = function () {
    modal.style.display = "none";
};

// =========================================================
// GUARDAR CAMBIOS
// =========================================================
document.getElementById("formEditarProveedor").addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = parseInt(document.getElementById("editId").value);

    const datosActualizados = {
        tipo_documento:   parseInt(document.getElementById("editTipoDoc").value),
        numero_documento: document.getElementById("editNumDoc").value.trim(),
        razon_social:     document.getElementById("editRazon").value.trim(),
        nombre_contacto:  document.getElementById("editNombreContacto").value.trim(),
        cargo_contacto:   document.getElementById("editCargoContacto").value.trim(),
        email:            document.getElementById("editEmail").value.trim(),
        telefono:         document.getElementById("editTelefono").value.trim(),
        direccion:        document.getElementById("editDireccion").value.trim(),
        pais:             document.getElementById("editPais").value.trim(),
        departamento:     document.getElementById("editDepartamento").value.trim(),
        ciudad:           document.getElementById("editCiudad").value.trim(),
        tipo_proveedor:   document.getElementById("editTipoProveedor").value,
        estado:           document.getElementById("editEstado").value,
        observaciones:    document.getElementById("editObservaciones").value.trim(),
    };

    try {
        const response = await fetch(`${API_URL_PROV}/proveedores/editar/${id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al actualizar: ' + JSON.stringify(data));
            return;
        }

        alert('✅ Proveedor actualizado correctamente.');
        cerrarModalProveedor();
        cargarProveedores();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
});

// =========================================================
// CAMBIAR ESTADO
// =========================================================
window.cambiarEstadoProveedor = async function (id) {
    try {
        const response = await fetch(`${API_URL_PROV}/proveedores/estado/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al cambiar estado: ' + data.error);
            return;
        }

        cargarProveedores();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
};

// =========================================================
// ELIMINAR
// =========================================================
window.eliminarProveedor = async function (id) {
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;

    try {
        const response = await fetch(`${API_URL_PROV}/proveedores/eliminar/${id}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al eliminar: ' + data.error);
            return;
        }

        alert('✅ Proveedor eliminado correctamente.');
        cargarProveedores();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
};

// =========================================================
// BUSCADOR
// =========================================================
document.getElementById("buscarProveedor").addEventListener("input", function () {
    const filtro = this.value.toLowerCase();
    const filas = tablaProveedores.getElementsByTagName("tr");
    Array.from(filas).forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(filtro) ? "" : "none";
    });
});

// =========================================================
// INICIALIZACIÓN
// =========================================================
cargarProveedores();
console.log('Módulo listado de proveedores cargado — conectado a PostgreSQL');
