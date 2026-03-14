// public/js/loader.js

/**
 * Carga e inyecta un componente HTML usando la API Fetch.
 * @param {string} tagName - El nombre de la etiqueta HTML personalizada (ej: 'app-header').
 * @param {string} componentPath - La ruta relativa al archivo HTML del componente (ej: '../components/header.html').
 */
async function loadComponent(tagName, componentPath) {
    try {
        // Usamos fetch para obtener el contenido del archivo HTML
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Error al cargar el componente ${componentPath}: ${response.statusText}`);
        }
        
        const htmlContent = await response.text();

        // Creamos la clase para el Web Component
        class ComponentLoader extends HTMLElement {
            constructor() {
                super();
                // Adjuntamos el contenido HTML al elemento personalizado
                this.innerHTML = htmlContent;
                
                // Opcional: Ejecutar scripts dentro del componente si existen.
                this.executeScripts();
            }

            // Función para ejecutar scripts dentro del contenido inyectado
            executeScripts() {
                this.querySelectorAll('script').forEach(oldScript => {
                    const newScript = document.createElement('script');
                    // Copiamos todos los atributos del script original
                    Array.from(oldScript.attributes).forEach(attr => 
                        newScript.setAttribute(attr.name, attr.value)
                    );
                    newScript.textContent = oldScript.textContent;
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                });
            }
        }
        
        // Definimos el elemento personalizado para que el navegador lo reconozca
        customElements.define(tagName, ComponentLoader);

    } catch (error) {
        console.error(`Fallo al inyectar el componente ${tagName}:`, error);
    }
}

// ----------------------------------------------------
// ⚠️ Definición de Componentes
// ----------------------------------------------------

// La ruta es relativa a la ubicación del archivo HTML que lo está llamando (ej: dashboard.html en /pages/)
// Si dashboard.html está en /public/pages/, la ruta a /public/components/ es '../components/'

loadComponent('app-header', './../components/header.html'); 
loadComponent('app-menu', './../components/menu.html');
loadComponent('app-footer', './../components/footer.html');