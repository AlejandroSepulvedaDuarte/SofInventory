// ============================================
// SISTEMA DE AYUDA - CARGA DINÁMICA DE XML
// ============================================

// Función principal que carga el XML
async function loadHelpSystem() {
    try {
        console.log('🔍 Cargando archivo XML...');

        // 1. Cargar el archivo XML
        const response = await fetch('../ayuda/ayuda.xml');

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const xmlText = await response.text();
        console.log('✅ XML cargado correctamente');

        // 2. Parsear el XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // 3. Verificar si hay errores en el XML
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('❌ Error en el XML:', parserError.textContent);
            showError('Error en la estructura del XML');
            return;
        }

        // 4. Extraer y mostrar los módulos
        displayModules(xmlDoc);
        // 5. Mostrar soporte técnico
        displaySupport(xmlDoc);


        // 5. Configurar funcionalidades
        setupSearch();

    } catch (error) {
        console.error('❌ Error al cargar el XML:', error);
        showError('No se pudo cargar el manual. Usando datos de ejemplo...');
        loadFallbackData();
    }
}

// Mostrar módulos desde el XML
function displayModules(xmlDoc) {
    const container = document.getElementById('modulesContainer');
    const modules = xmlDoc.querySelectorAll('modulo');

    if (modules.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #dc2626;">No se encontraron módulos en el XML.</p>';
        return;
    }

    let html = '';

    modules.forEach(module => {
        const name = module.getAttribute('nombre');
        const icon = module.getAttribute('icono');
        const desc = module.querySelector('descripcion').textContent;
        const data = module.querySelector('datos_muestra').textContent;

        // Extraer pasos
        const steps = Array.from(module.querySelectorAll('paso'))
            .map(paso => `<li>${paso.textContent}</li>`)
            .join('');

        // Extraer consejos
        const tips = Array.from(module.querySelectorAll('consejo'))
            .map(consejo => `<li>${consejo.textContent}</li>`)
            .join('');

        // Extraer campos importantes (si existen)
        let camposHTML = '';
        const campos = module.querySelectorAll('campo');
        if (campos.length > 0) {
            camposHTML = `
                        <div style="margin-top: 15px;">
                            <strong><i class="fas fa-keyboard"></i> Campos importantes:</strong>
                            <ul style="margin-top: 8px; color: #475569;">
                                ${Array.from(campos).map(campo =>
                `<li><strong>${campo.getAttribute('nombre')}</strong>: ${campo.textContent}</li>`
            ).join('')}
                            </ul>
                        </div>
                    `;
        }

        html += `
                    <div class="module" data-module-name="${name.toLowerCase()}">
                        <h2>${icon} ${name}</h2>
                        <p class="desc">${desc}</p>
                        
                        <div class="data-sample">
                            <strong><i class="fas fa-database"></i> Ejemplo del sistema:</strong><br>
                            ${data}
                        </div>
                        
                        <div>
                            <strong><i class="fas fa-list-ol"></i> Pasos para usar:</strong>
                            <ol class="steps">
                                ${steps}
                            </ol>
                        </div>
                        
                        ${camposHTML}
                        
                        ${tips ? `
                        <div class="tips">
                            <strong><i class="fas fa-lightbulb"></i> Consejos:</strong>
                            <ul style="margin-top: 8px;">
                                ${tips}
                            </ul>
                        </div>
                        ` : ''}
                        
                        <button class="btn" style="margin-top: 15px; width: 100%;" 
                                onclick="simulateOpenModule('${name}')">
                            <i class="fas fa-external-link-alt"></i> Simular apertura del módulo
                        </button>
                    </div>
                `;
    });

    container.innerHTML = html;
    console.log(`✅ Mostrando ${modules.length} módulos`);
}

// ===============================
// MOSTRAR SECCIÓN DE SOPORTE TÉCNICO
// ===============================
function displaySupport(xmlDoc) {
    const container = document.getElementById('modulesContainer');

    const soporte = xmlDoc.querySelector('soporte_tecnico');
    if (!soporte) return;

    const emails = Array.from(soporte.querySelectorAll('contacto[tipo="email"]'))
        .map(x => `<li><strong>Email:</strong> ${x.textContent}</li>`).join('');

    const telefonos = Array.from(soporte.querySelectorAll('contacto[tipo="telefono"]'))
        .map(x => `<li><strong>Teléfono:</strong> ${x.textContent}</li>`).join('');

    const horarios = Array.from(soporte.querySelectorAll('horario'))
        .map(x => `<li>${x.textContent}</li>`).join('');

    const emergencias = soporte.querySelector('horario_emergencia')
        ? `<li><strong>${soporte.querySelector('horario_emergencia').textContent}</strong></li>`
        : '';

    // FAQs
    const faqs = Array.from(soporte.querySelectorAll('faq')).map(faq => `
        <li style="margin-bottom: 8px;">
            <strong>❓ ${faq.querySelector('pregunta').textContent}</strong><br>
            <span>➡️ ${faq.querySelector('respuesta').textContent}</span>
        </li>
    `).join('');

    // Construcción del módulo visual
    const html = `
        <div class="module">
            <h2>🛠️ Soporte Técnico</h2>
            <p class="desc">Información de contacto, horarios y ayuda frecuente.</p>

            <div class="data-sample">
                <strong><i class="fas fa-headset"></i> Contacto Directo:</strong>
                <ul style="margin-top: 10px;">
                    ${emails}
                    ${telefonos}
                </ul>
            </div>

            <div>
                <strong><i class="fas fa-clock"></i> Horarios:</strong>
                <ul class="steps">
                    ${horarios}
                    ${emergencias}
                </ul>
            </div>

            <div class="tips" style="margin-top: 15px;">
                <strong><i class="fas fa-question-circle"></i> Preguntas Frecuentes:</strong>
                <ul style="margin-top: 8px;">
                    ${faqs}
                </ul>
            </div>
        </div>
    `;

    container.innerHTML += html;
}


// Configurar búsqueda
function setupSearch() {
    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase().trim();
        const modules = document.querySelectorAll('.module');

        if (searchTerm === '') {
            modules.forEach(module => module.style.display = 'block');
            return;
        }

        modules.forEach(module => {
            const moduleText = module.textContent.toLowerCase();
            module.style.display = moduleText.includes(searchTerm) ? 'block' : 'none';
        });

        console.log(`🔍 Buscando: "${searchTerm}"`);
    });
}


// Mostrar XML sin formato (tal cual está en el archivo)

function showXMLStructure() {
    const xmlDemo = document.getElementById('xmlDemo');
    const codeBlock = document.getElementById('xmlCode');

    if (xmlDemo.style.display === 'none' || xmlDemo.style.display === '') {
        fetch('../ayuda/ayuda.xml')
            .then(r => r.text())
            .then(xmlText => {
                const escaped = xmlText
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                codeBlock.innerHTML = escaped;

                Prism.highlightElement(codeBlock);

                xmlDemo.style.display = 'block';
            })
            .catch(() => {
                codeBlock.innerHTML = "Error cargando XML";
                xmlDemo.style.display = 'block';
            });

    } else {
        xmlDemo.style.display = 'none';
    }
}

// Simular apertura de módulo
function simulateOpenModule(moduleName) {
    alert(`🚀 DEMOSTRACIÓN: Abriendo módulo "${moduleName}"\n\nEn el sistema real, esto cargaría el formulario correspondiente.\n\nXML → Ayuda contextual → Sistema real`);
}

// Mostrar error
function showError(message) {
    const container = document.getElementById('modulesContainer');
    container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc2626;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="loadHelpSystem()" style="margin-top: 20px;">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `;
}

// Datos de respaldo si falla el XML
function loadFallbackData() {
    const fallbackXML = `<?xml version="1.0"?>
                <manual_sistema>
                    <modulo nombre="Productos Demo" icono="📦">
                        <descripcion>Ejemplo de módulo (datos de respaldo)</descripcion>
                        <datos_muestra>Ejemplo: SKU: PROD-001 | Stock: 10</datos_muestra>
                        <pasos>
                            <paso orden="1">Paso 1 de ejemplo</paso>
                            <paso orden="2">Paso 2 de ejemplo</paso>
                        </pasos>
                    </modulo>
                </manual_sistema>`;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fallbackXML, "text/xml");
    displayModules(xmlDoc);
}

// ============================================
// INICIALIZACIÓN
// ============================================

// Cargar el sistema de ayuda cuando la página esté lista
document.addEventListener('DOMContentLoaded', loadHelpSystem);

// También exponer funciones globales para debug
window.helpSystem = {
    reload: loadHelpSystem,
    showXML: showXMLStructure,
    version: '1.0'
};

console.log('🔄 Sistema de ayuda listo. Esperando carga de XML...');
