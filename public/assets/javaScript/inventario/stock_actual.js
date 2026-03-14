(function () {
    // =========================================================
    // MÓDULO DE INVENTARIO — conectado a PostgreSQL via Django
    // stock_minimo viene de cada producto (tabla productos)
    // NO usa rangos globales
    // =========================================================
    const API_URL     = 'http://127.0.0.1:8000/api';
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    console.log('📦 Iniciando módulo de inventario...');

    // =========================================================
    // ESTADÍSTICAS
    // =========================================================
    async function cargarEstadisticas() {
        try {
            const res  = await fetch(`${API_URL}/inventario/stock/estadisticas/`);
            const data = await res.json();

            document.getElementById('total-productos').textContent        = data.total_productos;
            document.getElementById('productos-configurados').textContent = data.productos_configurados;
            document.getElementById('productos-pendientes').textContent   = data.productos_pendientes;
            document.getElementById('stock-bajo').textContent             = data.stock_bajo;
            document.getElementById('total-almacenes').textContent        = data.total_almacenes;

        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
        }
    }

    // =========================================================
    // FILTROS — Categorías y Almacenes
    // =========================================================
    async function cargarFiltroCategorias() {
        try {
            const res    = await fetch(`${API_URL}/categorias/listar/`);
            const cats   = await res.json();
            const select = document.getElementById('filtroCategoria');
            select.innerHTML = '<option value="">Todas las categorías</option>' +
                cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
        }
    }

    async function cargarFiltroAlmacenes() {
        try {
            const res       = await fetch(`${API_URL}/inventario/almacenes/listar/`);
            const almacenes = await res.json();

            const options = almacenes.map(a =>
                `<option value="${a.id}">${a.nombre} (${a.codigo})</option>`
            ).join('');

            // Filtro de tabla
            document.getElementById('filtroAlmacen').innerHTML =
                '<option value="">Todos los almacenes</option>' + options;

            // Transferencia — origen
            document.getElementById('movimientoAlmacen').innerHTML =
                '<option value="">Seleccionar almacén origen</option>' + options;

            // Transferencia — destino
            document.getElementById('movimientoAlmacenDestino').innerHTML =
                '<option value="">Seleccionar almacén destino</option>' + options;

            // Ajuste manual — almacén
            document.getElementById('ajusteAlmacen').innerHTML =
                '<option value="">Seleccionar almacén</option>' + options;

        } catch (error) {
            console.error('❌ Error cargando almacenes:', error);
        }
    }

    // =========================================================
    // SELECTOR DE PRODUCTOS EN MOVIMIENTOS
    // Muestra: SKU | Nombre - Marca (Stock actual: X unidades)
    // El stock se trae desde el backend en tiempo real
    // =========================================================
    async function cargarSelectorProductos() {
        try {
            const res       = await fetch(`${API_URL}/inventario/stock/listar/?estado=configurado`);
            const productos = await res.json();

            const opciones = '<option value="">Seleccionar producto</option>' +
                productos.map(p => {
                    const sku   = p.sku   ? `[${p.sku}]`    : '';
                    const marca = p.marca ? ` - ${p.marca}` : '';
                    const stock = `Stock: ${p.stock_actual} ${p.unidad_medida || 'und'}`;
                    return `<option value="${p.producto_id}">${sku} ${p.nombre}${marca} | ${stock}</option>`;
                }).join('');

            // Selector de transferencia
            document.getElementById('movimientoProducto').innerHTML = opciones;
            // Selector de ajuste manual
            document.getElementById('ajusteProducto').innerHTML = opciones;

        } catch (error) {
            console.error('❌ Error cargando productos para movimiento:', error);
        }
    }

    // =========================================================
    // MOSTRAR / OCULTAR CAMPO ALMACÉN DESTINO
    // Solo se muestra cuando el tipo es "transferencia"
    // =========================================================
    function toggleAlmacenDestino() {
        const tipo        = document.getElementById('movimientoTipo').value;
        const contenedor  = document.getElementById('contenedor-almacen-destino');
        if (tipo === 'transferencia') {
            contenedor.style.display = 'block';
        } else {
            contenedor.style.display = 'none';
            document.getElementById('movimientoAlmacenDestino').value = '';
        }
    }

    // =========================================================
    // TABLA DE INVENTARIO
    // =========================================================
    async function cargarTablaInventario(filtros = {}) {
        const tbody    = document.getElementById('tbody-inventario');
        const contador = document.getElementById('contador-resultados');

        try {
            const params    = new URLSearchParams(filtros).toString();
            const res       = await fetch(`${API_URL}/inventario/stock/listar/?${params}`);
            const productos = await res.json();

            contador.textContent = `${productos.length} productos`;
            tbody.innerHTML = '';

            if (productos.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align:center; padding:30px; color:#666;">
                            <i class="fas fa-box-open" style="font-size:3rem; margin-bottom:15px; display:block;"></i>
                            <p>No se encontraron productos</p>
                            <small>Intenta con otros filtros o registra productos desde el módulo de compras</small>
                        </td>
                    </tr>`;
                return;
            }

            productos.forEach(p => {
                const imagen = p.imagen_url
                    ? `<img src="${p.imagen_url}" alt="${p.nombre}"
                            style="width:50px;height:50px;object-fit:cover;border-radius:6px;">`
                    : `<div style="width:50px;height:50px;background:#eee;border-radius:6px;
                            display:flex;align-items:center;justify-content:center;">
                            <i class="fas fa-image" style="color:#aaa;"></i></div>`;

                const badgeEstado = p.estado !== 'pendiente'
                    ? '<span class="badge badge-success">Configurado</span>'
                    : '<span class="badge badge-warning">Pendiente</span>';

                // Botón de acción según nivel de stock
                const btnComprar = obtenerBotonAccion(p.producto_id, p.nombre, p.estado_stock);

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="producto-cell" style="display:flex;align-items:center;gap:10px;">
                            ${imagen}
                            <div>
                                <div class="producto-nombre">${p.nombre}</div>
                                <div class="producto-marca" style="font-size:0.8rem;color:#888;">
                                    ${p.marca || 'Sin marca'} •
                                    <strong style="color:#555;">${p.sku}</strong>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>${p.categoria_nombre}</td>
                    <td>${p.almacen_nombre && p.almacen_nombre !== 'Sin almacén'
                        ? `<span class="badge badge-secondary">${p.almacen_nombre}</span>`
                        : '<span style="color:#999;">Sin almacén</span>'}</td>
                    <td class="${obtenerClaseStock(p.estado_stock)}">
                        ${p.estado_stock === 'pendiente'
                            ? '<span style="color:#95a5a6;">— Por configurar</span>'
                            : `<strong>${p.stock_actual}</strong> ${p.unidad_medida || 'und'}
                               <br><small style="color:#aaa;">Mín: ${p.stock_minimo || '-'}</small>`
                        }
                    </td>
                    <td>${obtenerBadgeStock(p.estado_stock)}</td>
                    <td>$${parseFloat(p.precio_compra).toLocaleString('es-CO')}</td>
                    <td>$${parseFloat(p.precio_venta).toLocaleString('es-CO')}</td>
                    <td>${badgeEstado}</td>
                    <td>${btnComprar}</td>`;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('❌ Error cargando inventario:', error);
            tbody.innerHTML = `
                <tr><td colspan="9" style="text-align:center;padding:20px;color:#dc3545;">
                    <i class="fas fa-exclamation-triangle"></i> Error al cargar el inventario.
                </td></tr>`;
        }
    }

    function filtrarInventario() {
        const filtros   = {};
        const busqueda  = document.getElementById('buscarProducto').value.trim();
        const categoria = document.getElementById('filtroCategoria').value;
        const almacen   = document.getElementById('filtroAlmacen').value;
        const stock     = document.getElementById('filtroStock').value;
        const estado    = document.getElementById('filtroEstado').value;

        if (busqueda)  filtros.busqueda  = busqueda;
        if (categoria) filtros.categoria = categoria;
        if (almacen)   filtros.almacen   = almacen;
        if (stock)     filtros.stock     = stock;
        if (estado)    filtros.estado    = estado;

        cargarTablaInventario(filtros);
    }

    // =========================================================
    // ALERTAS DE STOCK
    // Siempre visible si hay productos en bajo o agotado
    // =========================================================
    async function cargarAlertasStock() {
        try {
            const res     = await fetch(`${API_URL}/inventario/stock/alertas/`);
            const alertas = await res.json();

            const card     = document.getElementById('card-alertas');
            const lista    = document.getElementById('lista-alertas');
            const contador = document.getElementById('contador-alertas');

            if (alertas.length === 0) {
                card.style.display = 'none';
                return;
            }

            card.style.display   = 'block';
            contador.textContent = alertas.length;
            lista.innerHTML      = '';

            alertas.forEach(alerta => {
                const esAgotado = alerta.tipo_alerta === 'agotado';
                const div       = document.createElement('div');
                div.className   = `alerta-item ${esAgotado ? 'peligro' : ''}`;
                div.innerHTML   = `
                    <div class="alerta-texto">
                        <strong>[${alerta.sku}] ${alerta.nombre}</strong> —
                        ${esAgotado
                            ? '⛔ Stock agotado (0 unidades)'
                            : `⚠️ Stock bajo (${alerta.stock_actual} und — mínimo: ${alerta.stock_minimo})`}
                    </div>
                    <button class="alerta-accion"
                        onclick="solicitarCompra(${alerta.producto_id}, '${alerta.nombre}')"
                        style="${!esAgotado ? 'background-color:#f39c12;' : ''}">
                        ${esAgotado ? '🛒 Pedir urgente' : '📦 Reponer'}
                    </button>`;
                lista.appendChild(div);
            });

        } catch (error) {
            console.error('❌ Error cargando alertas:', error);
        }
    }

    // =========================================================
    // TRANSFERENCIA ENTRE ALMACENES
    // Mueve unidades de origen a destino sin tocar el total
    // =========================================================
    async function actualizarStockOrigen() {
        const productoId = document.getElementById('movimientoProducto').value;
        const almacenId  = document.getElementById('movimientoAlmacen').value;
        const contenedor = document.getElementById('contenedor-stock-origen');
        const display    = document.getElementById('stock-origen-display');

        if (!productoId || !almacenId) {
            contenedor.style.display = 'none';
            return;
        }

        try {
            const res  = await fetch(`${API_URL}/inventario/stock/por-almacen/?producto_id=${productoId}&almacen_id=${almacenId}`);
            const data = await res.json();
            contenedor.style.display = 'block';
            display.textContent      = `${data.cantidad} unidades disponibles`;
            display.style.color      = data.cantidad > 0 ? '#27ae60' : '#e74c3c';
        } catch {
            contenedor.style.display = 'none';
        }
    }

    async function realizarTransferencia() {
        const productoId       = document.getElementById('movimientoProducto').value;
        const almacenId        = document.getElementById('movimientoAlmacen').value;
        const almacenDestinoId = document.getElementById('movimientoAlmacenDestino').value;
        const cantidad         = parseInt(document.getElementById('movimientoCantidad').value);

        if (!productoId || !almacenId || !almacenDestinoId || !cantidad || cantidad <= 0) {
            alert('❌ Complete todos los campos correctamente');
            return;
        }
        if (almacenId === almacenDestinoId) {
            alert('❌ El almacén origen y destino no pueden ser el mismo');
            return;
        }

        const confirmar = confirm(
            `¿Confirmar transferencia?\n\n` +
            `Cantidad: ${cantidad} unidades\n` +
            `De: almacén origen → almacén destino\n\n` +
            `El stock total del producto no cambia.`
        );
        if (!confirmar) return;

        try {
            const res = await fetch(`${API_URL}/inventario/stock/movimiento/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto_id:        parseInt(productoId),
                    almacen_id:         parseInt(almacenId),
                    almacen_destino_id: parseInt(almacenDestinoId),
                    cantidad,
                    tipo:       'transferencia',
                    usuario_id: currentUser ? currentUser.id : null
                })
            });

            const data = await res.json();
            if (!res.ok) { alert(`❌ ${data.error}`); return; }

            alert(`✅ ${data.mensaje}`);

            // Limpiar formulario
            document.getElementById('movimientoCantidad').value = 1;
            document.getElementById('movimientoProducto').value = '';
            document.getElementById('movimientoAlmacenDestino').value = '';
            document.getElementById('contenedor-stock-origen').style.display = 'none';

            await Promise.all([
                cargarEstadisticas(),
                cargarAlertasStock(),
                cargarTablaInventario(),
                cargarSelectorProductos(),
            ]);

        } catch {
            alert('❌ No se pudo conectar con el servidor.');
        }
    }

    // =========================================================
    // AJUSTE MANUAL DE INVENTARIO
    // Solo para corregir errores de conteo — NO es compra ni venta
    // =========================================================
    async function realizarAjuste() {
        const productoId = document.getElementById('ajusteProducto').value;
        const almacenId  = document.getElementById('ajusteAlmacen').value;
        const tipo       = document.getElementById('ajusteTipo').value;
        const cantidad   = parseInt(document.getElementById('ajusteCantidad').value);
        const motivo     = document.getElementById('ajusteMotivo').value.trim();

        if (!productoId || !almacenId || !cantidad || cantidad <= 0) {
            alert('❌ Complete todos los campos correctamente');
            return;
        }
        if (!motivo) {
            alert('❌ Debe ingresar el motivo del ajuste');
            return;
        }

        const tipoTexto = tipo === 'entrada' ? 'agregar' : 'retirar';
        const confirmar = confirm(
            `¿Confirmar ajuste manual?\n\n` +
            `Tipo: ${tipo === 'entrada' ? '➕ Positivo' : '➖ Negativo'}\n` +
            `Cantidad: ${cantidad} unidades\n` +
            `Motivo: ${motivo}\n\n` +
            `⚠️ Este ajuste quedará registrado en el historial.`
        );
        if (!confirmar) return;

        try {
            const res = await fetch(`${API_URL}/inventario/stock/movimiento/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto_id: parseInt(productoId),
                    almacen_id:  parseInt(almacenId),
                    cantidad,
                    tipo,
                    observacion: `[AJUSTE MANUAL] ${motivo}`,
                    usuario_id:  currentUser ? currentUser.id : null
                })
            });

            const data = await res.json();
            if (!res.ok) { alert(`❌ ${data.error}`); return; }

            alert(`✅ ${data.mensaje}\n\nStock anterior: ${data.stock_anterior}\nStock nuevo: ${data.stock_nuevo}`);

            // Limpiar formulario
            document.getElementById('ajusteCantidad').value = 1;
            document.getElementById('ajusteProducto').value = '';
            document.getElementById('ajusteMotivo').value   = '';

            await Promise.all([
                cargarEstadisticas(),
                cargarAlertasStock(),
                cargarTablaInventario(),
                cargarSelectorProductos(),
            ]);

        } catch {
            alert('❌ No se pudo conectar con el servidor.');
        }
    }

    // =========================================================
    // EXPORTAR
    // =========================================================
    function exportarInventario() {
        window.location.href = `${API_URL}/inventario/stock/exportar/`;
    }

    // =========================================================
    // AUXILIARES
    // =========================================================
    function obtenerBadgeStock(estado) {
        const badges = {
            'pendiente': '<span class="badge badge-secondary">⏳ Pendiente</span>',
            'agotado':   '<span class="badge badge-danger">⛔ Agotado</span>',
            'bajo':      '<span class="badge badge-danger">🔴 Bajo</span>',
            'medio':     '<span class="badge badge-warning">🟡 Medio</span>',
            'alto':      '<span class="badge badge-success">🟢 Alto</span>',
        };
        return badges[estado] || '';
    }

    function obtenerClaseStock(estado) {
        if (estado === 'pendiente')               return 'stock-pendiente';
        if (estado === 'agotado' || estado === 'bajo') return 'stock-bajo';
        if (estado === 'medio')                   return 'stock-medio';
        return 'stock-alto';
    }

    // Botón de acción diferenciado según nivel de stock
    function obtenerBotonAccion(productoId, nombre, estado) {
        if (estado === 'pendiente') {
            return `<button class="btn-config" disabled
                        style="padding:4px 10px;font-size:0.8rem;background:#bdc3c7;color:#fff;border:none;border-radius:4px;cursor:not-allowed;">
                        ⏳ Por configurar
                    </button>`;
        }
        if (estado === 'agotado') {
            return `<button class="btn-config"
                        onclick="solicitarCompra(${productoId}, '${nombre}')"
                        style="padding:4px 10px;font-size:0.8rem;background:#dc3545;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                        🛒 Pedir urgente
                    </button>`;
        }
        if (estado === 'bajo') {
            return `<button class="btn-config"
                        onclick="solicitarCompra(${productoId}, '${nombre}')"
                        style="padding:4px 10px;font-size:0.8rem;background:#e67e22;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                        📦 Reponer
                    </button>`;
        }
        if (estado === 'medio') {
            return `<button class="btn-config"
                        onclick="solicitarCompra(${productoId}, '${nombre}')"
                        style="padding:4px 10px;font-size:0.8rem;background:#f39c12;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                        👁️ Vigilar
                    </button>`;
        }
        return `<button class="btn-config"
                    onclick="solicitarCompra(${productoId}, '${nombre}')"
                    style="padding:4px 10px;font-size:0.8rem;background:#95a5a6;color:#fff;border:none;border-radius:4px;cursor:pointer;">
                    🛒 Comprar
                </button>`;
    }

    function filtrarPorEstado(estado) {
        document.getElementById('filtroEstado').value = estado === 'todos' ? '' : estado;
        filtrarInventario();
    }

    function filtrarPorStock(nivel) {
        document.getElementById('filtroStock').value = nivel;
        filtrarInventario();
    }

    function solicitarCompra(productoId, nombre) {
        const confirmar = confirm(
            `¿Desea comprar más unidades de "${nombre}"?\n\nSerá redirigido al módulo de compras.`
        );
        if (!confirmar) return;
        let link = document.querySelector('[data-module="../pages/modules/compras/nueva-compra.html"]');
        if (!link) {
            link = document.createElement('a');
            link.href = '#';
            link.setAttribute('data-module', '../pages/modules/compras/nueva-compra.html');
            document.body.appendChild(link);
        }
        link.click();
    }

    // =========================================================
    // INICIALIZACIÓN
    // Carga todo en paralelo para máxima velocidad
    // El stock se trae del backend desde el primer render
    // =========================================================
    async function initInventario() {
        console.log('🔧 Cargando inventario...');

        // Ocultar almacén destino por defecto
        const contenedor = document.getElementById('contenedor-almacen-destino');
        if (contenedor) contenedor.style.display = 'none';

        await Promise.all([
            cargarEstadisticas(),
            cargarFiltroCategorias(),
            cargarFiltroAlmacenes(),
            cargarAlertasStock(),
        ]);

        await cargarTablaInventario();
        await cargarSelectorProductos();

        console.log('✅ Módulo de inventario listo');
    }

    // =========================================================
    // EXPONER FUNCIONES GLOBALES
    // =========================================================
    window.initInventario        = initInventario;
    window.filtrarInventario     = filtrarInventario;
    window.realizarTransferencia = realizarTransferencia;
    window.realizarAjuste        = realizarAjuste;
    window.actualizarStockOrigen = actualizarStockOrigen;
    window.exportarInventario    = exportarInventario;
    window.filtrarPorEstado      = filtrarPorEstado;
    window.filtrarPorStock       = filtrarPorStock;
    window.solicitarCompra       = solicitarCompra;

    initInventario();

})();