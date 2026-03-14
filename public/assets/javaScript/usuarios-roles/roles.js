(function () {
    // =========================================================
    // MÓDULO DE ROLES — reporte conectado a Django
    // =========================================================
    const API_URL = 'http://127.0.0.1:8000/api';

    const ICONOS = {
        'Administrador': 'fas fa-user-shield',
        'Supervisor':    'fas fa-user-tie',
        'Vendedor':      'fas fa-cash-register',
        'Bodega':        'fas fa-warehouse',
    };

    const COLORES = {
        'Administrador': '#262B50',
        'Supervisor':    '#17a2b8',
        'Vendedor':      '#28a745',
        'Bodega':        '#fd7e14',
    };

    // =========================================================
    // CARGAR REPORTE
    // =========================================================
    async function cargarReporteRoles() {
        const container = document.getElementById('rolesContainer');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#666;grid-column:1/-1;">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i>
                <p style="margin-top:10px;">Cargando roles...</p>
            </div>`;

        try {
            const res    = await fetch(`${API_URL}/roles/reporte/`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const roles  = await res.json();

            if (roles.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#666;grid-column:1/-1;">
                        <i class="fas fa-users-slash" style="font-size:2rem;"></i>
                        <p>No hay roles registrados</p>
                    </div>`;
                return;
            }

            container.innerHTML = '';
            roles.forEach(rol => renderRolCard(container, rol));

        } catch (error) {
            console.error('❌ Error cargando roles:', error);
            container.innerHTML = `
                <div style="text-align:center;padding:40px;color:#dc3545;grid-column:1/-1;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem;"></i>
                    <p>Error al cargar roles: ${error.message}</p>
                </div>`;
        }
    }

    // =========================================================
    // RENDER CARD DE ROL
    // =========================================================
    function renderRolCard(container, rol) {
        const icono  = ICONOS[rol.nombre]  || 'fas fa-user-tag';
        const color  = COLORES[rol.nombre] || '#6c757d';

        const usuariosHTML = rol.usuarios.length === 0
            ? `<p style="color:#aaa;font-size:0.85rem;text-align:center;margin:10px 0;">
                Sin usuarios asignados</p>`
            : rol.usuarios.map(u => `
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:6px 0;border-bottom:1px solid #f0f0f0;">
                    <div>
                        <span style="font-size:0.9rem;font-weight:500;">${u.nombre_completo}</span><br>
                        <small style="color:#888;">@${u.username}</small>
                    </div>
                    <span style="padding:2px 8px;border-radius:12px;font-size:0.75rem;
                                background:${u.estado === 'activo' ? '#d4edda' : '#f8d7da'};
                                color:${u.estado === 'activo' ? '#155724' : '#721c24'};">
                        ${u.estado}
                    </span>
                </div>`).join('');

        const card = document.createElement('div');
        card.className = 'role-card';
        card.style.cssText = `
            background:#fff;
            border-radius:10px;
            box-shadow:0 2px 8px rgba(0,0,0,0.08);
            overflow:hidden;
            border-top:4px solid ${color};`;

        card.innerHTML = `
            <!-- Cabecera -->
            <div style="padding:20px;background:${color}08;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:${color};
                                display:flex;align-items:center;justify-content:center;">
                        <i class="${icono}" style="color:#fff;font-size:1.1rem;"></i>
                    </div>
                    <div>
                        <div class="role-title" style="font-size:1.1rem;font-weight:700;color:#333;">
                            ${rol.nombre}
                        </div>
                        <div class="role-desc" style="font-size:0.82rem;color:#777;">
                            ${rol.descripcion}
                        </div>
                    </div>
                </div>

                <!-- Contadores -->
                <div style="display:flex;gap:10px;margin-top:12px;">
                    <div style="flex:1;text-align:center;background:#fff;border-radius:8px;padding:8px;
                                box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                        <div style="font-size:1.5rem;font-weight:700;color:${color};">${rol.total}</div>
                        <div style="font-size:0.75rem;color:#888;">Total</div>
                    </div>
                    <div style="flex:1;text-align:center;background:#fff;border-radius:8px;padding:8px;
                                box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                        <div style="font-size:1.5rem;font-weight:700;color:#28a745;">${rol.activos}</div>
                        <div style="font-size:0.75rem;color:#888;">Activos</div>
                    </div>
                    <div style="flex:1;text-align:center;background:#fff;border-radius:8px;padding:8px;
                                box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                        <div style="font-size:1.5rem;font-weight:700;color:#dc3545;">${rol.inactivos}</div>
                        <div style="font-size:0.75rem;color:#888;">Inactivos</div>
                    </div>
                </div>
            </div>

            <!-- Lista de usuarios -->
            <div style="padding:15px;">
                <div style="font-size:0.8rem;font-weight:600;color:#555;
                            text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                    <i class="fas fa-users" style="margin-right:5px;"></i>Usuarios
                </div>
                <div style="max-height:160px;overflow-y:auto;">
                    ${usuariosHTML}
                </div>
            </div>`;

        container.appendChild(card);
    }

    // =========================================================
    // INICIALIZACIÓN ROBUSTA
    // =========================================================
    function init() {
        if (document.getElementById('rolesContainer')) {
            cargarReporteRoles();
        } else {
            setTimeout(init, 50);
        }
    }

    init();

    console.log('✅ Módulo de roles cargado');

})();


