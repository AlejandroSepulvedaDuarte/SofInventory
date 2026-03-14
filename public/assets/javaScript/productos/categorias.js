// =========================================================
// MÓDULO DE CATEGORÍAS — conectado a PostgreSQL via Django
// =========================================================
const API_URL = 'http://127.0.0.1:8000/api';

// =========================================================
// 1. USUARIO EN SESIÓN
// =========================================================
const currentUserCat = JSON.parse(sessionStorage.getItem('currentUser'));
if (!currentUserCat) {
    alert('Sesión expirada. Por favor inicie sesión.');
    window.location.href = '/index.html';
}

// =========================================================
// 2. ELEMENTOS DEL DOM
// =========================================================
const categoryForm = document.getElementById('categoryForm');
const tableBody = document.getElementById('categoriesTableBody');
const totalCatsLabel = document.getElementById('totalCats');
const catTipoElement = document.getElementById('catTipo');
const hintElement = document.getElementById('typeHint');

// =========================================================
// 3. CARGAR Y RENDERIZAR CATEGORÍAS
// =========================================================
async function cargarCategorias() {
    try {
        const response = await fetch(`${API_URL}/categorias/listar/`);
        const categorias = await response.json();

        tableBody.innerHTML = '';

        if (totalCatsLabel) {
            totalCatsLabel.textContent = `${categorias.length} registros`;
        }

        if (categorias.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:20px; color:#666;">
                        No hay categorías creadas aún.
                    </td>
                </tr>`;
            return;
        }

        categorias.forEach(cat => {
            const badgeMap = {
                'GENERAL': { clase: 'badge-general', texto: 'General' },
                'HERRAMIENTA': { clase: 'badge-herramienta', texto: 'Herramienta' },
                'ELECTRICO': { clase: 'badge-electrico', texto: 'Eléctrico' },
                'LIQUIDO': { clase: 'badge-liquido', texto: 'Líquido' },
                'TORNILLERIA': { clase: 'badge-tornilleria', texto: 'Tornillería' },
            };

            const badge = badgeMap[cat.tipo_control] || { clase: 'badge-general', texto: 'General' };
            const fecha = new Date(cat.fecha_creacion).toLocaleDateString('es-ES');

            tableBody.innerHTML += `
                <tr>
                    <td>
                        <strong>${cat.nombre}</strong>
                        ${cat.descripcion ? `<br><small style="color:#888">${cat.descripcion}</small>` : ''}
                    </td>
                    <td><span class="badge ${badge.clase}">${badge.texto}</span></td>
                    <td>
                        <span class="user-tag">
                            <i class="fas fa-user-edit"></i> ${cat.creado_por_nombre}
                        </span><br>
                        <small style="font-size:0.75em; color:#aaa;">${fecha}</small>
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-delete" onclick="eliminarCategoria(${cat.id})" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
        });

    } catch (error) {
        console.error('Error al cargar categorías:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:red;">
                    Error al conectar con el servidor.
                </td>
            </tr>`;
    }
}

// =========================================================
// 4. HINT DEL TIPO DE CONTROL
// =========================================================
if (catTipoElement && hintElement) {
    catTipoElement.addEventListener('change', function () {
        const hints = {
            'GENERAL': '✅ En productos: Solo pedirá stock y precio básico.',
            'HERRAMIENTA': '✅ En productos: Pedirá marca y garantía.',
            'ELECTRICO': '✅ En productos: Pedirá voltaje y especificaciones técnicas.',
            'LIQUIDO': '✅ En productos: Se vende por litros o galones.',
            'TORNILLERIA': '✅ En productos: Se vende por unidad o caja.',
        };
        hintElement.textContent = hints[this.value] || 'Define qué campos pedirá el producto al crearse.';
    });
}

// =========================================================
// 5. CREAR CATEGORÍA
// =========================================================
categoryForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const nombre = document.getElementById('catNombre').value.trim();
    const tipo = document.getElementById('catTipo').value;
    const desc = document.getElementById('catDesc').value.trim();

    if (!nombre) { alert('❌ El nombre de categoría es obligatorio.'); return; }
    if (!tipo) { alert('❌ Debe seleccionar un tipo de control.'); return; }

    try {
        const response = await fetch(`${API_URL}/categorias/crear/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombre,
                tipo_control: tipo,
                descripcion: desc,
                creado_por: currentUserCat.id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al crear categoría: ' + JSON.stringify(data));
            return;
        }

        alert(`✅ Categoría "${nombre}" creada correctamente.`);
        categoryForm.reset();
        hintElement.textContent = 'Define qué campos pedirá el producto al crearse.';
        cargarCategorias();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
});

// =========================================================
// 6. ELIMINAR CATEGORÍA
// =========================================================
window.eliminarCategoria = async function (id) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
        const response = await fetch(`${API_URL}/categorias/eliminar/${id}/`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error al eliminar: ' + data.error);
            return;
        }

        alert('✅ Categoría eliminada correctamente.');
        cargarCategorias();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
};

// =========================================================
// 7. INICIALIZACIÓN
// =========================================================
cargarCategorias();
console.log('Módulo de categorías cargado — conectado a PostgreSQL');