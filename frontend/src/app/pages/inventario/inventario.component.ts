/**
 * @component InventarioComponent
 * @description
 * Pantalla de inventario organizada en cuatro pestañas controladas por el signal tab():
 * - stock:      lista consolidada de productos con nivel de inventario actual.
 * - alertas:    productos cuyo stock_actual está por debajo del stock_minimo.
 * - almacenes:  CRUD de almacenes con modal reutilizable (crear / editar).
 * - movimiento: formulario rápido para registrar entradas, salidas o ajustes manuales.
 *
 * Todos los datos se cargan en paralelo en ngOnInit(); solo el stock se recarga
 * tras registrar un movimiento para reflejar el cambio sin recargar toda la pantalla.
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { InventarioService, ProductosService } from '../../core/services/api.services';
import { Almacen, MovimientoInventarioRequest, Producto } from '../../core/models';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css'],
})
export class InventarioComponent implements OnInit {

  // ── Navegación ───────────────────────────────────────────────────────────
  tab = signal<'stock' | 'alertas' | 'almacenes' | 'movimiento'>('stock');

  // ── Datos de inventario ──────────────────────────────────────────────────
  stock        = signal<any[]>([]);
  estadisticas = signal<any>(null);
  alertas      = signal<any[]>([]);
  almacenes    = signal<Almacen[]>([]);
  productos    = signal<Producto[]>([]); // catálogo para el select de movimientos

  // ── Estado del modal de almacén ──────────────────────────────────────────
  showAlmacenModal = signal(false);
  /** null = modo creación; Almacen = modo edición. */
  editingAlmacen   = signal<Almacen | null>(null);
  almacenSaving    = signal(false);
  almacenError     = signal('');
  almacenForm: Partial<Almacen> = {};

  // ── Estado del formulario de movimiento ──────────────────────────────────
  movForm: MovimientoInventarioRequest = {
    producto_id: '',
    almacen_id: '',
    almacen_destino_id: null,
    tipo: 'entrada',
    cantidad: 1,
    observacion: ''
  };
  movSaving  = signal(false);
  movError   = signal('');
  /** Mensaje de confirmación; se muestra tras registrar y se limpia al siguiente envío. */
  movSuccess = signal('');

  // ── Utilidad ─────────────────────────────────────────────────────────────
  /** Devuelve las claves numéricas de estadisticas(); útil para renderizado dinámico. */
  statsKeys = () =>
    Object.keys(this.estadisticas() ?? {}).filter(
      k => typeof this.estadisticas()[k] === 'number'
    );

  // ── Constructor ──────────────────────────────────────────────────────────
  constructor(private svc: InventarioService, private prodSvc: ProductosService) {}

  // ── Ciclo de vida ────────────────────────────────────────────────────────

  /** Carga todos los datos en paralelo al iniciar; el catálogo de productos no se vuelve a pedir. */
  ngOnInit(): void {
    this.loadStock();
    this.svc.estadisticas().subscribe(e => this.estadisticas.set(e));
    this.svc.alertas().subscribe(a => this.alertas.set(a));
    this.svc.listarAlmacenes().subscribe(a => this.almacenes.set(a));
    this.prodSvc.listar().subscribe(p => this.productos.set(p));
  }

  // ── Carga de datos ───────────────────────────────────────────────────────

  /** Recarga solo el stock; se llama al iniciar y tras cada movimiento registrado. */
  loadStock(): void {
    this.svc.listarStock().subscribe(s => this.stock.set(s));
  }

  almacenesActivos(): Almacen[] {
    return this.almacenes().filter(a => a.estado === 'activo');
  }

  porcentajeAlerta(alerta: any): number {
    if (!alerta.stock_minimo) return alerta.stock_actual === 0 ? 0 : 100;
    return Math.min(100, (alerta.stock_actual / alerta.stock_minimo) * 100);
  }

  private recargarInventario(): void {
    this.loadStock();
    this.svc.estadisticas().subscribe(e => this.estadisticas.set(e));
    this.svc.alertas().subscribe(a => this.alertas.set(a));
    this.prodSvc.listar().subscribe(p => this.productos.set(p));
  }

  // ── Modal de almacén ─────────────────────────────────────────────────────

  /** Sin argumento abre en modo creación; con almacén clona sus datos para edición. */
  openAlmacenModal(a?: Almacen): void {
    this.editingAlmacen.set(a ?? null);
    this.almacenForm = a ? { ...a } : { nombre: '', codigo: '', direccion: '' };
    this.almacenError.set('');
    this.showAlmacenModal.set(true);
  }

  closeAlmacenModal(): void { this.showAlmacenModal.set(false); }

  /**
   * Crea o edita el almacén según editingAlmacen().
   * Tras el éxito recarga la lista de almacenes y cierra el modal.
   * El error solo desactiva almacenSaving(); no muestra mensaje (pendiente de mejora).
   */
  saveAlmacen(): void {
    this.almacenSaving.set(true);
    const req = this.editingAlmacen()
      ? this.svc.editarAlmacen(this.editingAlmacen()!.id!, this.almacenForm)
      : this.svc.crearAlmacen(this.almacenForm);

    req.subscribe({
      next: () => {
        this.svc.listarAlmacenes().subscribe(a => this.almacenes.set(a));
        this.closeAlmacenModal();
        this.almacenSaving.set(false);
      },
      error: (e) => {
        const err = e.error;
        if (typeof err === 'object') {
          this.almacenError.set(Object.values(err).flat().join(' '));
        } else {
          this.almacenError.set(err ?? 'Error al guardar el almacén.');
        }
        this.almacenSaving.set(false);
      },
    });
  }

  /** Pide confirmación y elimina el almacén; recarga la lista tras el éxito. */
  eliminarAlmacen(a: Almacen): void {
    if (!confirm(`¿Eliminar almacén "${a.nombre}"?`)) return;
    this.svc.eliminarAlmacen(a.id!).subscribe(() =>
      this.svc.listarAlmacenes().subscribe(al => this.almacenes.set(al))
    );
  }

  // ── Movimiento de stock ──────────────────────────────────────────────────
  /**
   * Valida, envía el movimiento y recarga el stock.
   * Tras el éxito limpia el formulario y muestra movSuccess();
   * el template lo oculta en el siguiente envío al limpiar el signal.
   */
  registrarMovimiento(): void {
    if (!this.movForm.producto_id || !this.movForm.almacen_id || !this.movForm.cantidad) {
      this.movError.set('Completa todos los campos obligatorios.');
      return;
    }
    if (this.movForm.tipo === 'transferencia' && !this.movForm.almacen_destino_id) {
      this.movError.set('Selecciona el almacén destino.');
      return;
    }

    this.movSaving.set(true);
    this.movError.set('');
    this.movSuccess.set('');

    this.svc.movimientoRapido(this.movForm).subscribe({
      next: () => {
        this.movSuccess.set('Movimiento registrado correctamente.');
        this.movSaving.set(false);
        this.movForm = {
          producto_id: '',
          almacen_id: '',
          almacen_destino_id: null,
          tipo: 'entrada',
          cantidad: 1,
          observacion: ''
        };
        this.recargarInventario();
      },
      error: (e) => {
        this.movError.set(e.error?.error ?? 'Error');
        this.movSaving.set(false);
      },
    });
  }
}
