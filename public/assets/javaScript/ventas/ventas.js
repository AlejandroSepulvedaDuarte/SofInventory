
// =========================================================
// MÓDULO DE VENTAS — conectado a Django + PostgreSQL
// =========================================================

const API_URL = 'http://127.0.0.1:8000/api';
let carrito              = [];
let clienteSeleccionado  = null;
let tipoIVA              = 'automatico';
let metodoPagoSeleccionado = null;
let productosDisponibles = [];
let almacenSeleccionado  = null;

// =========================================================
// INICIALIZACIÓN
// =========================================================
function initVentas() {
    console.log('🔧 Iniciando módulo de ventas...');

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('❌ Debe iniciar sesión');
        return;
    }

    Promise.all([
        cargarAlmacenesSelect(),
        cargarClientesSelect(),
        cargarFiltroCategorias(),
        cargarProductosEnGrid()
    ]).then(() => {
        actualizarCarrito();
        calcularTotales();
    });
}

// =========================================================
// CARGAR ALMACENES — selector en el panel lateral
// =========================================================
async function cargarAlmacenesSelect() {
    try {
        const res       = await fetch(`${API_URL}/inventario/almacenes/listar/`);
        const almacenes = await res.json();

        const select = document.getElementById('almacenVenta');
        if (!select) return;

        select.innerHTML = '<option value="">Seleccionar almacén...</option>' +
            almacenes
                .filter(a => a.estado === 'activo')
                .map(a => `<option value="${a.id}">${a.nombre} (${a.codigo})</option>`)
                .join('');

    } catch (error) {
        console.error('❌ Error cargando almacenes:', error);
    }
}

window.actualizarAlmacen = function () {
    const almacenId = document.getElementById('almacenVenta').value;
    almacenSeleccionado = almacenId ? parseInt(almacenId) : null;
};

// =========================================================
// CARGAR PRODUCTOS
// =========================================================
async function cargarProductosEnGrid() {
    try {
        const res       = await fetch(`${API_URL}/inventario/stock/listar/?estado=configurado`);
        const productos = await res.json();

        // Solo productos con stock real y activos
        productosDisponibles = productos.filter(p =>
            p.estado !== 'pendiente' && p.stock_actual > 0
        ).map(p => ({
            id:           p.producto_id,
            nombre:       p.nombre,
            marca:        p.marca,
            sku:          p.sku,
            precio_venta: p.precio_venta,
            stock:        p.stock_actual,
            imagen_url:   p.imagen_url,
            categoria:    p.categoria_id,
            unidad_medida: p.unidad_medida
        }));

        mostrarProductosFiltrados(productosDisponibles);
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        mostrarError('Error al cargar productos');
    }
}

async function filtrarProductos() {
    const busqueda   = document.getElementById('buscarProducto').value.toLowerCase();
    const categoria  = document.getElementById('filtroCategoria').value;
    const filtroStk  = document.getElementById('filtroStock').value;

    const filtrados = productosDisponibles.filter(p => {
        const coincideBusqueda  = !busqueda ||
            p.nombre.toLowerCase().includes(busqueda) ||
            (p.marca && p.marca.toLowerCase().includes(busqueda)) ||
            (p.sku  && p.sku.toLowerCase().includes(busqueda));
        const coincideCategoria = !categoria || String(p.categoria) === String(categoria);
        const coincideStock     = filtroStk === 'todos' ? true :
                                  filtroStk === 'con-stock' ? p.stock > 0 : p.stock === 0;
        return coincideBusqueda && coincideCategoria && coincideStock;
    });

    mostrarProductosFiltrados(filtrados);
}

function mostrarProductosFiltrados(productos) {
    const container = document.getElementById('lista-productos');
    const contador  = document.getElementById('contador-productos');

    container.innerHTML = '';
    contador.textContent = `${productos.length} productos`;

    if (productos.length === 0) {
        container.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:30px; color:#666;">
                <i class="fas fa-search" style="font-size:3rem; margin-bottom:15px;"></i>
                <p>No se encontraron productos</p>
            </div>`;
        return;
    }

    productos.forEach(producto => {
        const card = document.createElement('div');
        card.className = `producto-card ${producto.stock === 0 ? 'sin-stock' : ''}`;
        card.onclick   = () => producto.stock > 0 && agregarAlCarrito(producto);

        card.innerHTML = `
            <div class="producto-imagen">
                ${producto.imagen_url
                    ? `<img src="${producto.imagen_url}" alt="${producto.nombre}"
                           style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`
                    : '<div style="padding:5px;text-align:center;color:#aaa;">Sin imagen</div>'}
            </div>
            <div class="producto-info">
                <h4>${producto.nombre}</h4>
                <small style="color:#888;">[${producto.sku}]${producto.marca ? ' · ' + producto.marca : ''}</small>
                <div class="producto-precio">$${parseFloat(producto.precio_venta).toLocaleString('es-CO')}</div>
                <div class="producto-stock">
                    <span class="badge-stock ${obtenerClaseStock(producto.stock)}">
                        ${obtenerEstadoStock(producto.stock)}
                    </span>
                    ${producto.stock} ${producto.unidad_medida || 'und'}
                </div>
            </div>`;
        container.appendChild(card);
    });
}

// =========================================================
// CARGAR CLIENTES
// =========================================================
async function cargarClientesSelect() {
    try {
        const res      = await fetch(`${API_URL}/clientes/listar/?estado=activo`);
        const clientes = await res.json();

        const select = document.getElementById('clienteVenta');
        select.innerHTML = '<option value="">Cliente General</option>' +
            clientes.map(c => {
                const nombre = c.tipo_persona === 'natural'
                    ? `${c.nombres} ${c.apellidos}`
                    : c.razon_social;
                return `<option value="${c.id}">${nombre}</option>`;
            }).join('');
    } catch (error) {
        console.error('❌ Error cargando clientes:', error);
    }
}

// =========================================================
// CARGAR CATEGORÍAS
// =========================================================
async function cargarFiltroCategorias() {
    try {
        const res  = await fetch(`${API_URL}/categorias/listar/`);
        const cats = await res.json();

        const select = document.getElementById('filtroCategoria');
        select.innerHTML = '<option value="">Todas las categorías</option>' +
            cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
    }
}

// =========================================================
// GESTIÓN DEL CARRITO
// =========================================================
window.agregarAlCarrito = function (producto) {
    const existente = carrito.find(i => i.id === producto.id);

    if (existente) {
        if (existente.cantidad >= producto.stock) {
            alert(`❌ Stock máximo disponible: ${producto.stock}`);
            return;
        }
        existente.cantidad += 1;
    } else {
        carrito.push({
            id:          producto.id,
            nombre:      producto.nombre,
            sku:         producto.sku,
            precio:      parseFloat(producto.precio_venta),
            cantidad:    1,
            stockMaximo: producto.stock,
            imagen:      producto.imagen_url
        });
    }

    actualizarCarrito();
    calcularTotales();
};

function actualizarCarrito() {
    const container = document.getElementById('items-carrito');
    const contador  = document.getElementById('contador-carrito');

    container.innerHTML = '';
    contador.textContent = `${carrito.length} items`;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:20px; color:#666;">
                <i class="fas fa-shopping-cart" style="font-size:2rem; margin-bottom:10px;"></i>
                <p>El carrito está vacío</p>
            </div>`;
        return;
    }

    carrito.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <div class="item-info">
                <h4>${item.nombre}</h4>
                <small style="color:#888;">[${item.sku}]</small>
                <div class="item-detalles">
                    $${item.precio.toLocaleString('es-CO')} x ${item.cantidad} =
                    <strong>$${subtotal.toLocaleString('es-CO')}</strong>
                </div>
            </div>
            <div class="item-controls">
                <div class="cantidad-control">
                    <button class="btn-cantidad" onclick="modificarCantidad(${index}, -1)">-</button>
                    <input type="number" class="cantidad-input" value="${item.cantidad}"
                           min="1" max="${item.stockMaximo}"
                           onchange="actualizarCantidad(${index}, this.value)">
                    <button class="btn-cantidad" onclick="modificarCantidad(${index}, 1)">+</button>
                </div>
                <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        container.appendChild(div);
    });
}

window.modificarCantidad = function (index, cambio) {
    const nuevo = carrito[index].cantidad + cambio;
    if (nuevo < 1) { eliminarDelCarrito(index); return; }
    if (nuevo > carrito[index].stockMaximo) {
        alert(`❌ Stock disponible: ${carrito[index].stockMaximo}`);
        return;
    }
    carrito[index].cantidad = nuevo;
    actualizarCarrito();
    calcularTotales();
};

window.actualizarCantidad = function (index, valor) {
    const cantidad = parseInt(valor);
    if (isNaN(cantidad) || cantidad < 1) {
        carrito[index].cantidad = 1;
    } else if (cantidad > carrito[index].stockMaximo) {
        alert(`❌ Stock disponible: ${carrito[index].stockMaximo}`);
        carrito[index].cantidad = carrito[index].stockMaximo;
    } else {
        carrito[index].cantidad = cantidad;
    }
    actualizarCarrito();
    calcularTotales();
};

window.eliminarDelCarrito = function (index) {
    carrito.splice(index, 1);
    actualizarCarrito();
    calcularTotales();
};

window.limpiarCarrito = function () {
    if (carrito.length === 0) return;
    if (confirm('¿Limpiar el carrito?')) {
        carrito = [];
        actualizarCarrito();
        calcularTotales();
    }
};

// =========================================================
// CÁLCULOS
// =========================================================
function calcularTotales() {
    const subtotal  = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;

    let iva = 0;
    if (tipoIVA === 'automatico') {
        iva = (subtotal - descuento) * 0.19;
    } else {
        const ivaPct   = parseFloat(document.getElementById('iva-manual-valor').value) || 0;
        const ivaMonto = parseFloat(document.getElementById('iva-manual-monto').value) || 0;
        iva = ivaMonto > 0 ? ivaMonto : (subtotal - descuento) * (ivaPct / 100);
    }

    const total = (subtotal - descuento) + iva;

    document.getElementById('subtotal-venta').textContent   = `$${subtotal.toLocaleString('es-CO')}`;
    document.getElementById('iva-venta').textContent        = `$${iva.toFixed(2)}`;
    document.getElementById('descuento-venta').textContent  = `-$${descuento.toLocaleString('es-CO')}`;
    document.getElementById('total-venta').textContent      = `$${total.toFixed(2)}`;
}

window.cambiarTipoIVA = function (tipo) {
    tipoIVA = tipo;
    document.getElementById('iva-automatico').classList.toggle('active', tipo === 'automatico');
    document.getElementById('iva-manual').classList.toggle('active', tipo === 'manual');
    document.getElementById('iva-manual-control').style.display = tipo === 'manual' ? 'block' : 'none';
    calcularTotales();
};

// =========================================================
// CLIENTES
// =========================================================
window.actualizarCliente = function () {
    const clienteId   = document.getElementById('clienteVenta').value;
    const infoCliente = document.getElementById('info-cliente');

    if (clienteId) {
        fetch(`${API_URL}/clientes/${clienteId}/`)
            .then(r => r.json())
            .then(c => {
                clienteSeleccionado = c;
                const nombre = c.tipo_persona === 'natural'
                    ? `${c.nombres} ${c.apellidos}` : c.razon_social;
                document.getElementById('cliente-nombre').textContent    = nombre;
                document.getElementById('cliente-documento').textContent = c.documento;
                document.getElementById('cliente-contacto').textContent  = c.email || c.telefono || 'Sin contacto';
                infoCliente.style.display = 'block';
            });
    } else {
        clienteSeleccionado = null;
        infoCliente.style.display = 'none';
    }
};

window.gestionarClientes = function () {
    if (typeof loadModule !== 'undefined') {
        loadModule('../pages/modules/clientes.html');
    }
};

// =========================================================
// PROCESAR VENTA — validaciones antes del modal
// =========================================================
window.procesarVenta = function () {
    if (carrito.length === 0) {
        alert('❌ El carrito está vacío');
        return;
    }
    if (!almacenSeleccionado) {
        alert('❌ Debe seleccionar el almacén desde donde se despacha la venta');
        return;
    }

    const subtotal  = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    let iva = tipoIVA === 'automatico'
        ? (subtotal - descuento) * 0.19
        : (parseFloat(document.getElementById('iva-manual-monto').value) ||
           (subtotal - descuento) * ((parseFloat(document.getElementById('iva-manual-valor').value) || 0) / 100));
    const total = (subtotal - descuento) + iva;

    document.getElementById('modalTitle').textContent   = 'Confirmar Venta';
    document.getElementById('modalMessage').innerHTML   = `
        <strong>Resumen:</strong><br>
        Almacén: <strong>${document.getElementById('almacenVenta').options[document.getElementById('almacenVenta').selectedIndex].text}</strong><br>
        Items: ${carrito.length}<br>
        Subtotal: $${subtotal.toLocaleString('es-CO')}<br>
        Descuento: -$${descuento.toLocaleString('es-CO')}<br>
        IVA: $${iva.toFixed(2)}<br>
        <strong>TOTAL: $${total.toFixed(2)}</strong><br><br>
        ¿Confirmar esta venta?`;

    document.getElementById('confirmActionBtn').onclick = mostrarModalPago;
    document.getElementById('confirmModal').style.display = 'flex';
};

// =========================================================
// MODAL DE PAGO
// =========================================================
function mostrarModalPago() {
    cerrarModal();
    const subtotal  = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    let iva = tipoIVA === 'automatico' ? (subtotal - descuento) * 0.19 : 0;
    const total = (subtotal - descuento) + iva;

    document.getElementById('total-pagar').textContent = `$${total.toFixed(2)}`;
    document.getElementById('metodoPago').value        = '';
    document.querySelectorAll('.pago-campos').forEach(el => el.style.display = 'none');
    document.getElementById('pagoModal').style.display = 'flex';
}

window.mostrarCamposPago = function () {
    const metodo = document.getElementById('metodoPago').value;
    document.querySelectorAll('.pago-campos').forEach(el => el.style.display = 'none');
    const campos = {
        'efectivo': 'campos-efectivo', 'debito': 'campos-tarjeta',
        'credito': 'campos-tarjeta', 'transferencia': 'campos-transferencia',
        'nequi': 'campos-transferencia', 'daviplata': 'campos-transferencia',
        'otro': 'campos-otro'
    };
    if (campos[metodo]) document.getElementById(campos[metodo]).style.display = 'block';
};

window.calcularCambio = function () {
    const efectivo = parseFloat(document.getElementById('efectivoRecibido').value) || 0;
    const total    = parseFloat(document.getElementById('total-pagar').textContent.replace(/[$,]/g, '')) || 0;
    const cambio   = efectivo - total;
    const el       = document.getElementById('cambio-calculado');
    el.textContent = `$${cambio >= 0 ? cambio.toFixed(2) : '0.00'}`;
    el.style.color  = cambio < 0 ? '#e74c3c' : '#27ae60';
};

window.cerrarPagoModal = function () {
    document.getElementById('pagoModal').style.display = 'none';
};

window.confirmarPago = function () {
    const metodoPago = document.getElementById('metodoPago').value;
    if (!metodoPago) { alert('❌ Seleccione método de pago'); return; }

    if (metodoPago === 'efectivo') {
        const efectivo = parseFloat(document.getElementById('efectivoRecibido').value) || 0;
        const total    = parseFloat(document.getElementById('total-pagar').textContent.replace(/[$,]/g, '')) || 0;
        if (efectivo < total) { alert('❌ Efectivo insuficiente'); return; }
    }

    metodoPagoSeleccionado = {
        metodo:                   metodoPago,
        efectivoRecibido:         metodoPago === 'efectivo' ? parseFloat(document.getElementById('efectivoRecibido').value) : null,
        cambio:                   metodoPago === 'efectivo' ? parseFloat(document.getElementById('cambio-calculado').textContent.replace(/[$,]/g, '')) : null,
        numeroTarjeta:            ['debito','credito'].includes(metodoPago) ? document.getElementById('numeroTarjeta').value : null,
        aprobacionTarjeta:        ['debito','credito'].includes(metodoPago) ? document.getElementById('aprobacionTarjeta').value : null,
        comprobanteTransferencia: ['transferencia','nequi','daviplata'].includes(metodoPago) ? document.getElementById('comprobanteTransferencia').value : null,
        otroMetodo:               metodoPago === 'otro' ? document.getElementById('otroMetodo').value : null,
    };

    cerrarPagoModal();
    confirmarVenta();
};

// =========================================================
// CONFIRMAR VENTA — envío al backend
// =========================================================
async function confirmarVenta() {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser) throw new Error('Usuario no autenticado');

        const subtotal  = carrito.reduce((sum, i) => sum + (i.precio * i.cantidad), 0);
        const descuento = parseFloat(document.getElementById('descuento').value) || 0;
        let iva = tipoIVA === 'automatico'
            ? (subtotal - descuento) * 0.19
            : (parseFloat(document.getElementById('iva-manual-monto').value) ||
               (subtotal - descuento) * ((parseFloat(document.getElementById('iva-manual-valor').value) || 0) / 100));
        const total = (subtotal - descuento) + iva;

        const ventaData = {
            cliente_id:   clienteSeleccionado?.id || null,
            vendedor_id:  currentUser.id,
            almacen_id:   almacenSeleccionado,
            productos:    carrito.map(i => ({
                producto_id:     i.id,
                cantidad:        i.cantidad,
                precio_unitario: i.precio
            })),
            subtotal,
            descuento,
            iva,
            total,
            tipo_iva:     tipoIVA,
            metodo_pago:  metodoPagoSeleccionado,
            observaciones: document.getElementById('observaciones-venta').value.trim()
        };

        const res    = await fetch(`${API_URL}/ventas/crear/`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(ventaData)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);

        alert(`✅ Venta ${result.numero_factura} procesada\nTotal: $${result.total.toLocaleString('es-CO')}`);

        // Limpiar estado
        carrito                = [];
        metodoPagoSeleccionado = null;
        clienteSeleccionado    = null;
        almacenSeleccionado    = null;

        document.getElementById('clienteVenta').value       = '';
        document.getElementById('almacenVenta').value       = '';
        document.getElementById('info-cliente').style.display = 'none';
        document.getElementById('observaciones-venta').value = '';
        document.getElementById('descuento').value          = '0';

        await cargarProductosEnGrid();
        actualizarCarrito();
        calcularTotales();

    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

// =========================================================
// VER VENTAS REALIZADAS
// =========================================================
window.mostrarListaVentas = async function () {
    // Mostrar modal primero con spinner
    const tbody = document.getElementById('lista-ventas');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#666;">
        <i class="fas fa-spinner fa-spin"></i> Cargando ventas...</td></tr>`;
    document.getElementById('ventasModal').style.display = 'flex';

    // Setear fechas por defecto: últimos 30 días
    const hoy    = new Date();
    const hace30 = new Date();
    hace30.setDate(hoy.getDate() - 30);
    document.getElementById('filtroFechaDesde').value = hace30.toISOString().split('T')[0];
    document.getElementById('filtroFechaHasta').value = hoy.toISOString().split('T')[0];

    await cargarVentas();
};

let todasLasVentasCache = [];

async function cargarVentas(filtros = {}) {
    const tbody = document.getElementById('lista-ventas');
    try {
        const params = new URLSearchParams(filtros).toString();
        const res    = await fetch(`${API_URL}/ventas/listar/?${params}`);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        const ventas = await res.json();

        // Guardar para filtrado client-side
        if (Object.keys(filtros).length === 0) todasLasVentasCache = ventas;

        if (ventas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#666;">
                <i class="fas fa-receipt" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                No hay ventas en este período</td></tr>`;
            return;
        }

        // Ordenar más reciente primero
        ventas.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

        tbody.innerHTML = ventas.map(v => {
            const fecha = new Date(v.fecha_creacion).toLocaleDateString('es-CO', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });
            const estadoBadge = v.estado === 'completada'
                ? `<span style="background:#28a745;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">Completada</span>`
                : `<span style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">Anulada</span>`;

            return `
                <tr style="border-bottom:1px solid #dee2e6;${v.estado === 'anulada' ? 'opacity:0.6;' : ''}">
                    <td style="padding:8px;">${v.numero_venta}</td>
                    <td style="padding:8px;">${fecha}</td>
                    <td style="padding:8px;">${v.cliente_nombre || 'Cliente General'}</td>
                    <td style="padding:8px;">${v.vendedor_nombre || 'Sistema'}</td>
                    <td style="padding:8px;text-align:right;font-weight:bold;">
                        $${parseFloat(v.total).toLocaleString('es-CO')}
                    </td>
                    <td style="padding:8px;text-align:center;">
                        ${estadoBadge}
                        <button onclick="verDetalleVenta(${v.id})" title="Ver factura"
                            style="margin-left:5px;padding:3px 8px;background:#262B50;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${v.estado === 'completada'
                            ? `<button onclick="confirmarAnularVenta(${v.id}, '${v.numero_venta}')" title="Anular venta"
                                    style="margin-left:4px;padding:3px 8px;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                                    <i class="fas fa-ban"></i>
                               </button>`
                            : ''}
                    </td>
                </tr>`;
        }).join('');

    } catch (error) {
        console.error('❌ Error cargando ventas:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#dc3545;">
            <i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</td></tr>`;
    }
}

window.filtrarVentas = function () {
    const desde  = document.getElementById('filtroFechaDesde').value;
    const hasta  = document.getElementById('filtroFechaHasta').value;
    const buscar = document.getElementById('buscarVenta').value.toLowerCase().trim();

    // Filtrado client-side sobre el cache para no hacer fetch en cada keystroke
    const filtradas = todasLasVentasCache.filter(v => {
        const fechaV        = v.fecha_creacion.split('T')[0];
        const coincideFecha = (!desde || fechaV >= desde) && (!hasta || fechaV <= hasta);
        const coincideBuscar = !buscar ||
            v.numero_venta.toLowerCase().includes(buscar) ||
            (v.cliente_nombre  && v.cliente_nombre.toLowerCase().includes(buscar)) ||
            (v.vendedor_nombre && v.vendedor_nombre.toLowerCase().includes(buscar));
        return coincideFecha && coincideBuscar;
    });

    // Reusar cargarVentas con los datos ya filtrados localmente
    const tbody = document.getElementById('lista-ventas');
    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#666;">
            Sin resultados para los filtros aplicados</td></tr>`;
        return;
    }
    filtradas.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
    tbody.innerHTML = filtradas.map(v => {
        const fecha = new Date(v.fecha_creacion).toLocaleDateString('es-CO', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
        const estadoBadge = v.estado === 'completada'
            ? `<span style="background:#28a745;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">Completada</span>`
            : `<span style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;">Anulada</span>`;
        return `
            <tr style="border-bottom:1px solid #dee2e6;${v.estado === 'anulada' ? 'opacity:0.6;' : ''}">
                <td style="padding:8px;">${v.numero_venta}</td>
                <td style="padding:8px;">${fecha}</td>
                <td style="padding:8px;">${v.cliente_nombre || 'Cliente General'}</td>
                <td style="padding:8px;">${v.vendedor_nombre || 'Sistema'}</td>
                <td style="padding:8px;text-align:right;font-weight:bold;">
                    $${parseFloat(v.total).toLocaleString('es-CO')}
                </td>
                <td style="padding:8px;text-align:center;">
                    ${estadoBadge}
                    <button onclick="verDetalleVenta(${v.id})" title="Ver factura"
                        style="margin-left:5px;padding:3px 8px;background:#262B50;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${v.estado === 'completada'
                        ? `<button onclick="confirmarAnularVenta(${v.id}, '${v.numero_venta}')" title="Anular"
                                style="margin-left:4px;padding:3px 8px;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                                <i class="fas fa-ban"></i>
                           </button>`
                        : ''}
                </td>
            </tr>`;
    }).join('');
};

window.cerrarVentasModal = function () {
    document.getElementById('ventasModal').style.display = 'none';
};

// =========================================================
// DETALLE Y FACTURA
// =========================================================
window.verDetalleVenta = async function (ventaId) {
    try {
        const res   = await fetch(`${API_URL}/ventas/detalle/${ventaId}/`);
        const venta = await res.json();

        const fecha = new Date(venta.fecha_creacion).toLocaleDateString('es-CO');
        document.getElementById('factura-content').innerHTML = `
            <div style="font-family:monospace;">
                <h3 style="text-align:center;">FERRETERÍA — FACTURA DE VENTA</h3>
                <p style="text-align:center;">${venta.numero_venta} — ${fecha}</p>
                <hr>
                <p><strong>Cliente:</strong> ${venta.cliente_nombre}</p>
                <p><strong>Vendedor:</strong> ${venta.vendedor_nombre}</p>
                <p><strong>Método de pago:</strong> ${venta.metodo_pago}</p>
                <hr>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:1px solid #ccc;">
                            <th style="text-align:left;padding:4px;">Producto</th>
                            <th style="text-align:center;padding:4px;">Cant.</th>
                            <th style="text-align:right;padding:4px;">Precio</th>
                            <th style="text-align:right;padding:4px;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${venta.detalles.map(d => `
                            <tr>
                                <td style="padding:4px;">${d.nombre_producto}<br>
                                    <small style="color:#888;">[${d.sku_producto}]</small></td>
                                <td style="text-align:center;padding:4px;">${d.cantidad}</td>
                                <td style="text-align:right;padding:4px;">$${parseFloat(d.precio_unitario).toLocaleString('es-CO')}</td>
                                <td style="text-align:right;padding:4px;">$${parseFloat(d.subtotal).toLocaleString('es-CO')}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                <hr>
                <p style="text-align:right;"><strong>Subtotal:</strong> $${parseFloat(venta.subtotal).toLocaleString('es-CO')}</p>
                <p style="text-align:right;"><strong>Descuento:</strong> -$${parseFloat(venta.descuento).toLocaleString('es-CO')}</p>
                <p style="text-align:right;"><strong>IVA:</strong> $${parseFloat(venta.iva_monto).toLocaleString('es-CO')}</p>
                <p style="text-align:right;font-size:1.2rem;"><strong>TOTAL: $${parseFloat(venta.total).toLocaleString('es-CO')}</strong></p>
                ${venta.observaciones ? `<p><strong>Obs:</strong> ${venta.observaciones}</p>` : ''}
            </div>`;

        document.getElementById('ventasModal').style.display  = 'none';
        document.getElementById('facturaModal').style.display = 'flex';

    } catch (error) {
        alert('❌ Error cargando detalle: ' + error.message);
    }
};

window.confirmarAnularVenta = function (ventaId, numeroVenta) {
    const motivo = prompt(`¿Motivo de anulación de ${numeroVenta}?`);
    if (!motivo || !motivo.trim()) return;
    anularVenta(ventaId, motivo.trim());
};

async function anularVenta(ventaId, motivo) {
    try {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const res = await fetch(`${API_URL}/ventas/anular/${ventaId}/`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                motivo,
                vendedor_id: currentUser?.id
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        alert(`✅ ${data.mensaje}`);
        await cargarVentas();
        await cargarProductosEnGrid();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
}

window.cerrarFacturaModal = function () {
    document.getElementById('facturaModal').style.display  = 'none';
    document.getElementById('ventasModal').style.display   = 'flex';
    cargarVentas();
};

window.imprimirFactura = function () {
    const contenido = document.getElementById('factura-content').innerHTML;
    const ventana   = window.open('', '_blank');
    ventana.document.write(`<html><body>${contenido}</body></html>`);
    ventana.document.close();
    ventana.print();
};

// =========================================================
// AUXILIARES
// =========================================================
function obtenerEstadoStock(stock) {
    if (stock === 0)  return 'Agotado';
    if (stock <= 5)   return 'Bajo';
    if (stock <= 20)  return 'Medio';
    return 'Alto';
}

function obtenerClaseStock(stock) {
    if (stock === 0 || stock <= 5) return 'bajo';
    if (stock <= 20)               return 'medio';
    return 'alto';
}

function mostrarError(msg) {
    const c = document.getElementById('lista-productos');
    if (c) c.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;color:#dc3545;">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem;"></i>
            <p>${msg}</p>
        </div>`;
}

function cerrarModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

window.cancelarAccion = cerrarModal;

// =========================================================
// INICIALIZAR — robusto igual que almacenes
// =========================================================
function init() {
    if (document.getElementById('lista-productos')) {
        initVentas();
    } else {
        setTimeout(init, 50);
    }
}

init();

console.log('✅ Módulo de ventas listo');
