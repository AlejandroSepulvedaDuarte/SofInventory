/**
 * @component DashboardComponent
 * @description
 * Panel de control principal del ERP. Consume un único endpoint (getDashboardData)
 * que devuelve métricas KPI, datos para cuatro gráficas (Chart.js), ventas recientes,
 * alertas de stock, mejor vendedor y top de productos.
 *
 * La visibilidad de cada sección se controla por rol mediante visible() y el mapa
 * ocultarPorRol. Las gráficas se crean tras recibir los datos usando referencias
 * de template (@ViewChild); se destruyen antes de recrearse para evitar duplicados.
 */
import { Component, OnInit, signal, computed, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LayoutComponent } from '../../shared/components/layout.component';
import { DashboardService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LayoutComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit {

  // ── Servicios ────────────────────────────────────────────────────────────
  private dashSvc = inject(DashboardService);
  public auth     = inject(AuthService); // público para accederlo desde el template

  // ── Referencias a canvas de gráficas ────────────────────────────────────
  @ViewChild('ventasChart')    ventasChartCanvas!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('pagosChart')     pagosChartCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('stockChart')     stockChartCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('vendedoresChart') vendedoresChartCanvas!: ElementRef<HTMLCanvasElement>;

  // ── Signals ──────────────────────────────────────────────────────────────
  data    = signal<any>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  // ── Instancias de Chart.js (se destruyen antes de recrearse) ─────────────
  private ventasChart:    Chart | null = null;
  private pagosChart:     Chart | null = null;
  private stockChart:     Chart | null = null;
  private vendedoresChart: Chart | null = null;

  // ── Computed ─────────────────────────────────────────────────────────────

  /**
   * Filtra las ventas recientes por rol: el Vendedor solo ve las propias;
   * los demás roles ven todas.
   */
  ventasFiltradas = computed(() => {
    const ventas       = this.data()?.ventas_recientes || [];
    const currentUser  = this.auth.currentUser();
    if (currentUser?.rol === 'Vendedor') {
      return ventas.filter((v: any) => v.vendedor === currentUser.nombre);
    }
    return ventas;
  });

  /** Fecha actual formateada en español colombiano para el encabezado. */
  today = computed(() =>
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );

  // ── Control de visibilidad por rol ───────────────────────────────────────

  /**
   * Secciones ocultas por rol. Debe mantenerse sincronizado con los IDs
   * usados en el template (*ngIf="visible('id-seccion')").
   */
  private ocultarPorRol: Record<string, string[]> = {
    Vendedor: [
      'seccion-top-vendedores', 'seccion-mejor-vendedor', 'seccion-compras',
      'seccion-margen', 'seccion-proveedores', 'card-total-clientes',
    ],
    Bodega: [
      'seccion-top-vendedores', 'seccion-mejor-vendedor', 'seccion-ventas-recientes',
      'card-ventas-mes', 'card-total-ventas', 'card-ventas-dia',
      'seccion-compras', 'seccion-margen',
    ],
    Supervisor: [
      'seccion-compras', 'seccion-margen', 'seccion-proveedores',
      'seccion-top-vendedores', 'seccion-mejor-vendedor',
    ],
  };

  /** Retorna true si la sección es visible para el rol activo. */
  visible = (id: string): boolean => {
    const rol     = this.auth.currentUser()?.rol ?? '';
    const ocultar = this.ocultarPorRol[rol] ?? [];
    return !ocultar.includes(id);
  };

  // ── Ciclo de vida ────────────────────────────────────────────────────────

  ngOnInit(): void { this.loadData(); }

  /** AfterViewInit está implementado porque Chart.js requiere que el DOM exista;
   *  la inicialización real ocurre en loadData() tras recibir los datos. */
  ngAfterViewInit(): void {}

  // ── Carga de datos ───────────────────────────────────────────────────────

  /**
   * Consulta el endpoint del dashboard y, una vez con datos, inicializa las gráficas.
   * El setTimeout(100) garantiza que Angular haya renderizado los <canvas> antes
   * de que Chart.js intente acceder a ellos.
   */
  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashSvc.getDashboardData().subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
        setTimeout(() => this.inicializarGraficas(), 100);
      },
      error: (err) => {
        this.error.set(err.message || 'Error al cargar los datos');
        this.loading.set(false);
      }
    });
  }

  // ── Gráficas ─────────────────────────────────────────────────────────────

  /** Orquesta la creación de las cuatro gráficas una vez que data() tiene valor. */
  inicializarGraficas(): void {
    const data = this.data();
    if (!data) return;
    this.crearGraficaVentas(data.ventas_por_mes);
    this.crearGraficaPagos(data.metodos_pago);
    this.crearGraficaStock(data.estado_stock);
    this.crearGraficaVendedores(data.top_vendedores);
  }

  /**
   * Línea de ventas mensuales. El tooltip muestra monto y cantidad de ventas
   * del mes consultando el array original por índice.
   */
  crearGraficaVentas(ventasPorMes: any[]): void {
    if (!this.ventasChartCanvas || !ventasPorMes?.length) return;
    if (this.ventasChart) this.ventasChart.destroy();

    this.ventasChart = new Chart(this.ventasChartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ventasPorMes.map(v => v.mes),
        datasets: [{
          label: 'Ventas ($)',
          data: ventasPorMes.map(v => v.total),
          borderColor: '#262B50',
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
              label: (context: any) => {
                const idx = context.dataIndex;
                return `$${context.raw.toLocaleString('es-CO')} — ${ventasPorMes[idx]?.cantidad || 0} ventas`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v: any) => '$' + v.toLocaleString('es-CO') } }
        }
      }
    });
  }

  /**
   * Dona de métodos de pago. El tooltip incluye monto y porcentaje sobre el total.
   * Si no hay datos, sale sin crear la gráfica para no dejar un canvas vacío.
   */
  crearGraficaPagos(metodosPago: any[]): void {
    if (!this.pagosChartCanvas) return;
    if (this.pagosChart) this.pagosChart.destroy();
    if (!metodosPago?.length) return;

    const colores = ['#262B50', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#fd7e14', '#6f42c1'];

    this.pagosChart = new Chart(this.pagosChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: metodosPago.map(m => m.metodo),
        datasets: [{
          data: metodosPago.map(m => m.total),
          backgroundColor: colores.slice(0, metodosPago.length),
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
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const pct   = Math.round((context.raw / total) * 100);
                return `${context.label}: $${context.raw.toLocaleString('es-CO')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /** Barras de estado de stock: Agotados (rojo), Stock Bajo (amarillo), Normal (verde). */
  crearGraficaStock(estadoStock: any): void {
    if (!this.stockChartCanvas || !estadoStock) return;
    if (this.stockChart) this.stockChart.destroy();

    this.stockChart = new Chart(this.stockChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Agotados', 'Stock Bajo', 'Stock Normal'],
        datasets: [{
          label: 'Productos',
          data: [estadoStock.agotados || 0, estadoStock.stock_bajo || 0, estadoStock.stock_normal || 0],
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

  /**
   * Barras de top vendedores. Usa solo el primer nombre para etiquetas cortas.
   * El tooltip muestra monto total y número de transacciones.
   */
  crearGraficaVendedores(topVendedores: any[]): void {
    if (!this.vendedoresChartCanvas || !topVendedores?.length) return;
    if (this.vendedoresChart) this.vendedoresChart.destroy();

    const colores = ['#262B50', '#17a2b8', '#28a745', '#ffc107', '#dc3545'];

    this.vendedoresChart = new Chart(this.vendedoresChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: topVendedores.map(v => v.nombre?.split(' ')[0] || v.nombre),
        datasets: [{
          label: 'Ventas ($)',
          data: topVendedores.map(v => v.total),
          backgroundColor: colores.slice(0, topVendedores.length),
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
              label: (context: any) => {
                const v = topVendedores[context.dataIndex];
                return [`$${v.total.toLocaleString('es-CO')}`, `${v.ventas} transacciones`];
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v: any) => '$' + v.toLocaleString('es-CO') } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // ── Utilidades de presentación ───────────────────────────────────────────

  /** Formatea un número como peso colombiano sin decimales (ej. $1.250.000). */
  formatPeso(valor: number): string {
    return `$${(valor || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  /** Rojo si hay productos con stock bajo; verde si el indicador es 0. */
  getStockColor(valor: number): string {
    return valor > 0 ? '#e74c3c' : '#28a745';
  }

  /** Verde si el margen es positivo o cero; rojo si es negativo. */
  getMargenColor(valor: number): string {
    return valor >= 0 ? '#28a745' : '#e74c3c';
  }
}