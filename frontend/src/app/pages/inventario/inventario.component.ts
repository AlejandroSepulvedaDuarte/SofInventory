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
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import { commercialNameError, normalizeSemanticText } from '../../shared/forms/semantic-validators';
import { NotificationService } from '../../shared/notifications/notification.service';
import { FormHelpComponent } from '../../shared/form-help/form-help.component';
import { FORM_HELP_CONTENT } from '../../shared/form-help/form-help-content';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective, FormHelpComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css'],
})
export class InventarioComponent implements OnInit {
  readonly warehouseHelp = FORM_HELP_CONTENT.warehouse;
  readonly movementHelp = {
    entrada: FORM_HELP_CONTENT.inventoryEntry,
    salida: FORM_HELP_CONTENT.inventoryExit,
    transferencia: FORM_HELP_CONTENT.inventoryTransfer,
  } as const;

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
  readonly almacenValidation: FormFeedbackState;
  highlightedAlmacenId = signal<number | null>(null);
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
  readonly movValidation: FormFeedbackState;

  // ── Utilidad ─────────────────────────────────────────────────────────────
  /** Devuelve las claves numéricas de estadisticas(); útil para renderizado dinámico. */
  statsKeys = () =>
    Object.keys(this.estadisticas() ?? {}).filter(
      k => typeof this.estadisticas()[k] === 'number'
    );

  // ── Constructor ──────────────────────────────────────────────────────────
  constructor(
    private svc: InventarioService,
    private prodSvc: ProductosService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.almacenValidation = new FormFeedbackState(feedback, 'No fue posible guardar el almacén. Revisa los campos señalados.', '.warehouse-form-modal');
    this.movValidation = new FormFeedbackState(feedback, 'No fue posible registrar el movimiento. Revisa los campos señalados.', '.movimiento-form');
  }

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
    this.almacenValidation.clear();
    this.showAlmacenModal.set(true);
  }

  closeAlmacenModal(): void { if (!this.almacenSaving()) this.showAlmacenModal.set(false); }

  /**
   * Crea o edita el almacén según editingAlmacen().
   * Tras el éxito recarga la lista de almacenes y cierra el modal.
   * El error solo desactiva almacenSaving(); no muestra mensaje (pendiente de mejora).
   */
  saveAlmacen(): void {
    const errors: Record<string, string> = {};
    const nombre = String(this.almacenForm.nombre ?? '');
    const codigo = String(this.almacenForm.codigo ?? '').trim();
    const warehouseNameError = commercialNameError(nombre, 'almacen');
    if (warehouseNameError) errors['nombre'] = warehouseNameError;
    if (!codigo) errors['codigo'] = 'El código es obligatorio.';
    else if (codigo.length < 2 || codigo.length > 10) errors['codigo'] = 'El código debe tener entre 2 y 10 caracteres.';
    if (this.almacenForm.capacidad != null && Number(this.almacenForm.capacidad) < 0) errors['capacidad'] = 'La capacidad no puede ser negativa.';
    if (Object.keys(errors).length) {
      this.almacenValidation.reject(errors);
      return;
    }
    this.almacenValidation.clear();
    this.almacenSaving.set(true);
    this.almacenForm = {
      ...this.almacenForm,
      nombre: normalizeSemanticText(nombre),
      codigo,
    };
    const req = this.editingAlmacen()
      ? this.svc.editarAlmacen(this.editingAlmacen()!.id!, this.almacenForm)
      : this.svc.crearAlmacen(this.almacenForm);

    req.subscribe({
      next: (response) => {
        const wasEditing = Boolean(this.editingAlmacen());
        const id = Number(response?.id ?? this.editingAlmacen()?.id ?? 0) || null;
        this.svc.listarAlmacenes().subscribe(a => this.almacenes.set(a));
        this.almacenSaving.set(false);
        this.showAlmacenModal.set(false);
        this.notifications.success(`Almacén ${wasEditing ? 'actualizado' : 'registrado'} satisfactoriamente.`);
        this.highlightAlmacen(id);
      },
      error: (e) => {
        this.almacenValidation.fromHttp(e);
        this.almacenSaving.set(false);
      },
    });
  }

  /** Pide confirmación y elimina el almacén; recarga la lista tras el éxito. */
  eliminarAlmacen(a: Almacen): void {
    if (!confirm(`¿Eliminar almacén "${a.nombre}"?`)) return;
    this.svc.eliminarAlmacen(a.id!).subscribe({
      next: () => {
        this.svc.listarAlmacenes().subscribe(al => this.almacenes.set(al));
        this.notifications.success('Almacén eliminado satisfactoriamente.');
      },
      error: (error) => this.notifications.error((error as any)?.error?.error ?? 'No fue posible eliminar el almacén.'),
    });
  }

  // ── Movimiento de stock ──────────────────────────────────────────────────
  /**
   * Valida, envía el movimiento y recarga el stock.
   * Tras el éxito limpia el formulario y muestra movSuccess();
   * el template lo oculta en el siguiente envío al limpiar el signal.
   */
  registrarMovimiento(): void {
    const errors: Record<string, string> = {};
    if (!this.movForm.producto_id) errors['producto'] = 'Selecciona un producto.';
    if (!this.movForm.almacen_id) errors['almacen'] = 'Selecciona un almacén.';
    if (!this.movForm.cantidad || Number(this.movForm.cantidad) <= 0) errors['cantidad'] = 'La cantidad debe ser mayor que cero.';
    if (this.movForm.tipo === 'transferencia' && !this.movForm.almacen_destino_id) {
      errors['almacen_destino'] = 'Selecciona el almacén destino.';
    }
    if (this.movForm.tipo === 'transferencia' && Number(this.movForm.almacen_destino_id) === Number(this.movForm.almacen_id)) {
      errors['almacen_destino'] = 'El almacén de origen y el de destino deben ser diferentes.';
    }
    if (Object.keys(errors).length) {
      this.movValidation.reject(errors);
      return;
    }

    this.movSaving.set(true);
    this.movValidation.clear();

    this.svc.movimientoRapido(this.movForm).subscribe({
      next: () => {
        this.notifications.success('Movimiento de inventario registrado satisfactoriamente.');
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
        this.movValidation.fromHttp(e);
        this.movSaving.set(false);
      },
    });
  }

  private highlightAlmacen(id: number | null): void {
    if (!id) return;
    this.highlightedAlmacenId.set(id);
    window.setTimeout(() => this.highlightedAlmacenId.set(null), 3500);
  }
}
