(function () {
    // =========================================================
    // CONFIGURACIÓN
    // =========================================================
    const API_URL = 'http://127.0.0.1:8000/api';

    // =========================================================
    // ELEMENTOS DEL DOM
    // =========================================================
    const tabla = document.querySelector("#tablaCompras tbody");
    const buscarInput = document.getElementById("buscarCompra");
    const fechaDesde = document.getElementById("fechaDesde");
    const fechaHasta = document.getElementById("fechaHasta");
    const modal = document.getElementById("modalDetallesCompra");

    let todasLasCompras = [];

    // =========================================================
    // UTILIDADES
    // =========================================================
    function formatearFecha(fechaStr) {
        const [year, month, day] = fechaStr.split('-');
        return `${day}/${month}/${year}`;
    }

    function formatearMoneda(monto) {
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(monto);
    }

    // =========================================================
    // CARGAR COMPRAS DESDE LA API
    // =========================================================
    async function cargarCompras() {
        try {
            const response = await fetch(`${API_URL}/compras/listar/`);
            todasLasCompras = await response.json();
            renderTabla();
        } catch (error) {
            console.error('Error al cargar compras:', error);
            tabla.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; color:red;">
                        Error al conectar con el servidor.
                    </td>
                </tr>`;
        }
    }

    // =========================================================
    // RENDERIZAR TABLA
    // =========================================================
    function renderTabla(filtro = "") {
        tabla.innerHTML = "";

        let filtradas = todasLasCompras.filter(c => {
            const coincideBusqueda =
                c.proveedor_nombre.toLowerCase().includes(filtro.toLowerCase()) ||
                c.numero_factura.toLowerCase().includes(filtro.toLowerCase());

            let coincideFecha = true;
            if (fechaDesde.value) {
                coincideFecha = coincideFecha && (c.fecha_compra >= fechaDesde.value);
            }
            if (fechaHasta.value) {
                coincideFecha = coincideFecha && (c.fecha_compra <= fechaHasta.value);
            }

            return coincideBusqueda && coincideFecha;
        });

        if (filtradas.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:20px; color:#666;">
                        No se encontraron compras.
                    </td>
                </tr>`;
            return;
        }

        filtradas.forEach(compra => {
            const estadoClase = compra.estado === 'anulada' ? 'estado-anulado' : 'estado-activo';
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="Factura">${compra.numero_factura}</td>
                <td data-label="Proveedor">${compra.proveedor_nombre}</td>
                <td data-label="Fecha">${formatearFecha(compra.fecha_compra)}</td>
                <td data-label="Tipo">${compra.tipo_compra}</td>
                <td data-label="Total">$${formatearMoneda(compra.total)}</td>
                <td data-label="Estado" class="${estadoClase}">${compra.estado}</td>
                <td data-label="Acciones" class="acciones">
                    <button class="btn btn-ver" onclick="verDetalleCompra(${compra.id})">Ver Detalle</button>
                    <button class="btn btn-anular" onclick="anularCompra(${compra.id})">
                        ${compra.estado === 'anulada' ? 'Reactivar' : 'Anular'}
                    </button>
                    
                </td>`;
            tabla.appendChild(tr);
        });
    }

    // =========================================================
    // VER DETALLE
    // =========================================================
    window.verDetalleCompra = async function (id) {
        try {
            const response = await fetch(`${API_URL}/compras/detalle/${id}/`);
            const compra = await response.json();

            document.getElementById("detalleFactura").textContent = compra.numero_factura;
            document.getElementById("detalleProveedor").textContent = compra.proveedor_nombre;
            document.getElementById("detalleFecha").textContent = formatearFecha(compra.fecha_compra);
            document.getElementById("detalleTipo").textContent = compra.tipo_compra;
            document.getElementById("detalleSubtotal").textContent = formatearMoneda(compra.subtotal);
            document.getElementById("detalleIva").textContent = formatearMoneda(compra.iva_total);
            document.getElementById("detalleTotal").textContent = formatearMoneda(compra.total);

            const tbody = document.getElementById("detalleProductos");
            tbody.innerHTML = "";

            compra.detalles.forEach(d => {
                tbody.innerHTML += `
                    <tr>
                        <td>${d.producto_nombre}</td>
                        <td>${d.producto_marca}</td>
                        <td>${d.producto_referencia || ''}</td>
                        <td>${d.producto_unidad || ''}</td>
                        <td>${d.cantidad}</td>
                        <td>$${formatearMoneda(d.costo_unitario)}</td>
                        <td>${d.iva_porcentaje}%</td>
                        <td>$${formatearMoneda(d.subtotal)}</td>
                    </tr>`;
            });

            modal.style.display = "flex";

        } catch (error) {
            alert('Error al cargar detalle de compra.');
            console.error('Error:', error);
        }
    };

    // =========================================================
    // CERRAR MODAL
    // =========================================================
    window.cerrarModalDetalles = function () {
        modal.style.display = "none";
    };

    modal.addEventListener("click", function (e) {
        if (e.target === modal) cerrarModalDetalles();
    });

    // =========================================================
    // ANULAR COMPRA
    // =========================================================
    window.anularCompra = async function (id) {
        const compra = todasLasCompras.find(c => c.id === id);
        const accion = compra.estado === 'anulada' ? 'reactivar' : 'anular';

        if (!confirm(`¿Estás seguro de que deseas ${accion} esta compra?`)) return;

        try {
            const response = await fetch(`${API_URL}/compras/anular/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!response.ok) {
                alert('❌ ' + data.error);
                return;
            }
            alert(`✅ Compra ${data.estado} correctamente.`);
            cargarCompras();

        } catch (error) {
            alert('No se pudo conectar con el servidor.');
            console.error('Error:', error);
        }
    };

    // =========================================================
    // FILTROS
    // =========================================================
    buscarInput.addEventListener("input", function () {
        renderTabla(this.value);
    });

    fechaDesde.addEventListener("change", function () {
        renderTabla(buscarInput.value);
    });

    fechaHasta.addEventListener("change", function () {
        renderTabla(buscarInput.value);
    });

    // =========================================================
    // INICIALIZACIÓN
    // =========================================================
    cargarCompras();
    console.log('Módulo listado de compras cargado — conectado a PostgreSQL');

})();
