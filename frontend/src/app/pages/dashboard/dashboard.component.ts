import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Chart from 'chart.js/auto';

import {
  DashboardData,
  IndicadorPeriodo,
  PeriodoDashboard,
  RangoGraficaDashboard,
  SerieOperacionesDashboard,
} from '../../core/models';
import { DashboardService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { LayoutComponent } from '../../shared/components/layout.component';

type PeriodoMargen = Exclude<PeriodoDashboard, 'total'>;

const INDICADOR_VACIO: IndicadorPeriodo = {
  valor: 0,
  cantidad: 0,
  comparacion: {
    disponible: false,
    porcentaje: null,
    direccion: 'sin_datos',
    valor_anterior: 0,
    texto: 'Sin datos del periodo anterior para comparar',
  },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LayoutComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dashSvc = inject(DashboardService);
  readonly auth = inject(AuthService);

  @ViewChild('operacionesChart') operacionesChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pagosChart') pagosChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stockChart') stockChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('vendedoresChart') vendedoresChartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly periodoVentas = signal<PeriodoDashboard>('mes');
  readonly periodoCompras = signal<PeriodoDashboard>('mes');
  readonly periodoMargen = signal<PeriodoMargen>('mes');
  readonly rangoGrafica = signal<RangoGraficaDashboard>('mes');

  readonly periodosOperaciones: ReadonlyArray<{
    clave: PeriodoDashboard;
    etiqueta: string;
  }> = [
    { clave: 'hoy', etiqueta: 'Hoy' },
    { clave: 'semana', etiqueta: 'Semana' },
    { clave: 'mes', etiqueta: 'Mes' },
    { clave: 'anio', etiqueta: 'Año' },
    { clave: 'total', etiqueta: 'Total' },
  ];

  readonly periodosMargenOpciones: ReadonlyArray<{
    clave: PeriodoMargen;
    etiqueta: string;
  }> = this.periodosOperaciones.filter(
    (opcion): opcion is { clave: PeriodoMargen; etiqueta: string } =>
      opcion.clave !== 'total'
  );

  readonly rangosGrafica: ReadonlyArray<{
    clave: RangoGraficaDashboard;
    etiqueta: string;
  }> = [
    { clave: 'siete_dias', etiqueta: '7 días' },
    { clave: 'mes', etiqueta: 'Mes actual' },
    { clave: 'anio', etiqueta: 'Año actual' },
  ];

  readonly ventasSeleccionadas = computed(
    () => this.data()?.periodos.ventas[this.periodoVentas()] ?? INDICADOR_VACIO
  );
  readonly comprasSeleccionadas = computed(
    () => this.data()?.periodos.compras[this.periodoCompras()] ?? INDICADOR_VACIO
  );
  readonly margenSeleccionado = computed(
    () => this.data()?.periodos.margen[this.periodoMargen()] ?? INDICADOR_VACIO
  );

  readonly ventasFiltradas = computed(() => {
    const ventas = this.data()?.ventas_recientes ?? [];
    const usuario = this.auth.currentUser();
    return usuario?.rol === 'Vendedor'
      ? ventas.filter(venta => venta.vendedor === usuario.nombre)
      : ventas;
  });

  readonly today = computed(() =>
    new Date().toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  );

  private operacionesChart: Chart | null = null;
  private pagosChart: Chart | null = null;
  private stockChart: Chart | null = null;
  private vendedoresChart: Chart | null = null;

  private readonly ocultarPorRol: Record<string, string[]> = {
    Vendedor: [
      'seccion-top-vendedores', 'seccion-mejor-vendedor', 'seccion-compras',
      'seccion-margen', 'seccion-proveedores', 'card-total-clientes',
    ],
    Bodega: [
      'seccion-top-vendedores', 'seccion-mejor-vendedor', 'seccion-ventas-recientes',
      'seccion-ventas', 'card-ventas-mes', 'card-total-ventas', 'card-ventas-dia',
      'seccion-compras', 'seccion-margen',
    ],
    Supervisor: [
      'seccion-compras', 'seccion-margen', 'seccion-proveedores',
      'seccion-top-vendedores', 'seccion-mejor-vendedor',
    ],
  };

  readonly visible = (id: string): boolean => {
    const rol = this.auth.currentUser()?.rol ?? '';
    return !(this.ocultarPorRol[rol] ?? []).includes(id);
  };

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.operacionesChart?.destroy();
    this.pagosChart?.destroy();
    this.stockChart?.destroy();
    this.vendedoresChart?.destroy();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.dashSvc.getDashboardData().subscribe({
      next: response => {
        this.data.set(response);
        this.loading.set(false);
        setTimeout(() => this.inicializarGraficas(), 50);
      },
      error: err => {
        this.error.set(err.message || 'Error al cargar los datos');
        this.loading.set(false);
      },
    });
  }

  seleccionarPeriodoVentas(periodo: PeriodoDashboard): void {
    this.periodoVentas.set(periodo);
  }

  seleccionarPeriodoCompras(periodo: PeriodoDashboard): void {
    this.periodoCompras.set(periodo);
  }

  seleccionarPeriodoMargen(periodo: PeriodoMargen): void {
    this.periodoMargen.set(periodo);
  }

  seleccionarRangoGrafica(rango: RangoGraficaDashboard): void {
    this.rangoGrafica.set(rango);
    const serie = this.data()?.graficas.operaciones[rango];
    if (serie) this.crearGraficaOperaciones(serie);
  }

  inicializarGraficas(): void {
    const datos = this.data();
    if (!datos) return;
    this.crearGraficaOperaciones(datos.graficas.operaciones[this.rangoGrafica()]);
    this.crearGraficaPagos(datos.metodos_pago);
    this.crearGraficaStock(datos.estado_stock);
    this.crearGraficaVendedores(datos.top_vendedores);
  }

  private crearGraficaOperaciones(serie: SerieOperacionesDashboard): void {
    if (!this.operacionesChartCanvas || !serie) return;
    this.operacionesChart?.destroy();
    this.operacionesChart = new Chart(this.operacionesChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: serie.labels,
        datasets: [
          {
            label: 'Ventas', data: serie.ventas, backgroundColor: '#22d3c8',
            borderColor: '#14b8a6', borderWidth: 1, borderRadius: 5,
          },
          {
            label: 'Compras', data: serie.compras, backgroundColor: '#818cf8',
            borderColor: '#6366f1', borderWidth: 1, borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: context => {
                const indice = context.dataIndex;
                const ventas = context.datasetIndex === 0;
                const cantidad = ventas
                  ? serie.cantidad_ventas[indice]
                  : serie.cantidad_compras[indice];
                const nombre = ventas ? 'ventas' : 'compras';
                return `${context.dataset.label}: ${this.formatPeso(Number(context.raw))} · ${cantidad} ${nombre}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: valor => this.formatEje(Number(valor)) },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  private crearGraficaPagos(
    metodos: Array<{ metodo: string; total: number; cantidad: number }>
  ): void {
    if (!this.pagosChartCanvas) return;
    this.pagosChart?.destroy();
    if (!metodos.length) return;
    const colores = ['#262B50', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#fd7e14', '#6f42c1'];
    this.pagosChart = new Chart(this.pagosChartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: metodos.map(metodo => metodo.metodo),
        datasets: [{
          data: metodos.map(metodo => metodo.total),
          backgroundColor: colores.slice(0, metodos.length), borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: context => {
                const total = (context.dataset.data as number[])
                  .reduce((suma, valor) => suma + valor, 0);
                const porcentaje = total ? Math.round(Number(context.raw) / total * 100) : 0;
                return `${context.label}: ${this.formatPeso(Number(context.raw))} (${porcentaje}%)`;
              },
            },
          },
        },
      },
    });
  }

  private crearGraficaStock(
    stock: { agotados: number; stock_bajo: number; stock_normal: number }
  ): void {
    if (!this.stockChartCanvas) return;
    this.stockChart?.destroy();
    this.stockChart = new Chart(this.stockChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Agotados', 'Stock bajo', 'Stock normal'],
        datasets: [{
          label: 'Productos',
          data: [stock.agotados, stock.stock_bajo, stock.stock_normal],
          backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
          borderRadius: 6, borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  private crearGraficaVendedores(
    vendedores: Array<{ nombre: string; total: number; ventas: number }>
  ): void {
    if (!this.vendedoresChartCanvas) return;
    this.vendedoresChart?.destroy();
    if (!vendedores.length) return;
    const colores = ['#262B50', '#17a2b8', '#28a745', '#ffc107', '#dc3545'];
    this.vendedoresChart = new Chart(this.vendedoresChartCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: vendedores.map(v => v.nombre?.split(' ')[0] || v.nombre),
        datasets: [{
          label: 'Ventas', data: vendedores.map(v => v.total),
          backgroundColor: colores.slice(0, vendedores.length),
          borderRadius: 6, borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => {
                const vendedor = vendedores[context.dataIndex];
                return [this.formatPeso(vendedor.total), `${vendedor.ventas} transacciones`];
              },
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => this.formatEje(Number(v)) } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  formatPeso(valor: number | null | undefined): string {
    return `$${Math.round(Number(valor) || 0).toLocaleString('es-CO')}`;
  }

  formatPesoAdaptado(valor: number | null | undefined): string {
    const numero = Number(valor) || 0;
    const completo = this.formatPeso(numero);
    if (completo.length <= 16 || Math.abs(numero) < 1_000_000_000) return completo;
    const milesDeMillones = numero / 1_000_000_000;
    return `$${milesDeMillones.toLocaleString('es-CO', {
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    })} mil M`;
  }

  private formatEje(valor: number): string {
    const absoluto = Math.abs(valor);
    if (absoluto >= 1_000_000_000) return `$${(valor / 1_000_000_000).toLocaleString('es-CO')} mil M`;
    if (absoluto >= 1_000_000) return `$${(valor / 1_000_000).toLocaleString('es-CO')} M`;
    if (absoluto >= 1_000) return `$${(valor / 1_000).toLocaleString('es-CO')} mil`;
    return this.formatPeso(valor);
  }

  claseComparacion(indicador: IndicadorPeriodo, neutral = false): string {
    if (neutral && indicador.comparacion.disponible) return 'neutral';
    return indicador.comparacion.direccion;
  }

  getStockColor(valor: number): string {
    return valor > 0 ? '#e74c3c' : '#28a745';
  }

  getMargenColor(valor: number): string {
    return valor >= 0 ? '#28a745' : '#e74c3c';
  }
}
