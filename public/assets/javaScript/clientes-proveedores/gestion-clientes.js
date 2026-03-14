(function () {
    if (!document.getElementById("formCliente")) return;

    // =========================================================
    // CONFIGURACIÓN
    // =========================================================
    const API_URL = 'http://127.0.0.1:8000/api';
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    let tiposDocumento   = [];
    let todosLosClientes = [];

    // =========================================================
    // REFERENCIAS AL DOM
    // =========================================================
    const selectTipo          = document.getElementById('clienteTipo');
    const selectCategoria     = document.getElementById('clienteCategoria');
    const selectTipoDoc       = document.getElementById('clienteTipoDocumento');
    const selectEstadoCliente = document.getElementById('clienteEstadoCliente');
    const inputId             = document.getElementById('clienteId');
    const inputDocumento      = document.getElementById('clienteDocumento');
    const inputEmail          = document.getElementById('clienteEmail');
    const inputTelefono       = document.getElementById('clienteTelefono');
    const inputTelefono2      = document.getElementById('clienteTelefono2');
    const inputDireccion      = document.getElementById('clienteDireccion');
    const inputCiudad         = document.getElementById('clienteCiudad');
    const inputDepartamento   = document.getElementById('clienteDepartamento');
    const inputPais           = document.getElementById('clientePais');
    const inputCodigoPostal   = document.getElementById('clienteCodigoPostal');
    const inputNotas          = document.getElementById('clienteNotas');

    // Persona Natural
    const inputNombres    = document.getElementById('clienteNombres');
    const inputApellidos  = document.getElementById('clienteApellidos');

    // Persona Jurídica
    const inputRazonSocial     = document.getElementById('clienteRazonSocial');
    const inputNombreComercial = document.getElementById('clienteNombreComercial');

    // Secciones condicionales
    const camposNatural  = document.getElementById('campos-natural');
    const camposJuridica = document.getElementById('campos-juridica');

    // Botones y badges
    const btnGuardar  = document.getElementById('btn-guardar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnExportar = document.getElementById('btn-exportar');
    const formTitle   = document.getElementById('form-title');
    const formMode    = document.getElementById('form-mode');
    const btnText     = document.getElementById('btn-text');

    // Filtros
    const inputBuscar     = document.getElementById('buscarCliente');
    const filtroTipo      = document.getElementById('filtroTipo');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroEstado    = document.getElementById('filtroEstado');

    // Modal
    const confirmModal     = document.getElementById('confirmModal');
    const confirmActionBtn = document.getElementById('confirmActionBtn');

    // =========================================================
    // MOSTRAR / OCULTAR CAMPOS SEGÚN TIPO CLIENTE
    // =========================================================
    function mostrarCamposTipoCliente() {
        const tipo = selectTipo.value;
        camposNatural.style.display  = tipo === 'natural'  ? 'block' : 'none';
        camposJuridica.style.display = tipo === 'juridica' ? 'block' : 'none';
        inputDocumento.placeholder   = tipo === 'juridica' ? 'Número de NIT' : 'Número de cédula';
    }

    // =========================================================
    // CARGAR TIPOS DE DOCUMENTO DESDE LA BD
    // =========================================================
    async function cargarTiposDocumento() {
        try {
            const response = await fetch(`${API_URL}/tipos-documento/listar/`);
            if (!response.ok) throw new Error('Error al obtener tipos de documento');
            tiposDocumento = await response.json();

            selectTipoDoc.innerHTML = '<option value="">Seleccione documento</option>';
            tiposDocumento.forEach(td => {
                const opt = document.createElement('option');
                opt.value       = td.codigo;
                opt.textContent = td.nombre;
                selectTipoDoc.appendChild(opt);
            });
        } catch (error) {
            console.error('Error al cargar tipos de documento:', error);
        }
    }

    // =========================================================
    // CARGAR Y RENDERIZAR CLIENTES
    // =========================================================
    async function cargarClientes() {
        try {
            const response = await fetch(`${API_URL}/clientes/listar/`);
            if (!response.ok) throw new Error('Error al obtener clientes');
            todosLosClientes = await response.json();
            renderizarClientes(todosLosClientes);
            actualizarEstadisticas(todosLosClientes);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
        }
    }

    function renderizarClientes(clientes) {
        const contenido = document.getElementById('contenido-clientes');
        const contador  = document.getElementById('contador-clientes');
        contador.textContent = clientes.length;

        if (clientes.length === 0) {
            contenido.innerHTML = `
                <div style="text-align:center; padding:20px; color:#666;">
                    <i class="fas fa-users" style="font-size:2rem; color:#6c757d;"></i>
                    <p>No hay clientes registrados aún.</p>
                </div>`;
            return;
        }

        contenido.innerHTML = '';
        clientes.forEach(c => {
            const nombre = c.tipo_cliente === 'natural'
                ? `${c.nombres} ${c.apellidos}`
                : c.razon_social;

            const docInfo = c.tipo_cliente === 'natural'
                ? `${c.tipo_documento_nombre || 'Documento'}: ${c.numero_documento}`
                : `NIT: ${c.numero_documento}`;

            const div = document.createElement('div');
            div.className = 'cliente-item';
            div.innerHTML = `
                <div class="cliente-info">
                    <h4>${nombre}
                        <span class="badge ${getBadgeClass(c.estado)}">${c.estado}</span>
                        <span class="badge badge-secondary">${c.categoria}</span>
                    </h4>
                    <p>${docInfo} | ${c.tipo_cliente === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}</p>
                    <div class="cliente-contacto">
                        ${c.email        ? `<div class="contacto-item"><strong>Email:</strong> ${c.email}</div>` : ''}
                        ${c.telefono     ? `<div class="contacto-item"><strong>Teléfono:</strong> ${c.telefono}</div>` : ''}
                        ${c.ciudad       ? `<div class="contacto-item"><strong>Ciudad:</strong> ${c.ciudad}</div>` : ''}
                        ${c.departamento ? `<div class="contacto-item"><strong>Dpto:</strong> ${c.departamento}</div>` : ''}
                    </div>
                    ${c.notas ? `<p style="font-size:0.85rem;color:#888;"><strong>Notas:</strong> ${c.notas}</p>` : ''}
                </div>
                <div class="cliente-actions">
                    <button class="btn-config btn-editar-cliente" data-id="${c.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-config btn-eliminar-cliente"
                        data-id="${c.id}"
                        data-nombre="${(nombre || '').replace(/"/g, '&quot;')}"
                        style="background:#dc3545; margin-left:5px;">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>`;
            contenido.appendChild(div);
        });

        // Eventos con addEventListener en lugar de onclick inline
        contenido.querySelectorAll('.btn-editar-cliente').forEach(btn => {
            btn.addEventListener('click', () => editarCliente(parseInt(btn.dataset.id)));
        });
        contenido.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
            btn.addEventListener('click', () => confirmarEliminar(parseInt(btn.dataset.id), btn.dataset.nombre));
        });
    }

    function getBadgeClass(estado) {
        return { activo: 'badge-success', inactivo: 'badge-warning', bloqueado: 'badge-danger' }[estado] || 'badge-info';
    }

    function actualizarEstadisticas(clientes) {
        document.getElementById('total-clientes').textContent        = clientes.length;
        document.getElementById('clientes-activos').textContent      = clientes.filter(c => c.estado === 'activo').length;
        document.getElementById('clientes-inactivos').textContent    = clientes.filter(c => c.estado === 'inactivo').length;
        document.getElementById('clientes-corporativos').textContent = clientes.filter(c => c.categoria === 'corporativo').length;
    }

    // =========================================================
    // GUARDAR CLIENTE (CREAR O EDITAR)
    // =========================================================
    async function guardarCliente() {
        const id           = inputId.value;
        const tipo         = selectTipo.value;
        const categoria    = selectCategoria.value;
        const documento    = inputDocumento.value.trim();
        const email        = inputEmail.value.trim();
        const telefono     = inputTelefono.value.trim();
        const telefono2    = inputTelefono2.value.trim();
        const direccion    = inputDireccion.value.trim();
        const ciudad       = inputCiudad.value.trim();
        const departamento = inputDepartamento.value.trim();
        const pais         = inputPais.value.trim();
        const codigoPostal = inputCodigoPostal.value.trim();
        const notas        = inputNotas.value.trim();
        const estado       = selectEstadoCliente.value;

        if (!tipo)      { alert('❌ Seleccione el tipo de cliente.');         return; }
        if (!documento) { alert('❌ El número de documento es obligatorio.'); return; }

        let tipoDocCodigo    = '';
        let datosEspecificos = {};

        if (tipo === 'natural') {
            const nombres   = inputNombres.value.trim();
            const apellidos = inputApellidos.value.trim();
            tipoDocCodigo   = selectTipoDoc.value;

            if (!nombres || !apellidos) { alert('❌ Nombres y apellidos son obligatorios.'); return; }
            if (!tipoDocCodigo)         { alert('❌ Seleccione el tipo de documento.');      return; }

            datosEspecificos = { nombres, apellidos };

        } else {
            const razon_social     = inputRazonSocial.value.trim();
            const nombre_comercial = inputNombreComercial.value.trim();
            tipoDocCodigo          = 'NIT';

            if (!razon_social) { alert('❌ La razón social es obligatoria.'); return; }
            datosEspecificos = { razon_social, nombre_comercial };
        }

        const tipoDoc = tiposDocumento.find(t => t.codigo === tipoDocCodigo);
        if (!tipoDoc) { alert('❌ Tipo de documento no válido. Verifique la configuración.'); return; }

        const body = {
            tipo_cliente:      tipo,
            categoria,
            tipo_documento_id: tipoDoc.id,
            numero_documento:  documento,
            email, telefono, telefono2,
            direccion, ciudad, departamento,
            pais, codigo_postal: codigoPostal,
            notas, estado,
            creado_por_id: currentUser.id,
            ...datosEspecificos
        };

        const endpoint = id
            ? `${API_URL}/clientes/editar/${id}/`
            : `${API_URL}/clientes/crear/`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();

            if (!response.ok) {
                alert('❌ ' + (data.error || JSON.stringify(data)));
                return;
            }

            alert(`✅ Cliente ${id ? 'actualizado' : 'creado'} correctamente.`);
            resetearFormulario();
            cargarClientes();

        } catch (error) {
            alert('No se pudo conectar con el servidor.');
            console.error(error);
        }
    }

    // =========================================================
    // EDITAR CLIENTE
    // =========================================================
    function editarCliente(id) {
        const c = todosLosClientes.find(x => x.id === id);
        if (!c) { alert('Cliente no encontrado.'); return; }

        inputId.value             = c.id;
        selectTipo.value          = c.tipo_cliente;
        selectCategoria.value     = c.categoria;
        inputDocumento.value      = c.numero_documento;
        inputEmail.value          = c.email || '';
        inputTelefono.value       = c.telefono || '';
        inputTelefono2.value      = c.telefono2 || '';
        inputDireccion.value      = c.direccion || '';
        inputCiudad.value         = c.ciudad || '';
        inputDepartamento.value   = c.departamento || '';
        inputPais.value           = c.pais || 'Colombia';
        inputCodigoPostal.value   = c.codigo_postal || '';
        inputNotas.value          = c.notas || '';
        selectEstadoCliente.value = c.estado;

        mostrarCamposTipoCliente(); // Primero mostrar sección correcta

        if (c.tipo_cliente === 'natural') {
            inputNombres.value         = c.nombres || '';
            inputApellidos.value       = c.apellidos || '';
            selectTipoDoc.value        = c.tipo_documento_codigo || '';
        } else {
            inputRazonSocial.value     = c.razon_social || '';
            inputNombreComercial.value = c.nombre_comercial || '';
        }

        formTitle.textContent         = 'Editar Cliente';
        formMode.textContent          = 'EDITAR';
        formMode.className            = 'badge badge-warning';
        btnText.textContent           = 'Actualizar Cliente';
        btnCancelar.style.display     = 'inline-block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =========================================================
    // ELIMINAR CLIENTE
    // =========================================================
    function confirmarEliminar(id, nombre) {
        document.getElementById('modalTitle').textContent   = 'Eliminar Cliente';
        document.getElementById('modalMessage').textContent = `¿Estás seguro de eliminar al cliente "${nombre}"?`;
        confirmActionBtn.onclick = () => eliminarCliente(id);
        confirmModal.style.display = 'flex';
    }

    async function eliminarCliente(id) {
        try {
            const response = await fetch(`${API_URL}/clientes/eliminar/${id}/`, {
                method:  'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) { alert('❌ ' + data.error); return; }

            alert('✅ Cliente eliminado correctamente.');
            cerrarModal();
            cargarClientes();

        } catch (error) {
            alert('No se pudo conectar con el servidor.');
            console.error(error);
        }
    }

    function cerrarModal() {
        confirmModal.style.display = 'none';
    }

    // =========================================================
    // FILTROS
    // =========================================================
    function filtrarClientes(filtroEspecifico = null) {
        const busqueda  = inputBuscar.value.toLowerCase();
        const tipo      = filtroEspecifico === 'todos' ? ''
                        : (filtroEspecifico === 'natural' || filtroEspecifico === 'juridica')
                            ? filtroEspecifico
                            : filtroTipo.value;
        const categoria = filtroEspecifico === 'corporativo' ? 'corporativo' : filtroCategoria.value;
        const estado    = (filtroEspecifico === 'activo' || filtroEspecifico === 'inactivo')
                        ? filtroEspecifico
                        : filtroEstado.value;

        const filtrados = todosLosClientes.filter(c => {
            const nombre = c.tipo_cliente === 'natural'
                ? `${c.nombres} ${c.apellidos}`
                : c.razon_social || '';
            const coincideBusqueda  = !busqueda  || nombre.toLowerCase().includes(busqueda)
                                                 || c.numero_documento.includes(busqueda)
                                                 || (c.email && c.email.toLowerCase().includes(busqueda));
            const coincideTipo      = !tipo      || c.tipo_cliente === tipo;
            const coincideCategoria = !categoria || c.categoria === categoria;
            const coincideEstado    = !estado    || c.estado === estado;
            return coincideBusqueda && coincideTipo && coincideCategoria && coincideEstado;
        });

        renderizarClientes(filtrados);
    }

    // =========================================================
    // EXPORTAR A CSV
    // =========================================================
    function exportarClientes() {
        if (todosLosClientes.length === 0) { alert('No hay clientes para exportar.'); return; }

        const headers = ['ID','Tipo','Categoría','Documento','Número Doc','Nombres','Apellidos',
                         'Razón Social','Email','Teléfono','Ciudad','Departamento','País','Estado'];

        const filas = todosLosClientes.map(c => [
            c.id, c.tipo_cliente, c.categoria,
            c.tipo_documento_nombre || '', c.numero_documento,
            c.nombres || '', c.apellidos || '', c.razon_social || '',
            c.email || '', c.telefono || '',
            c.ciudad || '', c.departamento || '', c.pais || '', c.estado
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

        const csv  = [headers.join(','), ...filas].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // =========================================================
    // RESETEAR FORMULARIO
    // =========================================================
    function resetearFormulario() {
        document.getElementById('formCliente').reset();
        inputId.value            = '';
        inputPais.value          = 'Colombia';
        camposNatural.style.display  = 'none';
        camposJuridica.style.display = 'none';
        formTitle.textContent    = 'Nuevo Cliente';
        formMode.textContent     = 'CREAR';
        formMode.className       = 'badge badge-info';
        btnText.textContent      = 'Crear Cliente';
        btnCancelar.style.display = 'none';
    }

    // =========================================================
    // EVENT LISTENERS — sin onclick inline en el HTML
    // =========================================================
    selectTipo.addEventListener('change', mostrarCamposTipoCliente);

    btnGuardar.addEventListener('click', guardarCliente);
    btnCancelar.addEventListener('click', resetearFormulario);
    btnExportar.addEventListener('click', exportarClientes);

    inputBuscar.addEventListener('keyup',   () => filtrarClientes());
    filtroTipo.addEventListener('change',   () => filtrarClientes());
    filtroCategoria.addEventListener('change', () => filtrarClientes());
    filtroEstado.addEventListener('change', () => filtrarClientes());

    // Tarjetas de estadísticas
    document.getElementById('total-clientes').closest('.stat-card')
        .addEventListener('click', () => filtrarClientes('todos'));
    document.getElementById('clientes-activos').closest('.stat-card')
        .addEventListener('click', () => filtrarClientes('activo'));
    document.getElementById('clientes-inactivos').closest('.stat-card')
        .addEventListener('click', () => filtrarClientes('inactivo'));
    document.getElementById('clientes-corporativos').closest('.stat-card')
        .addEventListener('click', () => filtrarClientes('corporativo'));

    // Modal cancelar
    document.querySelector('#confirmModal .btn-config:not(.btn-danger)')
        .addEventListener('click', cerrarModal);

    // =========================================================
    // INICIALIZAR
    // =========================================================
    async function initClientes() {
        await cargarTiposDocumento();
        await cargarClientes();
    }

    initClientes();
    console.log('Módulo de clientes cargado — conectado a PostgreSQL');

})();