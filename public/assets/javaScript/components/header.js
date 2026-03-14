// =========================================================
// HEADER MEJORADO - ESPERA AL USUARIO
// =========================================================

// Función para cargar y mostrar la información del usuario
function cargarUsuarioHeader() {
    const userSessionRaw = sessionStorage.getItem('currentUser');

    console.log("🔍 Verificando sesión en header:", userSessionRaw);

    if (!userSessionRaw) {
        console.log("⏳ No hay sesión aún, esperando...");
        // No hacer nada, seguir esperando
        return false;
    }

    try {
        const userData = JSON.parse(userSessionRaw);
        console.log("✅ Usuario encontrado:", userData);

        const userNameElement = document.getElementById('user-name');

        if (userNameElement) {
            // Lógica robusta de nombres
            let nombreAmostrar = "Usuario";

            if (userData.nombre) {
                nombreAmostrar = userData.nombre;
            } else if (userData.nombreCompleto) {
                nombreAmostrar = userData.nombreCompleto;
            } else if (userData.username) {
                nombreAmostrar = userData.username;
            }

            // Solo actualizar si es diferente
            if (userNameElement.textContent !== nombreAmostrar) {
                userNameElement.textContent = nombreAmostrar;

                // Poner el rol en el tooltip
                if (userData.rol || userData.rolNombre) {
                    userNameElement.title = `Rol: ${userData.rol || userData.rolNombre}`;
                }

                console.log("✅ Header actualizado con:", nombreAmostrar);
                return true;
            }
        }

    } catch (error) {
        console.error("❌ Error leyendo datos del usuario:", error);
    }

    return false;
}

// Función para esperar pacientemente a que el usuario esté disponible
function esperarUsuario() {
    console.log("⏳ Iniciando espera del usuario...");

    let intentos = 0;
    const maxIntentos = 20; // 10 segundos máximo

    const intervalo = setInterval(() => {
        intentos++;
        const usuarioCargado = cargarUsuarioHeader();

        if (usuarioCargado) {
            console.log("🎉 ¡Usuario cargado exitosamente!");
            clearInterval(intervalo);
            configurarHeader(); // Configurar eventos solo cuando el usuario esté listo
        } else if (intentos >= maxIntentos) {
            console.log("⏹️ Tiempo de espera agotado, usuario no encontrado");
            clearInterval(intervalo);
            configurarHeader(); // Configurar eventos de todas formas
        } else {
            console.log(`🔄 Esperando usuario... (${intentos}/${maxIntentos})`);
        }
    }, 500); // Verificar cada medio segundo
}

// Función para configurar eventos del header
function configurarHeader() {
    console.log("⚙️ Configurando eventos del header...");

    // LOGOUT
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        userInfo.style.cursor = 'pointer';
        userInfo.addEventListener('click', function () {
            const userSessionRaw = sessionStorage.getItem('currentUser');
            let userName = "Usuario";

            if (userSessionRaw) {
                try {
                    const userData = JSON.parse(userSessionRaw);
                    userName = userData.nombre || userData.nombreCompleto || userData.username || "Usuario";
                } catch (e) {
                    console.error("Error al obtener nombre para logout:", e);
                }
            }

            if (confirm(`¿Cerrar sesión de ${userName}?`)) {
                sessionStorage.removeItem('currentUser');
                window.location.href = '../index.html';
            }
        });
    }

    // TEMA - VERSIÓN CORREGIDA
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Verificar tema guardado
        const savedTheme = localStorage.getItem('sofInventory-theme') || 'light';
        const themeIcon = themeToggle.querySelector('i');

        // Aplicar tema inicial
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }

        themeToggle.addEventListener('click', function () {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const icon = this.querySelector('i');

            if (isDark) {
                // Cambiar a modo claro
                document.documentElement.removeAttribute('data-theme');
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
                localStorage.setItem('sofInventory-theme', 'light');
            } else {
                // Cambiar a modo oscuro
                document.documentElement.setAttribute('data-theme', 'dark');
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                localStorage.setItem('sofInventory-theme', 'dark');
            }

            // Feedback visual
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    }
}

// =========================================================
// INICIALIZACIÓN MEJORADA - ESTRATEGIA MÚLTIPLE
// =========================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 Inicializando header mejorado...");

    // ESTRATEGIA 1: Intentar cargar inmediatamente
    const cargadoInmediatamente = cargarUsuarioHeader();

    if (!cargadoInmediatamente) {
        // ESTRATEGIA 2: Esperar pacientemente al usuario
        esperarUsuario();
    } else {
        // ESTRATEGIA 3: Si se cargó inmediatamente, configurar eventos
        configurarHeader();
    }

    // ESTRATEGIA 4: Escuchar cambios en sessionStorage (para actualizaciones futuras)
    window.addEventListener('storage', function (e) {
        if (e.key === 'currentUser') {
            console.log("🔄 SessionStorage cambiado externamente, actualizando header...");
            cargarUsuarioHeader();
        }
    });

    // ESTRATEGIA 5: También escuchar cambios desde la misma pestaña
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function (key, value) {
        originalSetItem.apply(this, arguments);
        if (key === 'currentUser') {
            console.log("🔄 SessionStorage cambiado internamente, actualizando header...");
            setTimeout(() => cargarUsuarioHeader(), 100);
        }
    };
});

// Función global para forzar actualización desde otros módulos
window.actualizarHeader = function () {
    console.log("🔄 Forzando actualización del header...");
    return cargarUsuarioHeader();
};

// Botón de ayuda
    document.getElementById('help-btn').addEventListener('click', function (e) {
        e.preventDefault();

        // Opción 1: Abrir en nueva ventana (recomendada para demo)
        const helpWindow = window.open(
            '../ayuda/manual.html',
            'SofInventory_Ayuda',
            'width=1100,height=700,resizable=yes,scrollbars=yes'
        );

        // Opción 2: Abrir en modal (si prefieres)
        // openHelpModal();

        // Para demostración al instructor:
        console.log('📖 Abriendo sistema de ayuda...');
        console.log('📄 Archivo XML: ../ayuda/ayuda.xml');
        console.log('🎨 Interfaz: ../ayuda/ayuda.html');
    });

    // Función para abrir modal (opcional)
    function openHelpModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

        modal.innerHTML = `
        <div style="width: 90%; max-width: 1100px; height: 90vh; background: white; border-radius: 12px; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; padding: 15px; background: #667eea; color: white;">
                <h3 style="margin: 0;">Ayuda SofInventory</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <iframe src="ayuda/ayuda.html" style="width: 100%; height: calc(90vh - 60px); border: none;"></iframe>
        </div>
    `;

        document.body.appendChild(modal);
    }

console.log("✅ Header mejorado cargado - Estrategia múltiple activada");
