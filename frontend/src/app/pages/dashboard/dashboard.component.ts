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
  imports: [CommonModule, LayoutComponent, RouterLink], // ← Elimina CurrencyPipe de imports
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private dashSvc = inject(DashboardService);
  public auth = inject(AuthService);
  
  // Referencias a los canvas para gráficas
  @ViewChild('ventasChart') ventasChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pagosChart') pagosChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockChart') stockChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vendedoresChart') vendedoresChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  data = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  
  // Instancias de gráficas
  private ventasChart: Chart | null = null;
  private pagosChart: Chart | null = null;
  private stockChart: Chart | null = null;
  private vendedoresChart: Chart | null = null;
  
  // Computed para ventas filtradas por rol
  ventasFiltradas = computed(() => {
    const ventas = this.data()?.ventas_recientes || [];
    const currentUser = this.auth.currentUser();
    
    if (currentUser?.rol === 'Vendedor') {
      return ventas.filter((v: any) => v.vendedor === currentUser.nombre);
    }
    return ventas;
  });
  
  // Restricciones por rol (igual que en el JS original)
  private ocultarPorRol: Record<string, string[]> = {
    Vendedor: [
      'seccion-top-vendedores',
      'seccion-mejor-vendedor',
      'seccion-compras',
      'seccion-margen',
      'seccion-proveedores',
      'card-total-clientes',
    ],
    Bodega: [
      'seccion-top-vendedores',
      'seccion-mejor-vendedor',
      'seccion-ventas-recientes',
      'card-ventas-mes',
      'card-total-ventas',
      'card-ventas-dia',
      'seccion-compras',
      'seccion-margen',
    ],
    Supervisor: [
      'seccion-compras',
      'seccion-margen',
      'seccion-proveedores',
      'seccion-top-vendedores',
      'seccion-mejor-vendedor',
    ],
  };
  
  visible = (id: string): boolean => {
    const rol = this.auth.currentUser()?.rol ?? '';
    const ocultar = this.ocultarPorRol[rol] ?? [];
    return !ocultar.includes(id);
  };
  
  today = computed(() =>
    new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );
  
  ngOnInit(): void {
    this.loadData();
  }
  
  ngAfterViewInit(): void {
    // Las gráficas se inicializan cuando hay datos
  }
  
  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.dashSvc.getDashboardData().subscribe({
      next: (response) => {
        console.log('Dashboard data:', response);
        this.data.set(response);
        this.loading.set(false);
        
        // Inicializar gráficas después de tener datos
        setTimeout(() => this.inicializarGraficas(), 100);
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.error.set(err.message || 'Error al cargar los datos');
        this.loading.set(false);
      }
    });
  }
  
  inicializarGraficas(): void {
    const data = this.data();
    if (!data) return;
    
    this.crearGraficaVentas(data.ventas_por_mes);
    this.crearGraficaPagos(data.metodos_pago);
    this.crearGraficaStock(data.estado_stock);
    this.crearGraficaVendedores(data.top_vendedores);
  }
  
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
          y: {
            beginAtZero: true,
            ticks: { callback: (v: any) => '$' + v.toLocaleString('es-CO') }
          }
        }
      }
    });
  }
  
  crearGraficaPagos(metodosPago: any[]): void {
    if (!this.pagosChartCanvas) return;
    
    if (this.pagosChart) this.pagosChart.destroy();
    
    if (!metodosPago?.length) {
      return;
    }
    
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
                const pct = Math.round((context.raw / total) * 100);
                return `${context.label}: $${context.raw.toLocaleString('es-CO')} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
  
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
          y: {
            beginAtZero: true,
            ticks: { callback: (v: any) => '$' + v.toLocaleString('es-CO') }
          },
          x: { grid: { display: false } }
        }
      }
    });
  }
  
  formatPeso(valor: number): string {
    return `$${(valor || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  getStockColor(valor: number): string {
    return valor > 0 ? '#e74c3c' : '#28a745';
  }
  
  getMargenColor(valor: number): string {
    return valor >= 0 ? '#28a745' : '#e74c3c';
  }
}
/*
 * Pantalla de dashboard.
 * Consume métricas, gráficos y resúmenes operativos para mostrar el estado general del ERP.
 */
