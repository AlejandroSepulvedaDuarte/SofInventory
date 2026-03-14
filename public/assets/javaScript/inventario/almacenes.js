(function () {
    // =========================================================
    // MÓDULO DE ALMACENES — conectado a PostgreSQL via Django
    // =========================================================
    const API_URL       = 'http://127.0.0.1:8000/api';
    const API_ALMACENES = `${API_URL}/inventario/almacenes`;
    const currentUser   = JSON.parse(sessionStorage.getItem('currentUser'));

    console.log('🚀 Módulo de almacenes iniciando...');

    // =========================================================
    // CARGAR LISTA
    // =========================================================
    async function cargarListaAlmacenes() {
        const contenido = document.getElementById('contenido-almacenes');
        const contador  = document.getElementById('contador-almacenes');

        if (!contenido || !contador) {
            console.warn('⚠️ DOM de almacenes no disponible aún');
            return;
        }

        try {
            const res       = await fetch(`${API_ALMACENES}/listar/`);
            const almacenes = await res.json();

            // Verificar que el contenedor sigue en el DOM
            // (el usuario pudo haber navegado mientras cargaba)
            if (!document.getElementById('contenido-almacenes')) return;

            contador.textContent = almacenes.length;

            if (almacenes.length === 0) {
                contenido.innerHTML = `
                    <div style="text-align:center; padding:20px; color:#666;">
                        <i class="fas fa-warehouse" style="font-size:2rem; color:#6c757d; margin-bottom:10px;"></i>
                        <p>No hay almacenes registrados aún.</p>
                        <p style="font-size:0.9rem; margin-top:10px;">Crea tu primer almacén usando el formulario superior.</p>
                    </div>`;
                return;
            }

            contenido.innerHTML = '';
            almacenes.forEach(almacen => {
                const div = document.createElement('div');
                div.className = 'almacen-item';
                div.innerHTML = `
                    <div class="almacen-info">
                        <h4>${almacen.nombre}
                            <span class="badge ${getBadgeClass(almacen.estado)}">${almacen.estado}</span>
                        </h4>
                        <p><strong>Código:</strong> ${almacen.codigo} |
                           <strong>Responsable:</strong> ${almacen.responsable || 'No asignado'}</p>
                        <p>${almacen.direccion || 'Sin dirección registrada'}</p>
                        <div class="almacen-stats">
                            <div class="stat"><strong>${almacen.total_productos}</strong> productos</div>
                            <div class="stat"><strong>${almacen.total_stock}</strong> unidades en stock</div>
                            ${almacen.capacidad
                                ? `<div class="stat"><strong>${almacen.porcentaje_uso}%</strong> de capacidad</div>`
                                : ''}
                        </div>
                    </div>
                    <div class="almacen-actions">
                        <button class="btn-config" onclick="editarAlmacen(${almacen.id})"
                            style="background-color:#262B50;">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-config btn-danger"
                            onclick="confirmarEliminarAlmacen(${almacen.id}, '${almacen.nombre}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>`;
                contenido.appendChild(div);
            });

        } catch (error) {
            console.error('❌ Error cargando almacenes:', error);
            const contenidoActual = document.getElementById('contenido-almacenes');
            if (contenidoActual) {
                contenidoActual.innerHTML = `
                    <div style="text-align:center; padding:20px; color:#dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i>
                        <p>Error al cargar los almacenes. Revisa la consola.</p>
                    </div>`;
            }
        }
    }

    // =========================================================
    // GUARDAR (CREAR / EDITAR)
    // =========================================================
    async function guardarAlmacen() {
        const almacenId   = document.getElementById('almacenId').value;
        const nombre      = document.getElementById('almacenNombre').value.trim();
        const codigo      = document.getElementById('almacenCodigo').value.trim().toUpperCase();
        const direccion   = document.getElementById('almacenDireccion').value.trim();
        const responsable = document.getElementById('almacenResponsable').value.trim();
        const telefono    = document.getElementById('almacenTelefono').value.trim();
        const capacidad   = document.getElementById('almacenCapacidad').value || null;
        const estado      = document.getElementById('almacenEstado').value;
        const notas       = document.getElementById('almacenNotas').value.trim();

        if (!nombre) { alert('❌ El nombre del almacén es obligatorio'); return; }
        if (!codigo) { alert('❌ El código del almacén es obligatorio'); return; }
        if (codigo.length < 2 || codigo.length > 10) {
            alert('❌ El código debe tener entre 2 y 10 caracteres'); return;
        }

        const payload = {
            nombre, codigo, direccion, responsable,
            telefono, capacidad, estado, notas,
            usuario_id: currentUser ? currentUser.id : null
        };

        const esEdicion = almacenId !== '';
        const url       = esEdicion
            ? `${API_ALMACENES}/editar/${almacenId}/`
            : `${API_ALMACENES}/crear/`;
        const method    = esEdicion ? 'PUT' : 'POST';

        try {
            const res  = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                const errores = Object.values(data).flat().join('\n');
                alert(`❌ ${errores}`);
                return;
            }

            alert(`✅ Almacén ${esEdicion ? 'actualizado' : 'creado'} correctamente`);
            resetearFormulario();
            cargarListaAlmacenes();

        } catch (error) {
            console.error('❌ Error guardando almacén:', error);
            alert('❌ No se pudo conectar con el servidor.');
        }
    }

    // =========================================================
    // EDITAR
    // =========================================================
    async function editarAlmacen(almacenId) {
        try {
            const res     = await fetch(`${API_ALMACENES}/detalle/${almacenId}/`);
            const almacen = await res.json();

            document.getElementById('almacenId').value          = almacen.id;
            document.getElementById('almacenNombre').value      = almacen.nombre;
            document.getElementById('almacenCodigo').value      = almacen.codigo;
            document.getElementById('almacenDireccion').value   = almacen.direccion   || '';
            document.getElementById('almacenResponsable').value = almacen.responsable || '';
            document.getElementById('almacenTelefono').value    = almacen.telefono    || '';
            document.getElementById('almacenCapacidad').value   = almacen.capacidad   || '';
            document.getElementById('almacenEstado').value      = almacen.estado;
            document.getElementById('almacenNotas').value       = almacen.notas       || '';

            document.getElementById('form-title').textContent = 'Editar Almacén';
            document.getElementById('form-mode').textContent  = 'EDITAR';
            document.getElementById('form-mode').className    = 'badge badge-warning';
            document.getElementById('btn-text').textContent   = 'Actualizar Almacén';

        } catch (error) {
            console.error('❌ Error cargando almacén:', error);
            alert('❌ No se pudo conectar con el servidor.');
        }
    }

    // =========================================================
    // ELIMINAR
    // =========================================================
    function confirmarEliminarAlmacen(almacenId, nombre) {
        document.getElementById('modalTitle').textContent     = 'Eliminar Almacén';
        document.getElementById('modalMessage').textContent   = `¿Estás seguro de que quieres eliminar el almacén "${nombre}"?`;
        document.getElementById('confirmActionBtn').onclick   = function () { eliminarAlmacen(almacenId); };
        document.getElementById('confirmModal').style.display = 'flex';
    }

    async function eliminarAlmacen(almacenId) {
        try {
            const res = await fetch(`${API_ALMACENES}/eliminar/${almacenId}/`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                const data = await res.json();
                alert(`❌ ${data.error}`);
                return;
            }

            cerrarModal();
            alert('✅ Almacén eliminado correctamente');
            cargarListaAlmacenes();

        } catch (error) {
            console.error('❌ Error eliminando almacén:', error);
            alert('❌ No se pudo conectar con el servidor.');
        }
    }

    // =========================================================
    // AUXILIARES
    // =========================================================
    function getBadgeClass(estado) {
        switch (estado) {
            case 'activo':        return 'badge-success';
            case 'inactivo':      return 'badge-danger';
            case 'mantenimiento': return 'badge-warning';
            default:              return 'badge-info';
        }
    }

    function resetearFormulario() {
        document.getElementById('formAlmacen').reset();
        document.getElementById('almacenId').value        = '';
        document.getElementById('form-title').textContent = 'Nuevo Almacén';
        document.getElementById('form-mode').textContent  = 'CREAR';
        document.getElementById('form-mode').className    = 'badge badge-info';
        document.getElementById('btn-text').textContent   = 'Crear Almacén';
    }

    function cerrarModal() {
        document.getElementById('confirmModal').style.display = 'none';
    }

    // =========================================================
    // EXPONER FUNCIONES GLOBALES
    // =========================================================
    window.guardarAlmacen           = guardarAlmacen;
    window.editarAlmacen            = editarAlmacen;
    window.confirmarEliminarAlmacen = confirmarEliminarAlmacen;
    window.eliminarAlmacen          = eliminarAlmacen;
    window.cancelarAccion           = function () { cerrarModal(); };
    window.cargarListaAlmacenes     = cargarListaAlmacenes;

    // =========================================================
    // INICIALIZACIÓN ROBUSTA
    // Espera a que el elemento contenido-almacenes esté en el DOM
    // antes de intentar cargar la lista — evita el problema de
    // que el fetch termine después de que el router reemplazó el HTML
    // =========================================================
    function init() {
        if (document.getElementById('contenido-almacenes')) {
            cargarListaAlmacenes();
        } else {
            setTimeout(init, 50);
        }
    }

    init();

    console.log('✅ Módulo de almacenes cargado — conectado a PostgreSQL');

})();