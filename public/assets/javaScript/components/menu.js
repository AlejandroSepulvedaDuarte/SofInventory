// Abrir/cerrar sidebar
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const btn = document.getElementById("hamburgerBtn");
const headerLogo = document.getElementById("headerLogo");

// Función centralizada para cerrar el menú y el overlay
function closeMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    headerLogo.classList.remove("shifted"); // volver logo
}

btn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("active");
    headerLogo.classList.toggle("shifted"); // mover logo
});

overlay.addEventListener("click", closeMenu); // Usa la función de cierre

// --- SOLUCIÓN PARA CERRAR EL MENÚ AL HACER CLIC EN UN ENLACE ---

// 1. Enlaces dinámicos (los que usan data-module y href="#")
document.querySelectorAll(".submenu-link").forEach(link => {
    link.addEventListener("click", () => {
        // Cierra el menú inmediatamente después del clic
        closeMenu();
        
    });
});

// 2. Enlace de "Inicio" (aunque este recarga la página, lo dejamos por consistencia)
document.querySelector('a[href="../pages/dashboard.html"]').addEventListener("click", closeMenu);



document.querySelectorAll(".has-submenu").forEach(item => {
    item.addEventListener("click", () => {
        const submenu = item.nextElementSibling;
        item.classList.toggle("open");
        submenu.classList.toggle("open");
    });
});


const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

if (currentUser && currentUser.rol) {
    const userRole = currentUser.rol.trim().toLowerCase();

    document.querySelectorAll("[data-roles]").forEach(item => {
        const allowedRoles = item.getAttribute("data-roles")
            .split(",")
            .map(r => r.trim().toLowerCase());

        if (!allowedRoles.includes(userRole)) {
            item.style.display = "none";
        }
    });
}
