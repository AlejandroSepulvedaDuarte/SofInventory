(function () {
    // =========================================================
    // CONFIGURACIÓN
    // =========================================================
    const API_URL = 'http://127.0.0.1:8000/api';

    // =========================================================
    // USUARIO EN SESIÓN
    // =========================================================
    const currentUserProv = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUserProv) {
        alert('Sesión expirada. Por favor inicie sesión.');
        window.location.href = '/index.html';
    }

    // =========================================================
    // ELEMENTOS DEL FORMULARIO
    // =========================================================
    const form = document.getElementById("formProveedores");

    // =========================================================
    // CARGAR TIPOS DE DOCUMENTO DESDE LA API
    // =========================================================
    async function cargarTiposDocumento() {
        try {
            const response = await fetch(`${API_URL}/tipos-documento/listar/`);
            const tipos = await response.json();

            const select = document.getElementById("tipoDocumento");
            select.innerHTML = '<option value="">Seleccione...</option>';
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
    // VALIDACIONES
    // =========================================================
    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validarTelefono(tel) {
        return /^[0-9\s\-\+]+$/.test(tel);
    }

    // =========================================================
    // SUBMIT
    // =========================================================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email    = document.getElementById("emailProveedor").value.trim();
        const telefono = document.getElementById("telefonoProveedor").value.trim();

        if (!validarEmail(email)) {
            alert("❌ Correo electrónico inválido.");
            return;
        }

        if (!validarTelefono(telefono)) {
            alert("❌ Teléfono inválido. Solo números, espacios, guiones y +.");
            return;
        }

        const nuevoProveedor = {
            tipo_documento:   parseInt(document.getElementById("tipoDocumento").value),
            numero_documento: document.getElementById("numeroDocumento").value.trim(),
            razon_social:     document.getElementById("razonSocial").value.trim(),
            nombre_contacto:  document.getElementById("nombreContacto").value.trim(),
            cargo_contacto:   document.getElementById("cargoContacto").value.trim(),
            email:            email,
            telefono:         telefono,
            direccion:        document.getElementById("direccionProveedor").value.trim(),
            pais:             document.getElementById("paisProveedor").value.trim(),
            departamento:     document.getElementById("departamentoProveedor").value.trim(),
            ciudad:           document.getElementById("ciudadProveedor").value.trim(),
            tipo_proveedor:   document.getElementById("tipoProveedor").value,
            estado:           document.getElementById("estadoProveedor").value,
            observaciones:    document.getElementById("observacionesProveedor").value.trim(),
            creado_por:       currentUserProv.id
        };

        try {
            const response = await fetch(`${API_URL}/proveedores/crear/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoProveedor)
            });

            const data = await response.json();

            if (!response.ok) {
                alert('Error al guardar proveedor: ' + JSON.stringify(data));
                return;
            }

            alert('✅ Proveedor guardado correctamente.');
            form.reset();
            cargarTiposDocumento();

        } catch (error) {
            alert('No se pudo conectar con el servidor.');
            console.error('Error:', error);
        }
    });

    // =========================================================
    // CANCELAR
    // =========================================================
    document.getElementById("cancelarProveedor").addEventListener("click", () => {
        if (confirm("¿Cancelar registro?")) form.reset();
    });

    // =========================================================
    // INICIALIZACIÓN
    // =========================================================
    cargarTiposDocumento();
    console.log('Módulo de proveedores cargado — conectado a PostgreSQL');

})();