// ==========================================================
// CONFIGURACIÓN
// ==========================================================
const API_URL = 'http://127.0.0.1:8000/api';
const DASHBOARD_PATH = './pages/dashboard.html';

// ==========================================================
// UTILIDADES
// ==========================================================
function displayMessage(message, isError = true) {
    const messageBox = document.getElementById('login-message');
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = isError ? 'form-message error' : 'form-message success';
    messageBox.style.display = 'block';
}

// ==========================================================
// TOGGLE PASSWORD
// ==========================================================
function setupPasswordToggle(inputId, buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        
        const input = document.getElementById(inputId);
        const icon = btn.querySelector("i");

        const isPassword = input.type === "password";

        input.type = isPassword ? "text" : "password";

        // Cambiar icono
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
    });
}

// ==========================================================
// LOGIN — consume la API de Django
// ==========================================================
async function login(event) {
    event.preventDefault();

    const usernameInput = document.getElementById("username").value.trim();
    const passwordInput = document.getElementById("password").value.trim();
    const messageBox = document.getElementById('login-message');

    messageBox.style.display = 'none';

    if (!usernameInput || !passwordInput) {
        displayMessage('Por favor, ingrese su usuario y contraseña.', true);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameInput,
                password: passwordInput
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // El servidor respondió con error (401, 403, etc.)
            displayMessage(data.error || 'Error al iniciar sesión.', true);
            return;
        }

        // Guardar sesión en sessionStorage
        sessionStorage.setItem("currentUser", JSON.stringify({
            id:       data.usuario.id,
            username: data.usuario.username,
            nombre:   data.usuario.nombre,
            rol:      data.usuario.rol,
            estado:   data.usuario.estado,
        }));

        displayMessage(`¡Bienvenido ${data.usuario.nombre}!`, false);

        setTimeout(() => {
            window.location.href = DASHBOARD_PATH + '?refresh=' + Date.now();
        }, 1500);

    } catch (error) {
        // Error de red o servidor caído
        displayMessage('No se pudo conectar con el servidor. Verifique su conexión.', true);
        console.error('Error de login:', error);
    }
}

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
document.addEventListener('DOMContentLoaded', function () {
    setupPasswordToggle('password', 'toggle-password');

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
});