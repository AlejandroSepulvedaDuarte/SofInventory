(function () {
    // =========================================================
    // CONFIGURACIÓN
    // =========================================================
    const API_URL = 'http://127.0.0.1:8000/api';

    // =========================================================
    // USUARIO EN SESIÓN
    // =========================================================
    const currentUserCompra = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUserCompra) {
        alert('Sesión expirada. Por favor inicie sesión.');
        window.location.href = '/index.html';
    }

    // =========================================================
    // ELEMENTOS DEL DOM
    // =========================================================
    const proveedorSelect = document.getElementById("proveedor");
    const bodyProductos   = document.getElementById("bodyProductos");
    const subtotalEl      = document.getElementById("subtotalCompra");
    const ivaTotalEl      = document.getElementById("ivaTotal");
    const totalCompraEl   = document.getElementById("totalCompra");

    let productosCompra = [];

    // Fecha actual por defecto
    document.getElementById("fechaCompra").value = new Date().toISOString().split('T')[0];

    // =========================================================
    // CARGAR PROVEEDORES DESDE LA API
    // =========================================================
    async function cargarProveedores() {
        try {
            const response = await fetch(`${API_URL}/proveedores/listar/`);
            const proveedores = await response.json();

            proveedorSelect.innerHTML = '<option value="">Seleccione...</option>';
            proveedores
                .filter(p => p.estado === 'Activo')
                .forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.id;
                    opt.textContent = p.razon_social;
                    proveedorSelect.appendChild(opt);
                });
        } catch (error) {
            console.error('Error al cargar proveedores:', error);
        }
    }

    // =========================================================
    // CARGAR CATEGORÍAS DESDE LA API
    // =========================================================
    async function cargarCategorias() {
        try {
            const response = await fetch(`${API_URL}/categorias/listar/`);
            const categorias = await response.json();

            const select = document.getElementById("productoCategoria");
            select.innerHTML = '<option value="">Seleccione...</option>';
            categorias.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = c.nombre;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }

    // =========================================================
    // AGREGAR PRODUCTO A LA TABLA
    // =========================================================
    document.getElementById("btnAgregar").addEventListener("click", () => {
        const nombre     = document.getElementById("productoNombre").value.trim();
        const marca      = document.getElementById("productoMarca").value.trim();
        const referencia = document.getElementById("productoReferencia").value.trim();
        const categoriaId = document.getElementById("productoCategoria").value;
        const categoriaNombre = document.getElementById("productoCategoria").options[
            document.getElementById("productoCategoria").selectedIndex
        ].text;
        const unidad     = document.getElementById("productoUnidad").value;
        const cantidad   = parseFloat(document.getElementById("cantidadProducto").value);
        const costo      = parseFloat(document.getElementById("costoUnitario").value);
        const iva        = parseFloat(document.getElementById("ivaProducto").value);

        if (!nombre || !marca || !referencia || !categoriaId) {
            alert("❌ Complete todos los campos del producto: nombre, marca, referencia y categoría.");
            return;
        }

        if (cantidad <= 0 || costo < 0) {
            alert("❌ La cantidad debe ser mayor a 0 y el costo no puede ser negativo.");
            return;
        }

        const subtotal = cantidad * costo;
        const ivaCalc  = subtotal * (iva / 100);
        const total    = subtotal + ivaCalc;

        // Verificar SKU duplicado en la lista actual
        const sku = `${nombre}-${marca}-${referencia}`.toUpperCase().replace(/ /g, "-");
        const existe = productosCompra.find(p => p.sku === sku);
        if (existe) {
            alert(`❌ El producto "${nombre} - ${marca} - ${referencia}" ya está en la lista. Edite la cantidad si necesita más.`);
            return;
        }

        productosCompra.push({
            sku, nombre, marca, referencia,
            categoria_id: categoriaId,
            categoria_nombre: categoriaNombre,
            unidad_medida: unidad,
            cantidad, costo_unitario: costo,
            iva, subtotal, total
        });

        renderTabla();
        calcularTotales();

        // Limpiar campos del producto
        document.getElementById("productoNombre").value    = "";
        document.getElementById("productoMarca").value     = "";
        document.getElementById("productoReferencia").value = "";
        document.getElementById("productoCategoria").value = "";
        document.getElementById("productoUnidad").value    = "Unidad";
        document.getElementById("cantidadProducto").value  = 1;
        document.getElementById("costoUnitario").value     = 0;
        document.getElementById("ivaProducto").value       = 0;
    });

    // =========================================================
    // RENDERIZAR TABLA
    // =========================================================
    function renderTabla() {
        bodyProductos.innerHTML = "";

        productosCompra.forEach((p, index) => {
            bodyProductos.innerHTML += `
                <tr>
                    <td>${p.nombre}</td>
                    <td>${p.marca}</td>
                    <td>${p.referencia}</td>
                    <td>${p.categoria_nombre}</td>
                    <td>${p.unidad_medida}</td>
                    <td>${p.cantidad}</td>
                    <td>$${parseFloat(p.costo_unitario).toLocaleString('es-CO')}</td>
                    <td>${p.iva}%</td>
                    <td>$${parseFloat(p.subtotal).toLocaleString('es-CO')}</td>
                    <td>
                        <button onclick="eliminarProductoCompra(${index})" class="btn-delete">X</button>
                    </td>
                </tr>`;
        });
    }

    // =========================================================
    // ELIMINAR PRODUCTO DE LA LISTA
    // =========================================================
    window.eliminarProductoCompra = function (i) {
        productosCompra.splice(i, 1);
        renderTabla();
        calcularTotales();
    };

    // =========================================================
    // CALCULAR TOTALES
    // =========================================================
    function calcularTotales() {
        let subtotal = 0;
        let ivaTotal = 0;

        productosCompra.forEach(p => {
            subtotal += p.subtotal;
            ivaTotal += (p.total - p.subtotal);
        });

        subtotalEl.textContent    = subtotal.toLocaleString('es-CO');
        ivaTotalEl.textContent    = ivaTotal.toLocaleString('es-CO');
        totalCompraEl.textContent = (subtotal + ivaTotal).toLocaleString('es-CO');
    }

    // =========================================================
    // GUARDAR COMPRA
    // =========================================================
    document.getElementById("formCompra").addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!proveedorSelect.value) {
            alert("❌ Seleccione un proveedor.");
            return;
        }

        if (productosCompra.length === 0) {
            alert("❌ Debe agregar al menos un producto.");
            return;
        }

        const subtotal = productosCompra.reduce((acc, p) => acc + p.subtotal, 0);
        const ivaTotal = productosCompra.reduce((acc, p) => acc + (p.total - p.subtotal), 0);
        const total    = subtotal + ivaTotal;

        const compraData = {
            proveedor_id:      parseInt(proveedorSelect.value),
            numero_factura:    document.getElementById("numeroFactura").value.trim(),
            fecha_compra:      document.getElementById("fechaCompra").value,
            tipo_compra:       document.getElementById("tipoCompra").value,
            subtotal:          subtotal.toFixed(2),
            iva_total:         ivaTotal.toFixed(2),
            total:             total.toFixed(2),
            registrado_por_id: currentUserCompra.id,
            productos:         productosCompra.map(p => ({
                nombre:        p.nombre,
                marca:         p.marca,
                referencia:    p.referencia,
                categoria_id:  p.categoria_id,
                unidad_medida: p.unidad_medida,
                cantidad:      p.cantidad,
                costo_unitario: p.costo_unitario,
                iva:           p.iva,
            }))
        };

        try {
            const response = await fetch(`${API_URL}/compras/registrar/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(compraData)
            });

            const data = await response.json();

            if (!response.ok) {
                alert('Error al registrar compra: ' + JSON.stringify(data));
                return;
            }

            alert('✅ Compra registrada correctamente.\n📦 Productos enviados a gestión de inventario.');
            productosCompra = [];
            renderTabla();
            calcularTotales();
            document.getElementById("formCompra").reset();
            document.getElementById("fechaCompra").value = new Date().toISOString().split('T')[0];
            cargarProveedores();
            cargarCategorias();

        } catch (error) {
            alert('No se pudo conectar con el servidor.');
            console.error('Error:', error);
        }
    });

    // =========================================================
    // INICIALIZACIÓN
    // =========================================================
    cargarProveedores();
    cargarCategorias();
    console.log('Módulo de compras cargado — conectado a PostgreSQL');

})();
