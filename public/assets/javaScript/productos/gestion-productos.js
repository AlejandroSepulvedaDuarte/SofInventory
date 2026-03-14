// =========================================================
// CONFIGURACIÓN
// =========================================================
const API_URL = 'http://127.0.0.1:8000/api';
let modoFormulario = 'configurar';

// =========================================================
// CARGAR PRODUCTOS PENDIENTES
// =========================================================
async function cargarProductosPendientes() {
    try {
        // Solo pendientes
        const response = await fetch(`${API_URL}/productos/listar/?estado=pendiente`);
        const productos = await response.json();

        const lista = document.getElementById('lista-pendientes');
        const contador = document.getElementById('contador-pendientes');
        contador.textContent = productos.length;

        if (productos.length === 0) {
            lista.innerHTML = `
                <div style="text-align:center; padding:20px; color:#666;">
                    <i class="fas fa-check-circle" style="font-size:2rem; color:#28a745;"></i>
                    <p>¡No hay productos pendientes por configurar!</p>
                </div>`;
            return;
        }

        lista.innerHTML = '';
        productos.forEach(p => {
            const div = document.createElement('div');
            div.className = 'producto-pendiente';
            div.innerHTML = `
                <div class="producto-info">
                    <div class="producto-detalles">
                        <h4>${p.nombre} - ${p.marca} - ${p.referencia}</h4>
                        <p>Categoría: ${p.categoria_nombre} | Stock: ${p.stock} ${p.unidad_medida} | Precio compra: $${parseFloat(p.precio_compra).toLocaleString('es-CO')}</p>
                    </div>
                </div>
                <button class="btn-config" onclick="abrirFormulario(${p.id}, 'configurar')">
                    <i class="fas fa-cog"></i> Configurar
                </button>`;
            lista.appendChild(div);
        });

    } catch (error) {
        console.error('Error al cargar productos pendientes:', error);
    }
}

// =========================================================
// CARGAR PRODUCTOS CONFIGURADOS
// =========================================================
// =========================================================
// CARGAR PRODUCTOS CONFIGURADOS (ACTIVOS E INACTIVOS)
// =========================================================
async function cargarProductosConfigurados() {
    try {
        // Traer TODOS los productos (sin filtro de estado)
        const response = await fetch(`${API_URL}/productos/listar/`);
        const productos = await response.json();
        
        // Filtrar solo los que NO están pendientes (configurados)
        const productosConfigurados = productos.filter(p => p.estado !== 'pendiente');
        
        const lista = document.getElementById('lista-configurados');
        const contador = document.getElementById('contador-configurados');
        contador.textContent = productosConfigurados.length;

        if (productosConfigurados.length === 0) {
            lista.innerHTML = `
                <div style="text-align:center; padding:20px; color:#666;">
                    <i class="fas fa-info-circle" style="font-size:2rem; color:#6c757d;"></i>
                    <p>No hay productos configurados aún.</p>
                </div>`;
            return;
        }

        lista.innerHTML = '';
        
        // Ordenar: activos primero, luego inactivos
        productosConfigurados.sort((a, b) => {
            if (a.estado === 'activo' && b.estado === 'inactivo') return -1;
            if (a.estado === 'inactivo' && b.estado === 'activo') return 1;
            return 0;
        });
        
        productosConfigurados.forEach(p => {
            // Imagen del producto
            const imagen = p.imagen_url
                ? `<img src="${p.imagen_url}" alt="${p.nombre}" style="width:60px; height:60px; object-fit:cover; border-radius:6px;">`
                : `<div style="width:60px; height:60px; background:#eee; border-radius:6px; display:flex; align-items:center; justify-content:center;"><i class="fas fa-image" style="color:#aaa;"></i></div>`;

            // Badge de estado
            const estadoBadge = p.estado === 'activo' 
                ? '<span style="background:#28a745; color:white; padding:3px 10px; border-radius:20px; font-size:0.8rem; margin-left:10px;">Activo</span>'
                : '<span style="background:#ffc107; color:black; padding:3px 10px; border-radius:20px; font-size:0.8rem; margin-left:10px;">Inactivo</span>';

            const div = document.createElement('div');
            div.className = 'producto-pendiente';
            
            // Estilo diferente para productos inactivos
            if (p.estado === 'inactivo') {
                div.style.opacity = '0.8';
                div.style.borderLeft = '4px solid #ffc107';
                div.style.backgroundColor = '#fff9e6';
            }
            
            div.innerHTML = `
                <div class="producto-info">
                    ${imagen}
                    <div class="producto-detalles" style="margin-left:12px; flex:1;">
                        <div style="display:flex; align-items:center; flex-wrap:wrap;">
                            <h4 style="margin:0; margin-right:10px;">${p.nombre} - ${p.marca} - ${p.referencia}</h4>
                            ${estadoBadge}
                        </div>
                        <p style="margin:5px 0;">Categoría: ${p.categoria_nombre} | Stock: ${p.stock} ${p.unidad_medida}</p>
                        <p style="margin:5px 0;">Precio compra: $${parseFloat(p.precio_compra).toLocaleString('es-CO')} | Precio venta: $${parseFloat(p.precio_venta).toLocaleString('es-CO')}</p>
                    </div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn-config" onclick="abrirFormulario(${p.id}, 'editar')"
                        style="background-color:#262B50;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${p.estado === 'activo'
                        ? `<button class="btn-config" onclick="cambiarEstadoProducto(${p.id}, 'inactivo')"
                            style="background-color:#ffc107; color:black; border-color:#e0a800;">
                            <i class="fas fa-ban"></i> Desactivar
                          </button>`
                        : `<button class="btn-config" onclick="cambiarEstadoProducto(${p.id}, 'activo')"
                            style="background-color:#28a745;">
                            <i class="fas fa-check-circle"></i> Activar
                          </button>`
                    }
                </div>`;
            lista.appendChild(div);
        });

    } catch (error) {
        console.error('Error al cargar productos configurados:', error);
        document.getElementById('lista-configurados').innerHTML = `
            <div style="text-align:center; padding:20px; color:#dc3545;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i>
                <p>Error al cargar los productos. Revisa la consola.</p>
            </div>`;
    }
}


// =========================================================
// ABRIR FORMULARIO
// =========================================================
async function abrirFormulario(id, modo) {
    modoFormulario = modo;

    try {
        const response = await fetch(`${API_URL}/productos/listar/`);
        const productos = await response.json();
        const p = productos.find(x => x.id === id);
        if (!p) return alert('Producto no encontrado.');

        document.getElementById('productoId').value = p.id;
        document.getElementById('productoSku').value = p.sku;
        document.getElementById('productoNombre').value = p.nombre;
        document.getElementById('productoMarca').value = p.marca;
        document.getElementById('productoReferencia').value = p.referencia;
        document.getElementById('productoCategoriaNombre').value = p.categoria_nombre;
        document.getElementById('productoStock').value = `${p.stock} ${p.unidad_medida}`;
        document.getElementById('productoPrecioCompra').value = `$${parseFloat(p.precio_compra).toLocaleString('es-CO')}`;
        document.getElementById('productoPrecioVenta').value = p.precio_venta > 0 ? p.precio_venta : '';
        document.getElementById('productoStockMinimo').value = p.stock_minimo || 0;
        document.getElementById('productoDescripcion').value = p.observaciones || '';

        // Mostrar imagen si existe
        const preview = document.getElementById('previewImagen');
        if (p.imagen_url) {
            preview.src = p.imagen_url;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }

        // Campos dinámicos según tipo de control
        mostrarCamposTipoControl(p.categoria_tipo);

        // Cambiar botón según modo
        const btn = document.getElementById('btnGuardarConfig');
        if (modo === 'editar') {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Producto';
        } else {
            btn.innerHTML = '<i class="fas fa-check"></i> Completar Configuración';
        }

        // Mostrar formulario
        document.getElementById('productos-pendientes').style.display = 'none';
        document.getElementById('productos-configurados').style.display = 'none';
        document.getElementById('form-config-producto').style.display = 'block';

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
}

// =========================================================
// CAMPOS DINÁMICOS SEGÚN TIPO DE CONTROL
// =========================================================
function mostrarCamposTipoControl(tipo) {
    const div = document.getElementById('campos-tipo-control');

    const campos = {
        'HERRAMIENTA': `
            <div class="form-group">
                <label>Garantía (meses)</label>
                <input type="number" id="garantiaMeses" min="0" placeholder="Ej: 12">
            </div>`,
        'ELECTRICO': `
            <div class="form-group">
                <label>Voltaje</label>
                <input type="text" id="voltaje" placeholder="Ej: 110V, 220V">
            </div>
            <div class="form-group">
                <label>Especificaciones técnicas</label>
                <input type="text" id="especificaciones" placeholder="Ej: 1200W, 2800 RPM">
            </div>`,
        'LIQUIDO': `
            <div class="form-group">
                <label>Capacidad</label>
                <input type="text" id="capacidad" placeholder="Ej: 1 galón, 5 litros">
            </div>`,
        'TORNILLERIA': `
            <div class="form-group">
                <label>Medida</label>
                <input type="text" id="medida" placeholder="Ej: 3/8&quot;, 1/2&quot;, M8">
            </div>`,
        'GENERAL': ''
    };

    div.innerHTML = campos[tipo] || '';
}

// =========================================================
// GUARDAR CONFIGURACIÓN
// =========================================================
window.guardarConfiguracion = async function () {
    const id = parseInt(document.getElementById('productoId').value);
    const precioVenta = parseFloat(document.getElementById('productoPrecioVenta').value);
    const stockMinimo = parseInt(document.getElementById('productoStockMinimo').value);
    const descripcion = document.getElementById('productoDescripcion').value.trim();
    const observaciones = document.getElementById('productoObservaciones').value.trim();
    const imagenInput = document.getElementById('productoImagen');

    if (!precioVenta || precioVenta <= 0) {
        alert('❌ El precio de venta debe ser mayor a 0.');
        return;
    }

    const formData = new FormData();
    formData.append('precio_venta', precioVenta);
    formData.append('stock_minimo', stockMinimo);
    formData.append('descripcion', descripcion);
    formData.append('observaciones', observaciones);

    // Agregar campos dinámicos si existen
    const camposDinamicos = [
        { id: 'garantiaMeses', key: 'garantia_meses' },
        { id: 'voltaje', key: 'voltaje' },
        { id: 'especificaciones', key: 'especificaciones_tecnicas' },
        { id: 'capacidad', key: 'capacidad' },
        { id: 'medida', key: 'medida' },
    ];
    camposDinamicos.forEach(campo => {
        const el = document.getElementById(campo.id);
        if (el && el.value.trim()) {
            formData.append(campo.key, el.value.trim());
        }
    });

    if (imagenInput.files && imagenInput.files[0]) {
        formData.append('imagen', imagenInput.files[0]);
    }
    const endpoint = modoFormulario === 'editar'
        ? `${API_URL}/productos/editar/${id}/`
        : `${API_URL}/productos/configurar/${id}/`;

    try {
        const response = await fetch(endpoint, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            alert('Error: ' + JSON.stringify(data));
            return;
        }

        const mensaje = modoFormulario === 'editar' ? 'actualizado' : 'configurado';
        alert(`✅ Producto ${mensaje} correctamente.`);
        cancelarConfiguracion();

    } catch (error) {
        alert('No se pudo conectar con el servidor.');
        console.error('Error:', error);
    }
};

// =========================================================
// CAMBIAR ESTADO DEL PRODUCTO (ACTIVO/INACTIVO)
// =========================================================
window.cambiarEstadoProducto = async function (id, nuevoEstado) {
    const mensaje = nuevoEstado === 'activo' 
        ? '¿Activar este producto? Volverá a estar disponible para la venta.'
        : '¿Desactivar este producto? No aparecerá en el inventario activo pero se conservará su historial.';
    
    if (!confirm(mensaje)) return;

    try {
        const response = await fetch(`${API_URL}/productos/cambiar-estado/${id}/`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        const data = await response.json();

        if (!response.ok) {
            alert('❌ ' + (data.error || 'Error al cambiar estado'));
            return;
        }

        alert(`✅ Producto ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} correctamente.`);
        
        // Recargar ambas listas
        cargarProductosPendientes();
        cargarProductosConfigurados();

    } catch (error) {
        console.error('Error:', error);
        alert('❌ No se pudo conectar con el servidor.');
    }
};

// =========================================================
// PREVISUALIZAR IMAGEN
// =========================================================
window.previsualizarImagen = function (input) {
    const preview = document.getElementById('previewImagen');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        preview.style.display = 'none';
    }
};

// =========================================================
// CANCELAR CONFIGURACIÓN
// =========================================================
window.cancelarConfiguracion = function () {
    document.getElementById('formProductoConfig').reset();
    document.getElementById('previewImagen').style.display = 'none';
    document.getElementById('campos-tipo-control').innerHTML = '';
    document.getElementById('form-config-producto').style.display = 'none';
    document.getElementById('productos-pendientes').style.display = 'block';
    document.getElementById('productos-configurados').style.display = 'block';

    cargarProductosPendientes();
    cargarProductosConfigurados();
};

// =========================================================
// INICIALIZACIÓN
// =========================================================
cargarProductosPendientes();
cargarProductosConfigurados();
console.log('Módulo de gestión de productos cargado — conectado a PostgreSQL');

