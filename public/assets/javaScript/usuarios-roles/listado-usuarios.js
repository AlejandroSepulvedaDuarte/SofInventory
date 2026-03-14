// ==========================================================
// CONFIGURACIÓN
// ==========================================================
const API_URL = 'http://127.0.0.1:8000/api';

// ==========================================================
// VERIFICAR ACCESO — solo Administrador
// ==========================================================

const currentUserListado = JSON.parse(sessionStorage.getItem("currentUser"));
if (!currentUserListado || currentUserListado.rol !== "Administrador") {
    alert("Acceso denegado. Solo administradores pueden ver esta página.");
    window.location.href = "index.html";
}

// ==========================================================
// ELEMENTOS DEL DOM
// ==========================================================
const tabla = document.querySelector("#tablaUsuarios tbody");
const buscarInput = document.getElementById("buscar");

// ==========================================================
// CARGAR USUARIOS DESDE LA API
// ==========================================================
async function cargarUsuarios() {
    try {
        const response = await fetch(`${API_URL}/usuarios/listar/`);
        const usuarios = await response.json();

        tabla.innerHTML = "";

        if (usuarios.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6" style="text-align:center">No hay usuarios registrados.</td></tr>`;
            return;
        }

        usuarios.forEach(u => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td data-label="Usuario">${u.username}</td>
                <td data-label="Nombre">${u.nombre_completo}</td>
                <td data-label="Correo">${u.email}</td>
                <td data-label="Rol">${u.rol_nombre}</td>
                <td data-label="Estado">
                    <span class="badge ${u.estado === 'activo' ? 'badge-activo' : 'badge-inactivo'}">
                        ${u.estado}
                    </span>
                </td>
                <td data-label="Acciones">
                    <div class="acciones-movil">
                        <button onclick="abrirModalEditar(${u.id})" class="btn-editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-delete" onclick="eliminarUsuario(${u.id})">
                            <i class="fas fa-trash-alt"></i> Eliminar
                        </button>
                        <button class="btn btn-status" onclick="cambiarEstado(${u.id})">
                            ${u.estado === "activo"
                                ? '<i class="fas fa-ban"></i> Inactivar'
                                : '<i class="fas fa-check"></i> Activar'}
                        </button>
                    </div>
                </td>
            `;
            tabla.appendChild(fila);
        });

    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        tabla.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red">Error al conectar con el servidor.</td></tr>`;
    }
}

// ==========================================================
// BUSCADOR
// ==========================================================
buscarInput.addEventListener("input", function () {
    const filtro = this.value.toLowerCase();
    const filas = tabla.querySelectorAll("tr");
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(filtro) ? "" : "none";
    });
});

// ==========================================================
// ELIMINAR USUARIO
// ==========================================================
async function eliminarUsuario(id) {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

    try {
        const response = await fetch(`${API_URL}/usuarios/eliminar/${id}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al eliminar: ' + data.error);
            return;
        }

        alert('✅ Usuario eliminado correctamente.');
        cargarUsuarios();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
}

// ==========================================================
// CAMBIAR ESTADO
// ==========================================================
async function cambiarEstado(id) {
    try {
        const response = await fetch(`${API_URL}/usuarios/estado/${id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al cambiar estado: ' + data.error);
            return;
        }

        cargarUsuarios();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
}

// ==========================================================
// ABRIR MODAL EDITAR
// ==========================================================
async function abrirModalEditar(id) {
    try {
        // Cargar datos del usuario
        const [resUsuarios, resRoles, resTipos] = await Promise.all([
            fetch(`${API_URL}/usuarios/listar/`),
            fetch(`${API_URL}/roles/listar/`),
            fetch(`${API_URL}/tipos-documento/listar/`)
        ]);

        const usuarios = await resUsuarios.json();
        const roles = await resRoles.json();
        const tipos = await resTipos.json();

        const u = usuarios.find(x => x.id === id);
        if (!u) return alert("Error al cargar usuario.");

        // Llenar campos
        document.getElementById("editarId").value = u.id;
        document.getElementById("editarNombre").value = u.nombre_completo;
        document.getElementById("editarDocumento").value = u.numero_documento;
        document.getElementById("editarEmail").value = u.email;
        document.getElementById("editarUsername").value = u.username;
        document.getElementById("editarObservaciones").value = u.observaciones || '';

        // Cargar tipos de documento
        const selectTipo = document.getElementById("editarTipoDocumento");
        selectTipo.innerHTML = "";
        tipos.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.nombre;
            if (t.id === u.tipo_documento) opt.selected = true;
            selectTipo.appendChild(opt);
        });

        // Cargar roles
        const selectRol = document.getElementById("editarRol");
        selectRol.innerHTML = "";
        roles.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r.id;
            opt.textContent = r.nombre;
            if (r.id === u.rol) opt.selected = true;
            selectRol.appendChild(opt);
        });

        // Mostrar modal
        document.getElementById("modalEditarUsuario").style.display = "flex";

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
}

// ==========================================================
// CERRAR MODAL
// ==========================================================
function cerrarModalEditar() {
    document.getElementById("modalEditarUsuario").style.display = "none";
}

// ==========================================================
// GUARDAR CAMBIOS — editar usuario
// ==========================================================
document.getElementById("formEditarUsuario").addEventListener("submit", async function (e) {
    e.preventDefault();

    const id = parseInt(document.getElementById("editarId").value);

    const datosActualizados = {
        nombre_completo:  document.getElementById("editarNombre").value.trim(),
        tipo_documento:   parseInt(document.getElementById("editarTipoDocumento").value),
        numero_documento: document.getElementById("editarDocumento").value.trim(),
        email:            document.getElementById("editarEmail").value.trim(),
        username:         document.getElementById("editarUsername").value.trim(),
        rol:              parseInt(document.getElementById("editarRol").value),
        observaciones:    document.getElementById("editarObservaciones").value.trim(),
    };

    try {
        const response = await fetch(`${API_URL}/usuarios/editar/${id}/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al actualizar: ' + JSON.stringify(data));
            return;
        }

        alert('✅ Usuario actualizado correctamente.');
        cerrarModalEditar();
        cargarUsuarios();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
});

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
cargarUsuarios();