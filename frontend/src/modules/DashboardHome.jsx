import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import './DashboardHome.css'

const API_URL = 'http://127.0.0.1:8000/api'

// Secciones ocultas según rol
const OCULTAR_POR_ROL = {
  Vendedor: ['seccion-compras', 'seccion-margen', 'seccion-proveedores', 'seccion-top-vendedores', 'card-total-clientes'],
  Bodeguero: ['seccion-top-vendedores', 'seccion-ventas-recientes', 'card-ventas-mes', 'card-total-ventas', 'card-ventas-dia', 'seccion-compras', 'seccion-margen'],
  Supervisor: ['seccion-compras', 'seccion-margen', 'seccion-proveedores', 'seccion-top-vendedores'],
}

function MetricCard({ id, icon, iconClass = '', valor, label }) {
  return (
    <div className="metric-card" id={id}>
      <div className={`metric-icon ${iconClass}`}>
        <i className={`fas ${icon}`} />
      </div>
      <div className="metric-info">
        <h3>{valor ?? <span className="skeleton" />}</h3>
        <p>{label}</p>
      </div>
    </div>
  )
}

export default function DashboardHome() {
  const { user } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const ocultar = OCULTAR_POR_ROL[user?.rol] ?? []
  const visible = id => !ocultar.includes(id)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true)
        const res = await fetch(`${API_URL}/dashboard/?rol=${encodeURIComponent(user?.rol)}`)
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchDashboard()
  }, [user])

  const m = data?.metricas ?? {}

  return (
    <div className="dashboard-container">

      {/* Encabezado */}
      <div className="dashboard-header">
        <h1><i className="fas fa-tachometer-alt" /> Panel de Control</h1>
        <p>Resumen general del sistema — Hola, <strong>{user?.nombre || user?.username}</strong></p>
      </div>

      {error && (
        <div className="dash-error">
          <i className="fas fa-exclamation-triangle" /> No se pudieron cargar los datos: {error}
        </div>
      )}

      {/* Tarjetas de métricas */}
      <div className="metrics-grid">
        <MetricCard icon="fa-boxes"   valor={m.total_productos}    label="Productos Totales" />
        <MetricCard icon="fa-cubes"   valor={m.productos_con_stock} label="Productos con Stock" />

        {visible('card-ventas-dia') && (
          <MetricCard icon="fa-calendar-day" valor={m.ventas_dia != null ? `$${Number(m.ventas_dia).toLocaleString()}` : null} label="Ventas del Día" />
        )}
        {visible('card-ventas-mes') && (
          <MetricCard icon="fa-chart-line" valor={m.ventas_mes != null ? `$${Number(m.ventas_mes).toLocaleString()}` : null} label="Ventas del Mes" />
        )}
        {visible('card-total-clientes') && (
          <MetricCard icon="fa-users" valor={m.total_clientes} label="Clientes Activos" />
        )}
        <MetricCard icon="fa-exclamation-triangle" iconClass="warning" valor={m.alertas_stock} label="Alertas de Stock" />
      </div>

      {/* Contenido principal */}
      <div className="dashboard-content">

        {/* Alertas de stock */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3><i className="fas fa-exclamation-circle" /> Alertas de Stock</h3>
          </div>
          <div className="section-body">
            {loading ? (
              <p className="no-data">Cargando...</p>
            ) : data?.alertas_stock?.length ? (
              data.alertas_stock.map((a, i) => (
                <div key={i} className="alerta-item">
                  <div className="alerta-icon"><i className="fas fa-warning" /></div>
                  <div className="alerta-info">
                    <strong>{a.nombre}</strong>
                    <span>Stock: {a.stock_actual} — Mínimo: {a.stock_minimo}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-alerts">
                <i className="fas fa-check-circle" />
                <p>Sin alertas de stock</p>
              </div>
            )}
          </div>
        </div>

        {/* Ventas recientes */}
        {visible('seccion-ventas-recientes') && (
          <div className="dashboard-section">
            <div className="section-header">
              <h3><i className="fas fa-shopping-bag" /> Ventas Recientes</h3>
            </div>
            <div className="section-body">
              {loading ? (
                <p className="no-data">Cargando...</p>
              ) : data?.ventas_recientes?.length ? (
                data.ventas_recientes.map((v, i) => (
                  <div key={i} className="venta-item">
                    <div className="venta-info">
                      <strong>{v.cliente || 'Cliente'}</strong>
                      <span>{v.fecha}</span>
                    </div>
                    <span className="venta-total">${Number(v.total).toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div className="no-data"><i className="fas fa-inbox" /><p>Sin ventas recientes</p></div>
              )}
            </div>
          </div>
        )}

        {/* Top productos */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3><i className="fas fa-star" /> Productos Más Vendidos</h3>
          </div>
          <div className="section-body">
            {loading ? (
              <p className="no-data">Cargando...</p>
            ) : data?.top_productos?.length ? (
              data.top_productos.map((p, i) => (
                <div key={i} className="producto-item">
                  <div className="producto-rank">{i + 1}</div>
                  <div className="producto-info">
                    <strong>{p.nombre}</strong>
                    <span>{p.total_vendido} unidades</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data"><i className="fas fa-inbox" /><p>Sin datos</p></div>
            )}
          </div>
        </div>

      </div>

      {/* Acciones rápidas */}
      <div className="quick-actions">
        <h3>Acciones Rápidas</h3>
        <div className="actions-grid">
          {visible('card-ventas-dia') && (
            <button className="action-btn">
              <i className="fas fa-plus-circle" /><span>Nueva Venta</span>
            </button>
          )}
          <button className="action-btn">
            <i className="fas fa-boxes" /><span>Ver Inventario</span>
          </button>
          {visible('seccion-compras') && (
            <button className="action-btn">
              <i className="fas fa-cart-plus" /><span>Nueva Compra</span>
            </button>
          )}
          <button className="action-btn">
            <i className="fas fa-users" /><span>Ver Clientes</span>
          </button>
        </div>
      </div>

    </div>
  )
}
