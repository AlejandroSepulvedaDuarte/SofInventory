
// =========================================================
// LISTA DE VENTAS Y FACTURAS — conectado a Django
// Archivo: lista_ventas.js
// =========================================================

const API_URL_VENTAS = 'http://127.0.0.1:8000/api';
let todasLasVentas = [];

// =========================================================
// INICIALIZACIÓN ROBUSTA
// =========================================================
function initListaVentas() {
    if (document.getElementById('lista-ventas')) {
        cargarVentas();
        // Setear fechas por defecto: últimos 30 días
        const hoy      = new Date();
        const hace30   = new Date();
        hace30.setDate(hoy.getDate() - 30);
        document.getElementById('filtroFechaDesde').value = hace30.toISOString().split('T')[0];
        document.getElementById('filtroFechaHasta').value = hoy.toISOString().split('T')[0];
    } else {
        setTimeout(initListaVentas, 50);
    }
}

// =========================================================
// CARGAR VENTAS DESDE DJANGO
// =========================================================
async function cargarVentas(filtros = {}) {
    try {
        const params   = new URLSearchParams(filtros).toString();
        const response = await fetch(`${API_URL_VENTAS}/ventas/listar/?${params}`);
        const ventas   = await response.json();

        todasLasVentas = ventas;
        mostrarVentas(ventas);
    } catch (error) {
        console.error('❌ Error cargando ventas:', error);
        mostrarErrorTabla('Error al cargar ventas. Revisa la consola.');
    }
}

function mostrarVentas(ventas) {
    const tbody = document.getElementById('lista-ventas');
    if (!tbody) return;

    if (ventas.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="padding:30px; text-align:center; color:#666;">
                <i class="fas fa-receipt" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
                No hay ventas registradas en este período
            </td></tr>`;
        return;
    }

    // Ordenar por fecha descendente
    ventas.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));

    tbody.innerHTML = ventas.map(venta => {
        // ── campo correcto: fecha_creacion ──
        const fecha = new Date(venta.fecha_creacion).toLocaleDateString('es-CO', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });

        const estadoBadge = venta.estado === 'completada'
            ? '<span style="background:#28a745;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8rem;">Completada</span>'
            : '<span style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8rem;">Anulada</span>';

        return `
            <tr style="border-bottom:1px solid #dee2e6; ${venta.estado === 'anulada' ? 'opacity:0.6;' : ''}">
                <td style="padding:10px;">${venta.numero_venta}</td>
                <td style="padding:10px;">${fecha}</td>
                <td style="padding:10px;">${venta.cliente_nombre || 'Cliente General'}</td>
                <td style="padding:10px;">${venta.vendedor_nombre || 'Sistema'}</td>
                <td style="padding:10px; text-align:right;">
                    $${parseFloat(venta.total).toLocaleString('es-CO')}
                </td>
                <td style="padding:10px; text-align:center;">
                    ${estadoBadge}
                    <button onclick="verDetalleVenta(${venta.id})"
                        title="Ver detalle"
                        style="margin-left:5px;padding:4px 8px;background:#262B50;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="generarFactura(${venta.id})"
                        title="Ver factura"
                        style="margin-left:4px;padding:4px 8px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

// =========================================================
// FILTRAR VENTAS (cliente-side sobre los datos ya cargados)
// =========================================================
window.filtrarVentas = function () {
    const fechaDesde = document.getElementById('filtroFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFechaHasta').value;
    const busqueda   = document.getElementById('buscarVenta').value.toLowerCase().trim();

    const filtradas = todasLasVentas.filter(venta => {
        // fecha_creacion: "2025-03-07T14:30:00Z"
        const fechaVenta     = venta.fecha_creacion.split('T')[0];
        const coincideFecha  = (!fechaDesde || fechaVenta >= fechaDesde) &&
                               (!fechaHasta || fechaVenta <= fechaHasta);
        const coincideBuscar = !busqueda ||
            venta.numero_venta.toLowerCase().includes(busqueda) ||
            (venta.cliente_nombre && venta.cliente_nombre.toLowerCase().includes(busqueda)) ||
            (venta.vendedor_nombre && venta.vendedor_nombre.toLowerCase().includes(busqueda));

        return coincideFecha && coincideBuscar;
    });

    mostrarVentas(filtradas);
};

// =========================================================
// VER DETALLE — abre modal de factura directamente
// =========================================================
window.verDetalleVenta = async function (ventaId) {
    try {
        // endpoint correcto: ventas/detalle/<id>/
        const response = await fetch(`${API_URL_VENTAS}/ventas/detalle/${ventaId}/`);
        if (!response.ok) throw new Error('No se pudo cargar la venta');
        const venta = await response.json();

        mostrarFacturaModal(venta);

    } catch (error) {
        alert('❌ Error cargando detalle: ' + error.message);
    }
};

window.generarFactura = async function (ventaId) {
    try {
        const response = await fetch(`${API_URL_VENTAS}/ventas/detalle/${ventaId}/`);
        if (!response.ok) throw new Error('No se pudo cargar la venta');
        const venta = await response.json();

        mostrarFacturaModal(venta);

    } catch (error) {
        alert('❌ Error generando factura: ' + error.message);
    }
};

// =========================================================
// MODAL DE FACTURA — contenido dentro de detalle_ventas.html
// =========================================================
function mostrarFacturaModal(venta) {
    const modal = document.getElementById('facturaModal');
    if (!modal) {
        console.error('❌ No se encontró #facturaModal en el DOM');
        return;
    }

    document.getElementById('factura-content').innerHTML = crearFacturaHTML(venta);
    modal.style.display = 'flex';
}

window.cerrarFacturaModal = function () {
    const modal = document.getElementById('facturaModal');
    if (modal) modal.style.display = 'none';
};

// =========================================================
// HTML DE FACTURA
// ── usa los nombres de campo correctos del serializer ──
//    numero_venta, fecha_creacion, iva_monto,
//    detalles[].nombre_producto, detalles[].sku_producto
// =========================================================
function crearFacturaHTML(venta) {
    const fecha = new Date(venta.fecha_creacion).toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // ── Ajusta estos datos con los de tu empresa ──
    const empresa = {
        nombre:    'MI FERRETERÍA S.A.S.',
        nit:       '900.000.000-0',
        direccion: 'Calle Principal #123, Itagüí',
        telefono:  '(604) 123 4567'
    };

    const filas = (venta.detalles || []).map(d => `
        <tr>
            <td style="padding:8px;border:1px solid #dee2e6;">
                ${d.nombre_producto}<br>
                <small style="color:#888;">[${d.sku_producto}]</small>
            </td>
            <td style="padding:8px;text-align:center;border:1px solid #dee2e6;">${d.cantidad}</td>
            <td style="padding:8px;text-align:right;border:1px solid #dee2e6;">
                $${parseFloat(d.precio_unitario).toLocaleString('es-CO')}
            </td>
            <td style="padding:8px;text-align:right;border:1px solid #dee2e6;">
                $${parseFloat(d.subtotal).toLocaleString('es-CO')}
            </td>
        </tr>`).join('');

    const descuentoFila = parseFloat(venta.descuento) > 0 ? `
        <div style="display:flex;justify-content:space-between;">
            <span>Descuento:</span>
            <span>-$${parseFloat(venta.descuento).toLocaleString('es-CO')}</span>
        </div>` : '';

    return `
        <div id="factura-impresion" style="font-family:Arial;color:#333;font-size:0.9rem;">

            <div style="text-align:center;border-bottom:2px solid #343a40;padding-bottom:15px;margin-bottom:15px;">
                <h2 style="margin:0;">${empresa.nombre}</h2>
                <p style="margin:4px 0;">NIT: ${empresa.nit} | Tel: ${empresa.telefono}</p>
                <p style="margin:4px 0;">${empresa.direccion}</p>
                <h3 style="margin-top:10px;">FACTURA DE VENTA</h3>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:15px;">
                <div>
                    <strong>No. Factura:</strong> ${venta.numero_venta}<br>
                    <strong>Fecha:</strong> ${fecha}<br>
                    <strong>Método de Pago:</strong> ${venta.metodo_pago.toUpperCase()}<br>
                    <strong>Estado:</strong> ${venta.estado.toUpperCase()}
                </div>
                <div>
                    <strong>Cliente:</strong> ${venta.cliente_nombre || 'CLIENTE GENERAL'}<br>
                    <strong>Vendedor:</strong> ${venta.vendedor_nombre || 'SISTEMA'}
                </div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
                <thead>
                    <tr style="background:#343a40;color:white;">
                        <th style="padding:8px;border:1px solid #dee2e6;text-align:left;">Producto</th>
                        <th style="padding:8px;border:1px solid #dee2e6;text-align:center;">Cant.</th>
                        <th style="padding:8px;border:1px solid #dee2e6;text-align:right;">Precio Unit.</th>
                        <th style="padding:8px;border:1px solid #dee2e6;text-align:right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div style="color:#666;font-size:0.85rem;">
                    ${venta.observaciones ? `<strong>Observaciones:</strong><br>${venta.observaciones}` : ''}
                    ${venta.estado === 'anulada' ? `
                        <div style="margin-top:10px;padding:8px;background:#fff3cd;border-radius:4px;border-left:4px solid #dc3545;">
                            <strong>⚠️ VENTA ANULADA</strong><br>
                            ${venta.motivo_anulacion || ''}
                        </div>` : ''}
                </div>
                <div style="background:#e9ecef;padding:15px;border-radius:6px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span>Subtotal:</span>
                        <span>$${parseFloat(venta.subtotal).toLocaleString('es-CO')}</span>
                    </div>
                    ${descuentoFila}
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span>IVA:</span>
                        <span>$${parseFloat(venta.iva_monto).toLocaleString('es-CO')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-weight:bold;
                                border-top:2px solid #343a40;margin-top:8px;padding-top:8px;font-size:1.1rem;">
                        <span>TOTAL:</span>
                        <span>$${parseFloat(venta.total).toLocaleString('es-CO')}</span>
                    </div>
                </div>
            </div>

            <div style="text-align:center;margin-top:25px;padding-top:15px;
                        border-top:1px dashed #ccc;font-size:0.8rem;color:#888;">
                ¡Gracias por su compra!
            </div>
        </div>`;
}

// =========================================================
// IMPRIMIR
// =========================================================
window.imprimirFactura = function () {
    const contenido = document.getElementById('factura-impresion');
    if (!contenido) return;

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>Factura</title>
            <style>
                body { font-family: Arial; margin: 20px; color: #333; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; border: 1px solid #dee2e6; }
                @media print { button { display: none; } }
            </style>
        </head>
        <body>${contenido.innerHTML}</body>
        </html>`);
    win.document.close();
    win.print();
};

// =========================================================
// AUXILIARES
// =========================================================
function mostrarErrorTabla(mensaje) {
    const tbody = document.getElementById('lista-ventas');
    if (tbody) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align:center;padding:20px;color:#dc3545;">
                <i class="fas fa-exclamation-triangle"></i> ${mensaje}
            </td></tr>`;
    }
}

// =========================================================
// ARRANCAR
// =========================================================
initListaVentas();

console.log('✅ lista_ventas.js cargado');