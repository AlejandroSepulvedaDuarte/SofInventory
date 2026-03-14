// ==========================================================
// PROTEGER PÁGINAS INTERNAS (Dashboard, Crear Usuarios, etc.)
// ==========================================================
export function checkSession() {
    // La clave de sesión es la que guardamos en login.js ('currentUser')
    const session = sessionStorage.getItem("currentUser");

    if (!session) {
        // Redirigir al login (asumiendo que index.html está un nivel arriba)
        // Ejemplo: Si estoy en /pages/dashboard.html, necesito '../index.html'
        window.location.href = "../index.html"; 
        return false;
    }
    // Opcional: Devolver los datos del usuario logueado
    return JSON.parse(session); 
}

// Ejecutar la comprobación inmediatamente al cargar cualquier página interna
document.addEventListener('DOMContentLoaded', checkSession);


// ==========================================================
// FUNCIÓN DE LOGOUT
// ==========================================================
export function logout() {
    sessionStorage.removeItem("currentUser");
    // Redirigir al login
    window.location.href = "../index.html";
}