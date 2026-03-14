(function () {
    if (!document.getElementById("formUsuarios")) return;
    // ==========================================================
    // CONFIGURACIÓN
    // ==========================================================
    const API_URL = 'http://127.0.0.1:8000/api';

    // ==========================================================
    // ELEMENTOS DEL FORMULARIO
    // ==========================================================
    const form = document.getElementById("formUsuarios");
    const rolSelect = document.getElementById("rol");
    const docType = document.getElementById("doc-type-reg");
    const docNumber = document.getElementById("doc-number-reg");
    const nombreCompleto = document.getElementById("nombreCompleto");
    const email = document.getElementById("email");
    const usuario = document.getElementById("usuario");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm-password-reg");
    const fechaCreacion = document.getElementById("fechaCreacion");

    // ==========================================================
    // ELEMENTOS DE ERROR
    // ==========================================================
    const errorDocType = document.getElementById("error-doc-type-reg");
    const errorDocNumber = document.getElementById("error-doc-number-reg");
    const errorNombre = document.getElementById("error-nombreCompleto");
    const errorEmail = document.getElementById("error-email");
    const errorUsuario = document.getElementById("error-usuario");
    const errorPassword = document.getElementById("error-password");
    const errorConfirmPassword = document.getElementById("error-confirm-password-reg");
    const errorRol = document.getElementById("error-rol");

    // Regex validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passRegex = /^(?=.*[A-Za-z])(?=.*[0-9!@#$%^&*()_\-+=?¿¡.,;])[A-Za-z0-9!@#$%^&*()_\-+=?¿¡.,;]{8}$/;

    // Fecha actual por defecto
    if (fechaCreacion) {
        fechaCreacion.value = new Date().toISOString().split('T')[0];
    }

    // ==========================================================
    // CARGAR ROLES DESDE LA API
    // ==========================================================
    async function cargarRoles() {
        try {
            const response = await fetch(`${API_URL}/roles/listar/`);
            const roles = await response.json();

            rolSelect.innerHTML = '<option value="">Seleccione un rol</option>';
            roles.forEach(r => {
                const option = document.createElement("option");
                option.value = r.id;
                option.textContent = r.nombre;
                rolSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar roles:', error);
        }
    }

    // ==========================================================
    // CARGAR TIPOS DE DOCUMENTO DESDE LA API
    // ==========================================================
    async function cargarTiposDocumento() {
        try {
            const response = await fetch(`${API_URL}/tipos-documento/listar/`);
            const tipos = await response.json();

            docType.innerHTML = '<option value="">Seleccione su Documento</option>';
            tipos.forEach(t => {
                const option = document.createElement("option");
                option.value = t.id;
                option.textContent = t.nombre;
                docType.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar tipos de documento:', error);
        }
    }

    // ==========================================================
    // VALIDACIONES
    // ==========================================================
    function validarDocType() {
        if (!docType.value) {
            errorDocType.classList.add('active');
            docType.classList.add('invalid');
            return false;
        }
        errorDocType.classList.remove('active');
        docType.classList.remove('invalid');
        return true;
    }

    function validarDocNumber() {
        if (!docNumber.value.trim()) {
            errorDocNumber.classList.add('active');
            docNumber.classList.add('invalid');
            return false;
        }
        errorDocNumber.classList.remove('active');
        docNumber.classList.remove('invalid');
        return true;
    }

    function validarNombre() {
        if (!nombreCompleto.value.trim()) {
            errorNombre.classList.add('active');
            nombreCompleto.classList.add('invalid');
            return false;
        }
        errorNombre.classList.remove('active');
        nombreCompleto.classList.remove('invalid');
        return true;
    }

    function validarEmail() {
        if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
            errorEmail.textContent = 'Ingrese un correo electrónico válido.';
            errorEmail.classList.add('active');
            email.classList.add('invalid');
            return false;
        }
        errorEmail.classList.remove('active');
        email.classList.remove('invalid');
        return true;
    }

    function validarUsuario() {
        if (!usuario.value.trim() || usuario.value.trim().length < 6) {
            errorUsuario.textContent = 'El usuario debe tener al menos 6 caracteres.';
            errorUsuario.classList.add('active');
            usuario.classList.add('invalid');
            return false;
        }
        errorUsuario.classList.remove('active');
        usuario.classList.remove('invalid');
        return true;
    }

    function validarPasswordField() {
        const v = password.value;
        if (v.length !== 8 || !passRegex.test(v)) {
            errorPassword.classList.add('active');
            password.classList.add('invalid');
            return false;
        }
        errorPassword.classList.remove('active');
        password.classList.remove('invalid');
        return true;
    }

    function validarConfirmacionField() {
        if (confirmPassword.value !== password.value || confirmPassword.value === '') {
            errorConfirmPassword.classList.add('active');
            confirmPassword.classList.add('invalid');
            return false;
        }
        errorConfirmPassword.classList.remove('active');
        confirmPassword.classList.remove('invalid');
        return true;
    }

    function validarRol() {
        if (!rolSelect.value) {
            errorRol.classList.add('active');
            rolSelect.classList.add('invalid');
            return false;
        }
        errorRol.classList.remove('active');
        rolSelect.classList.remove('invalid');
        return true;
    }

    // ==========================================================
    // TOGGLE PASSWORDS (REGISTRO)
    // ==========================================================
    function setupPasswordToggles() {

        function setupToggle(inputId, toggleId) {
            const input = document.getElementById(inputId);
            const toggle = document.getElementById(toggleId);

            if (!input || !toggle) return;

            const icon = toggle.querySelector("i");

            toggle.addEventListener("click", () => {
                const isPassword = input.type === "password";

                input.type = isPassword ? "text" : "password";

                icon.classList.toggle("fa-eye");
                icon.classList.toggle("fa-eye-slash");
            });
        }

        // Campo contraseña
        setupToggle("password", "togglePassword");

        // Campo confirmar contraseña
        setupToggle("confirm-password-reg", "toggleConfirmPassword");
    }

    // ==========================================================
    // EVENT LISTENERS DE VALIDACIÓN
    // ==========================================================
    function setupEventListeners() {
        const campos = [docType, docNumber, nombreCompleto, email, usuario, password, confirmPassword, rolSelect];
        campos.forEach(campo => {
            campo.addEventListener('blur', function () {
                if (this.value.trim() === '' || this.classList.contains('invalid')) {
                    switch (this.id) {
                        case 'doc-type-reg': validarDocType(); break;
                        case 'doc-number-reg': validarDocNumber(); break;
                        case 'nombreCompleto': validarNombre(); break;
                        case 'email': validarEmail(); break;
                        case 'usuario': validarUsuario(); break;
                        case 'password': validarPasswordField(); validarConfirmacionField(); break;
                        case 'confirm-password-reg': validarConfirmacionField(); break;
                        case 'rol': validarRol(); break;
                    }
                }
            });
        });

        password.addEventListener('input', () => {
            if (password.classList.contains('invalid')) validarPasswordField();
            if (confirmPassword.classList.contains('invalid')) validarConfirmacionField();
        });

        confirmPassword.addEventListener('input', () => {
            if (confirmPassword.classList.contains('invalid')) validarConfirmacionField();
        });
    }

    // ==========================================================
    // SUBMIT — guarda en PostgreSQL via API
    // ==========================================================
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Verificar que es Administrador
        const usuarioActual = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!usuarioActual || usuarioActual.rol !== 'Administrador') {
            alert('Solo los administradores pueden crear usuarios.');
            return;
        }

        // Validaciones
        const valido = [
            validarDocType(), validarDocNumber(), validarNombre(),
            validarEmail(), validarUsuario(), validarPasswordField(),
            validarConfirmacionField(), validarRol()
        ].every(Boolean);

        if (!valido) return;

        const nuevoUsuario = {
            tipo_documento: parseInt(docType.value),
            numero_documento: docNumber.value.trim(),
            nombre_completo: nombreCompleto.value.trim(),
            email: email.value.trim(),
            username: usuario.value.trim(),
            password: password.value,
            rol: parseInt(rolSelect.value),
            estado: document.getElementById("estado").value,
            fecha_creacion: fechaCreacion.value,
            observaciones: document.getElementById("observaciones").value.trim(),
            rol_solicitante: usuarioActual.rol  // para verificar permisos en Django
        };

        try {
            const response = await fetch(`${API_URL}/usuarios/crear/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoUsuario)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Error del servidor:', data);
                alert('Error al crear usuario: ' + JSON.stringify(data));
                return;
            }

            alert('✅ Usuario creado exitosamente');
            form.reset();
            fechaCreacion.value = new Date().toISOString().split('T')[0];

        } catch (error) {
            alert('No se pudo conectar con el servidor.');
            console.error('Error:', error);
        }
    });

    // ==========================================================
    // INICIALIZACIÓN
    // ==========================================================
    setupEventListeners();
    setupPasswordToggles();
    cargarRoles();
    cargarTiposDocumento();

    console.log('Módulo de usuarios cargado — conectado a PostgreSQL');
})();
