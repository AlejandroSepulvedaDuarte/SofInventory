// ---------------------------------------------
// 🛠  Función para cargar módulos dentro del Dashboard
//     UNA SOLA DEFINICIÓN — la duplicada causaba que
//     la lista de almacenes (y otros módulos) desapareciera
// ---------------------------------------------
async function loadModule(modulePath) {
    const container = document.getElementById("app");

    try {
        const response = await fetch(modulePath);
        if (!response.ok) throw new Error(`Error al cargar el módulo: ${modulePath}`);

        const html = await response.text();

        // 1. Inyectar el HTML del módulo
        container.innerHTML = html;

        // 2. Re-ejecutar los scripts internos del módulo
        //    (necesario porque innerHTML no ejecuta <script> automáticamente)
        const scripts = Array.from(container.querySelectorAll("script"));
        for (const oldScript of scripts) {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach(attr =>
                newScript.setAttribute(attr.name, attr.value)
            );
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        }

        // 3. Actualizar el header SIN tocar el container del módulo
        //    Se usa un timeout corto para dejar que el módulo termine de inicializar
        if (typeof actualizarHeader === 'function') {
            setTimeout(actualizarHeader, 150);
        }

    } catch (error) {
        container.innerHTML = `<p style="color:red;">${error}</p>`;
        console.error(error);
    }
}

// ---------------------------------------------
// 🛠  Router del menú — escucha clicks en [data-module]
// ---------------------------------------------
document.addEventListener("click", function (e) {
    const link = e.target.closest("[data-module]");
    if (link) {
        e.preventDefault();
        loadModule(link.dataset.module);
    }
});