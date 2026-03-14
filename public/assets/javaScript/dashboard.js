// =========================================================
// DASHBOARD — conectado a Django + PostgreSQL
// Restricciones por rol:
//   Administrador → todo
//   Supervisor    → ventas, stock, sin márgenes ni compras
//   Vendedor      → solo sus ventas del día y alertas stock
//   Bodega        → solo inventario y alertas stock
// =========================================================

console.log('📊 Iniciando dashboard...');

const API_URL_DASH = 'http://127.0.0.1:8000/api';
let ventasChart, pagosChart, stockChart, vendedoresChart;

// =========================================================
// INICIALIZACIÓN ROBUSTA
// =========================================================
function initDashboard() {
    if (document.getElementById('card-total-productos')) {
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        if (!currentUser) return;

        aplicarRestriccionesPorRol(currentUser.rol);
        cargarDatosDashboard(currentUser);

        // Actualizar cada 60 segundos
        setInterval(() => cargarDatosDashboard(currentUser), 60000);
    } else {
        setTimeout(initDashboard, 50);
    }
}

// =========================================================
// RESTRICCIONES POR ROL — oculta secciones según el rol
// =========================================================
function aplicarRestriccionesPorRol(rol) {
    // Secciones que solo ve el administrador
    const soloAdmin = [
        'seccion-compras',
        'seccion-margen',
        'seccion-proveedores',
        'seccion-top-vendedores',
        'seccion-mejor-vendedor',
    ];

    // Secciones que no ve el vendedor
    const noVendedor = [
        'seccion-top-vendedores',
        'seccion-mejor-vendedor',
        'seccion-compras',
        'seccion-margen',
        'seccion-proveedores',
        'card-total-clientes',
    ];

    // Secciones que no ve el bodeguero
    const noBodega = [
        'seccion-top-vendedores',
        'seccion-mejor-vendedor',
        'seccion-ventas-recientes',
        'card-ventas-mes',
        'card-total-ventas',
        'card-ventas-dia',
        'seccion-compras',
        'seccion-margen',
    ];

    let ocultar = [];
    if (rol === 'Vendedor')      ocultar = noVendedor;
    else if (rol === 'Bodega')   ocultar = noBodega;
    else if (rol === 'Supervisor') ocultar = soloAdmin;
    // Administrador ve todo

    ocultar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

// =========================================================
// CARGAR DATOS DESDE DJANGO
// =========================================================
async function cargarDatosDashboard(currentUser) {
    try {
        const res  = await fetch(
            `${API_URL_DASH}/dashboard/?rol=${encodeURIComponent(currentUser.rol)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        actualizarMetricas(data.metricas, currentUser.rol);
        actualizarGraficas(data);
        cargarMejorVendedor(data.mejor_vendedor_mes);
        cargarAlertasStock(data.alertas_stock);
        cargarVentasRecientes(data.ventas_recientes, currentUser);
        cargarProductosPopulares(data.top_productos);

    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        mostrarErrorDashboard(error.message);
    }
}

// =========================================================
// MÉTRICAS PRINCIPALES
// =========================================================
function actualizarMetricas(m, rol) {
    setMetrica('card-total-productos', m.total_productos);
    setMetrica('card-productos-stock', m.productos_en_stock);
    setMetrica('card-total-ventas',    m.total_ventas);
    setMetrica('card-total-clientes',  m.total_clientes);

    // Ventas mes — formato peso colombiano
    const elMes = document.querySelector('#card-ventas-mes h3');
    if (elMes) elMes.textContent = formatPeso(m.ventas_mes);

    // Ventas día
    const elDia = document.querySelector('#card-ventas-dia h3');
    if (elDia) elDia.textContent = formatPeso(m.ventas_dia);

    // Stock bajo — resaltar en rojo si hay
    const elStockBajo = document.querySelector('#card-stock-bajo h3');
    if (elStockBajo) {
        elStockBajo.textContent = m.stock_bajo;
        elStockBajo.style.color = m.stock_bajo > 0 ? '#e74c3c' : '#28a745';
    }

    // Solo admin/supervisor ven compras y margen
    if (['Administrador', 'Supervisor'].includes(rol)) {
        const elCompras = document.querySelector('#card-compras-mes h3');
        if (elCompras) elCompras.textContent = formatPeso(m.compras_mes);

        const elMargen = document.querySelector('#card-margen-mes h3');
        if (elMargen) {
            elMargen.textContent = formatPeso(m.margen_mes);
            elMargen.style.color = m.margen_mes >= 0 ? '#28a745' : '#e74c3c';
        }
    }

    // Proveedores solo admin
    if (rol === 'Administrador') {
        const elProv = document.querySelector('#card-total-proveedores h3');
        if (elProv) elProv.textContent = m.total_proveedores;
    }
}

function setMetrica(cardId, valor) {
    const el = document.querySelector(`#${cardId} h3`);
    if (el) el.textContent = valor;
}

// =========================================================
// GRÁFICAS
// =========================================================
function actualizarGraficas(data) {
    crearGraficaVentas(data.ventas_por_mes);
    crearGraficaPagos(data.metodos_pago);
    crearGraficaStock(data.estado_stock);
    crearGraficaVendedores(data.top_vendedores);
}

function crearGraficaVentas(ventasPorMes) {
    const ctx = document.getElementById('ventasChart');
    if (!ctx) return;
    if (ventasChart) ventasChart.destroy();

    ventasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ventasPorMes.map(v => v.mes),
            datasets: [{
                label: 'Ventas ($)',
                data:  ventasPorMes.map(v => v.total),
                borderColor:     '#262B50',
                backgroundColor: 'rgba(38, 43, 80, 0.08)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#262B50',
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `$${ctx.raw.toLocaleString('es-CO')} — ${ventasPorMes[ctx.dataIndex].cantidad} ventas`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '$' + v.toLocaleString('es-CO') }
                }
            }
        }
    });
}

function crearGraficaPagos(metodosPago) {
    const ctx = document.getElementById('pagosChart');
    if (!ctx) return;
    if (pagosChart) pagosChart.destroy();

    if (!metodosPago || metodosPago.length === 0) {
        ctx.parentElement.innerHTML += `<p style="text-align:center;color:#aaa;margin-top:20px;">Sin datos de pagos</p>`;
        return;
    }

    const colores = ['#262B50','#28a745','#ffc107','#dc3545','#17a2b8','#fd7e14','#6f42c1'];

    pagosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels:   metodosPago.map(m => m.metodo),
            datasets: [{
                data:            metodosPago.map(m => m.total),
                backgroundColor: colores,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct   = Math.round((ctx.raw / total) * 100);
                            return `${ctx.label}: $${ctx.raw.toLocaleString('es-CO')} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficaStock(estadoStock) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    if (stockChart) stockChart.destroy();

    stockChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Agotados', 'Stock Bajo', 'Stock Normal'],
            datasets: [{
                label: 'Productos',
                data:  [estadoStock.agotados, estadoStock.stock_bajo, estadoStock.stock_normal],
                backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function crearGraficaVendedores(topVendedores) {
    const ctx = document.getElementById('vendedoresChart');
    if (!ctx) return;
    if (vendedoresChart) vendedoresChart.destroy();

    if (!topVendedores || topVendedores.length === 0) return;

    const colores = ['#262B50','#17a2b8','#28a745','#ffc107','#dc3545'];

    vendedoresChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels:   topVendedores.map(v => v.nombre.split(' ')[0]), // primer nombre
            datasets: [{
                label: 'Ventas ($)',
                data:  topVendedores.map(v => v.total),
                backgroundColor: colores,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const v = topVendedores[ctx.dataIndex];
                            return [`$${v.total.toLocaleString('es-CO')}`, `${v.ventas} transacciones`];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '$' + v.toLocaleString('es-CO') }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// =========================================================
// MEJOR VENDEDOR DEL MES
// =========================================================
function cargarMejorVendedor(vendedor) {
    const container = document.getElementById('mejor-vendedor');
    if (!container) return;

    if (!vendedor) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-user" style="font-size:2rem;color:#ccc;"></i>
                <p style="color:#aaa;margin-top:8px;">Sin ventas este mes</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="mejor-vendedor-card">
            <div class="vendedor-avatar" style="background:#ffd700;width:56px;height:56px;border-radius:50%;
                display:flex;align-items:center;justify-content:center;margin-right:15px;">
                <i class="fas fa-crown" style="font-size:1.5rem;color:#fff;"></i>
            </div>
            <div class="vendedor-info">
                <h4 style="margin:0;font-size:1.1rem;">${vendedor.nombre}</h4>
                <div class="vendedor-stats" style="display:flex;gap:20px;margin-top:8px;">
                    <div class="stat">
                        <span class="stat-value" style="font-size:1.2rem;font-weight:700;color:#262B50;">
                            ${formatPeso(vendedor.total)}
                        </span><br>
                        <span class="stat-label" style="font-size:0.8rem;color:#888;">Ventas del mes</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" style="font-size:1.2rem;font-weight:700;color:#262B50;">
                            ${vendedor.ventas}
                        </span><br>
                        <span class="stat-label" style="font-size:0.8rem;color:#888;">Transacciones</span>
                    </div>
                </div>
            </div>
        </div>`;
}

// =========================================================
// ALERTAS DE STOCK
// =========================================================
function cargarAlertasStock(alertas) {
    const container = document.getElementById('alertas-stock');
    if (!container) return;

    if (!alertas || alertas.length === 0) {
        container.innerHTML = `
            <div class="no-alerts" style="text-align:center;padding:20px;color:#28a745;">
                <i class="fas fa-check-circle" style="font-size:2rem;"></i>
                <p style="margin-top:8px;">Sin alertas de stock</p>
            </div>`;
        return;
    }

    container.innerHTML = alertas.map(p => `
        <div class="alerta-item" style="display:flex;align-items:center;gap:10px;
             padding:8px 0;border-bottom:1px solid #f0f0f0;">
            <div style="width:36px;height:36px;background:#fff3cd;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-exclamation-triangle" style="color:#856404;font-size:0.85rem;"></i>
            </div>
            <div style="flex:1;">
                <strong style="font-size:0.9rem;">${p.nombre}</strong><br>
                <small style="color:#888;">[${p.sku}] Stock: <strong style="color:#e74c3c;">${p.stock}</strong> / Mín: ${p.stock_minimo}</small>
            </div>
            <button onclick="loadModule('../pages/modules/inventario/stock_actual.html')"
                style="padding:4px 8px;background:#262B50;color:#fff;border:none;
                       border-radius:4px;cursor:pointer;font-size:0.8rem;">
                <i class="fas fa-eye"></i>
            </button>
        </div>`).join('');
}

// =========================================================
// VENTAS RECIENTES
// =========================================================
function cargarVentasRecientes(ventas, currentUser) {
    const container = document.getElementById('ventas-recientes');
    if (!container) return;

    // Vendedor solo ve sus propias ventas
    let lista = ventas || [];
    if (currentUser.rol === 'Vendedor') {
        lista = lista.filter(v => v.vendedor === currentUser.nombre);
    }

    if (lista.length === 0) {
        container.innerHTML = `
            <div class="no-data" style="text-align:center;padding:20px;color:#aaa;">
                <i class="fas fa-receipt" style="font-size:2rem;"></i>
                <p style="margin-top:8px;">Sin ventas recientes</p>
            </div>`;
        return;
    }

    container.innerHTML = lista.map(v => {
        const fecha = new Date(v.fecha_creacion).toLocaleDateString('es-CO', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
        return `
            <div class="venta-item" style="display:flex;justify-content:space-between;
                 align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;">
                <div>
                    <strong style="font-size:0.9rem;">${v.numero_venta}</strong><br>
                    <small style="color:#888;">${v.cliente} · ${fecha}</small>
                </div>
                <strong style="color:#262B50;">${formatPeso(v.total)}</strong>
            </div>`;
    }).join('');
}

// =========================================================
// TOP PRODUCTOS
// =========================================================
function cargarProductosPopulares(productos) {
    const container = document.getElementById('productos-populares');
    if (!container) return;

    if (!productos || productos.length === 0) {
        container.innerHTML = `
            <div class="no-data" style="text-align:center;padding:20px;color:#aaa;">
                <i class="fas fa-box" style="font-size:2rem;"></i>
                <p style="margin-top:8px;">Sin datos de productos vendidos</p>
            </div>`;
        return;
    }

    container.innerHTML = productos.map((p, i) => `
        <div class="producto-item" style="display:flex;align-items:center;gap:12px;
             padding:8px 0;border-bottom:1px solid #f0f0f0;">
            <div style="width:28px;height:28px;border-radius:50%;background:#262B50;
                        display:flex;align-items:center;justify-content:center;
                        flex-shrink:0;color:#fff;font-weight:700;font-size:0.85rem;">
                ${i + 1}
            </div>
            <div style="flex:1;">
                <strong style="font-size:0.9rem;">${p.nombre}</strong><br>
                <small style="color:#888;">[${p.sku}]</small>
            </div>
            <div style="text-align:right;">
                <strong style="color:#262B50;">${p.total_vendido} und</strong><br>
                <small style="color:#888;">${formatPeso(p.total_ingresos)}</small>
            </div>
        </div>`).join('');
}

// =========================================================
// AUXILIARES
// =========================================================
function formatPeso(valor) {
    return `$${parseFloat(valor || 0).toLocaleString('es-CO', {
        minimumFractionDigits: 0, maximumFractionDigits: 0
    })}`;
}

function mostrarErrorDashboard(mensaje) {
    const header = document.querySelector('.dashboard-header p');
    if (header) {
        header.innerHTML = `<span style="color:#dc3545;">
            <i class="fas fa-exclamation-triangle"></i> Error cargando datos: ${mensaje}
        </span>`;
    }
}

// =========================================================
// ARRANCAR
// =========================================================
initDashboard();

console.log('✅ Dashboard listo');