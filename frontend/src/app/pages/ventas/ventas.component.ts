import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import {
  ClientesService,
  InventarioService,
  ProductosService,
  VentasService,
} from '../../core/services/api.services';
import { Almacen, Cliente, DetalleVenta, Producto, Venta } from '../../core/models';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="page">
        <!-- Encabezado del módulo con acceso directo al registro de una nueva venta -->
        <div class="page-header">
          <div>
            <h1><i class="fas fa-cash-register"></i> Ventas</h1>
            <p><i class="fas fa-circle-info"></i> {{ ventas().length }} ventas registradas</p>
          </div>
          <button class="btn-primary" (click)="openModal()">
            <i class="fas fa-plus"></i>
            Nueva Venta
          </button>
        </div>

        <!-- Tabla resumen de ventas ya registradas -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th><i class="fas fa-receipt"></i> Venta</th>
                <th><i class="fas fa-user"></i> Cliente</th>
                <th><i class="fas fa-warehouse"></i> Método</th>
                <th><i class="fas fa-sack-dollar"></i> Total</th>
                <th><i class="fas fa-circle-half-stroke"></i> Estado</th>
                <th><i class="fas fa-calendar"></i> Fecha</th>
                <th><i class="fas fa-gear"></i> Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of ventas()">
                <td><code>{{ v.numero_venta }}</code></td>
                <td>{{ v.cliente_nombre || getClienteNombre(v.cliente) }}</td>
                <td>{{ formatMetodoPago(v.metodo_pago) }}</td>
                <td>{{ v.total | currency:'COP':'symbol':'1.0-0' }}</td>
                <td><span class="badge" [class]="v.estado === 'completada' ? 'badge-activo' : 'badge-inactivo'">{{ v.estado }}</span></td>
                <td>{{ v.fecha_creacion | date:'dd/MM/yy HH:mm' }}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon" title="Ver detalle" (click)="verDetalle(v)">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-danger" title="Anular" *ngIf="v.estado !== 'anulada'" (click)="anular(v)">
                      <i class="fas fa-ban"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="ventas().length === 0">
                <td colspan="7" class="empty-row"><i class="fas fa-inbox"></i> No hay ventas registradas</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal principal para capturar cabecera y detalle de la venta -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal modal-xl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2><i class="fas fa-cash-register"></i> Nueva Venta</h2>
              <button class="close-btn" (click)="closeModal()"><i class="fas fa-xmark"></i></button>
            </div>

            <div class="modal-body">
              <!-- Cabecera comercial: cliente, almacén, pago y observaciones -->
              <div class="form-grid">
                <div class="field">
                  <label><i class="fas fa-user"></i> Cliente</label>
                  <select [(ngModel)]="form.cliente">
                    <option [ngValue]="null">Cliente General</option>
                    <option *ngFor="let c of clientes()" [ngValue]="c.id">{{ getClienteNombreObj(c) }}</option>
                  </select>
                </div>

                <div class="field">
                  <label><i class="fas fa-warehouse"></i> Almacén *</label>
                  <select [(ngModel)]="almacenId">
                    <option [ngValue]="null">Seleccionar...</option>
                    <option *ngFor="let a of almacenesActivos()" [ngValue]="a.id">
                      {{ a.codigo ? a.codigo + ' - ' : '' }}{{ a.nombre }}
                    </option>
                  </select>
                </div>

                <div class="field">
                  <label><i class="fas fa-credit-card"></i> Método de Pago *</label>
                  <select [(ngModel)]="form.metodo_pago">
                    <option *ngFor="let m of metodosPago" [ngValue]="m.value">{{ m.label }}</option>
                  </select>
                </div>

                <div class="field">
                  <label><i class="fas fa-percent"></i> Descuento</label>
                  <input type="number" [(ngModel)]="form.descuento" min="0" (input)="recalc()" />
                </div>

                <ng-container *ngIf="form.metodo_pago === 'efectivo'">
                  <div class="field">
                    <label><i class="fas fa-money-bill-wave"></i> Efectivo Recibido</label>
                    <input type="number" [(ngModel)]="form.efectivo_recibido" min="0" (input)="recalc()" />
                  </div>
                  <div class="field">
                    <label><i class="fas fa-arrow-right-arrow-left"></i> Cambio</label>
                    <input type="number" [value]="calcCambioVal()" readonly />
                  </div>
                </ng-container>

                <div class="field full">
                  <label><i class="fas fa-clipboard"></i> Observaciones</label>
                  <textarea [(ngModel)]="form.observaciones" rows="2" placeholder="Observaciones de la venta"></textarea>
                </div>
              </div>

              <!-- Detalle de productos vendidos con cálculo visual de totales -->
              <div class="detalle-section">
                <div class="detalle-header">
                  <div>
                    <h3><i class="fas fa-box-open"></i> Productos</h3>
                    <p>Agrega los productos que formarán parte de la venta.</p>
                  </div>
                  <button type="button" class="btn-secondary btn-sm" (click)="addLinea()">
                    <i class="fas fa-plus"></i> Agregar
                  </button>
                </div>

                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio Unit.</th>
                      <th>Cantidad</th>
                      <th>Stock</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let d of detalles(); let i = index">
                      <td>
                        <select [(ngModel)]="d.producto" (ngModelChange)="onProductoChange(d)" style="width:100%">
                          <option [ngValue]="0">Seleccionar...</option>
                          <option *ngFor="let p of productos()" [ngValue]="p.id">{{ getProductoLabel(p) }}</option>
                        </select>
                      </td>
                      <td><input type="number" [(ngModel)]="d.precio_unitario" min="0" style="width:120px" (input)="recalc()" /></td>
                      <td><input type="number" [(ngModel)]="d.cantidad" min="1" style="width:80px" (input)="recalc()" /></td>
                      <td>{{ getStockProducto(d.producto) }}</td>
                      <td>{{ (d.precio_unitario * d.cantidad) | currency:'COP':'symbol':'1.0-0' }}</td>
                      <td>
                        <button class="btn-icon btn-danger" title="Quitar" (click)="removeLinea(i)">
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="totales">
                  <div>Subtotal: <strong>{{ totales().subtotal | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                  <div>Descuento: <strong>{{ (form.descuento || 0) | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                  <div>IVA estimado: <strong>{{ totales().iva | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                  <div class="total-final">Total: <strong>{{ totales().total | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                </div>
              </div>

              <div class="error-msg" *ngIf="formError()">
                <i class="fas fa-circle-xmark"></i> {{ formError() }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">
                <i class="fas fa-xmark"></i> Cancelar
              </button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                <i class="fas" [class.fa-spinner]="saving()" [class.fa-spin]="saving()" [class.fa-floppy-disk]="!saving()"></i>
                {{ saving() ? 'Registrando...' : 'Registrar Venta' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Modal secundario para consultar el detalle histórico de una venta -->
        <div class="modal-overlay" *ngIf="detalleVenta()" (click)="detalleVenta.set(null)">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2><i class="fas fa-receipt"></i> Venta {{ detalleVenta()?.numero_venta }}</h2>
              <button class="close-btn" (click)="detalleVenta.set(null)">
                <i class="fas fa-xmark"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="detalle-summary">
                <span><strong>Cliente:</strong> {{ detalleVenta()?.cliente_nombre || getClienteNombre(detalleVenta()?.cliente) }}</span>
                <span><strong>Método:</strong> {{ formatMetodoPago(detalleVenta()?.metodo_pago) }}</span>
              </div>
              <table class="data-table">
                <thead>
                  <tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of detalleVenta()!.detalles">
                    <td>{{ getDetalleProductoLabel(d) }}</td>
                    <td>{{ d.cantidad }}</td>
                    <td>{{ d.precio_unitario | currency:'COP':'symbol':'1.0-0' }}</td>
                    <td>{{ d.subtotal | currency:'COP':'symbol':'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="totales detail-totals">
                <div>Subtotal: <strong>{{ detalleVenta()?.subtotal | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                <div>IVA: <strong>{{ detalleVenta()?.iva_monto | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                <div class="total-final">Total: <strong>{{ detalleVenta()?.total | currency:'COP':'symbol':'1.0-0' }}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `,
  styles: [`
    .page { padding: 32px; }
    .page-header h1,
    .page-header p,
    .detalle-header h3,
    .error-msg,
    .detalle-summary span {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-header h1 i,
    .detalle-header h3 i { color: var(--accent); }
    .detalle-section { margin-top: 24px; border-top: 1px solid var(--border); padding-top: 24px; }
    .detalle-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
    .detalle-header h3 { margin: 0; font-size: 15px; color: var(--text-primary); }
    .detalle-header p { margin: 4px 0 0; color: var(--text-muted); font-size: 12px; }
    .totales { display: flex; gap: 24px; justify-content: flex-end; margin-top: 16px; padding: 14px 16px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 10px; font-size: 14px; color: var(--text-secondary); flex-wrap: wrap; }
    .total-final { font-weight: 700; color: var(--text-primary); font-size: 16px; }
    .detail-totals { margin-top: 16px; }
    .detalle-summary { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 16px; color: var(--text-secondary); }
    .error-msg { margin-top: 12px; }
  `],
})
export class VentasComponent implements OnInit {
  ventas = signal<Venta[]>([]);
  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  almacenes = signal<Almacen[]>([]);
  showModal = signal(false);
  detalleVenta = signal<Venta | null>(null);
  saving = signal(false);
  formError = signal('');
  form: Partial<Venta> = {};
  detalles = signal<DetalleVenta[]>([]);
  totales = signal({ subtotal: 0, iva: 0, total: 0 });
  almacenId: number | null = null;

  metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'debito', label: 'Tarjeta Débito' },
    { value: 'credito', label: 'Tarjeta Crédito' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'DaviPlata' },
    { value: 'otro', label: 'Otro' },
  ];

  constructor(
    private svc: VentasService,
    private cliSvc: ClientesService,
    private prodSvc: ProductosService,
    private invSvc: InventarioService
  ) {}

  ngOnInit(): void {
    this.load();
    this.cliSvc.listar().subscribe((clientes) => this.clientes.set(clientes));
    this.prodSvc.listar().subscribe((productos) => this.productos.set(productos));
    this.invSvc.listarAlmacenes().subscribe((almacenes) => this.almacenes.set(almacenes));
  }

  load(): void {
    this.svc.listar().subscribe((ventas) => this.ventas.set(ventas));
  }

  almacenesActivos(): Almacen[] {
    return this.almacenes().filter((almacen) => almacen.estado !== 'inactivo' && almacen.estado !== 'mantenimiento');
  }

  formatMetodoPago(value?: string): string {
    return this.metodosPago.find((item) => item.value === value)?.label ?? value ?? 'Sin método';
  }

  getClienteNombre(c: any): string {
    if (!c) return 'Cliente General';
    if (typeof c === 'object') return this.getClienteNombreObj(c);
    const found = this.clientes().find((cliente) => cliente.id === c);
    return found ? this.getClienteNombreObj(found) : 'Cliente General';
  }

  getClienteNombreObj(c: Cliente): string {
    if (c.tipo_cliente === 'natural') {
      return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim() || 'Cliente General';
    }
    return c.razon_social ?? c.nombre_comercial ?? 'Cliente General';
  }

  getStockProducto(productoId: number): number {
    return this.productos().find((producto) => producto.id === Number(productoId))?.stock ?? 0;
  }

  getProductoLabel(producto: Producto): string {
    return `${producto.sku} - ${producto.nombre}`;
  }

  getDetalleProductoLabel(detalle: DetalleVenta): string {
    if (detalle.sku_producto || detalle.nombre_producto) {
      return [detalle.sku_producto, detalle.nombre_producto].filter(Boolean).join(' - ');
    }
    const producto = this.productos().find((item) => item.id === Number(detalle.producto));
    return producto ? this.getProductoLabel(producto) : String(detalle.producto ?? '');
  }

  openModal(): void {
    this.form = {
      cliente: null,
      metodo_pago: 'efectivo',
      descuento: 0,
      observaciones: '',
      efectivo_recibido: 0,
    };
    this.almacenId = this.almacenesActivos()[0]?.id ?? null;
    this.detalles.set([{ producto: 0, cantidad: 1, precio_unitario: 0 }]);
    this.totales.set({ subtotal: 0, iva: 0, total: 0 });
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  addLinea(): void {
    this.detalles.update((detalles) => [...detalles, { producto: 0, cantidad: 1, precio_unitario: 0 }]);
  }

  removeLinea(index: number): void {
    this.detalles.update((detalles) => detalles.filter((_, itemIndex) => itemIndex !== index));
    this.recalc();
  }

  onProductoChange(d: DetalleVenta): void {
    const producto = this.productos().find((item) => item.id === Number(d.producto));
    if (producto) {
      d.precio_unitario = Number(producto.precio_venta);
    }
    this.recalc();
  }

  recalc(): void {
    let subtotal = 0;
    let iva = 0;

    for (const detalle of this.detalles()) {
      const producto = this.productos().find((item) => item.id === Number(detalle.producto));
      const cantidad = Number(detalle.cantidad || 0);
      const precio = Number(detalle.precio_unitario || 0);
      const subtotalLinea = precio * cantidad;
      subtotal += subtotalLinea;
      iva += subtotalLinea * ((Number(producto?.iva_porcentaje) || 0) / 100);
    }

    const descuento = Number(this.form.descuento || 0);
    const total = Math.max(0, subtotal - descuento + iva);
    this.totales.set({ subtotal, iva, total });
  }

  calcCambioVal(): number {
    const recibido = Number(this.form.efectivo_recibido || 0);
    return Math.max(0, recibido - this.totales().total);
  }

  save(): void {
    const detallesValidos = this.detalles().filter((detalle) => Number(detalle.producto) > 0 && Number(detalle.cantidad) > 0);

    if (!this.almacenId) {
      this.formError.set('Selecciona un almacén para registrar la venta.');
      return;
    }

    if (!this.form.metodo_pago) {
      this.formError.set('Selecciona un método de pago.');
      return;
    }

    if (detallesValidos.length === 0) {
      this.formError.set('Debes agregar al menos un producto válido.');
      return;
    }

    if (this.form.metodo_pago === 'efectivo' && Number(this.form.efectivo_recibido || 0) < this.totales().total) {
      this.formError.set('El efectivo recibido no puede ser menor al total de la venta.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const payload = {
      ...this.form,
      almacen_id: this.almacenId,
      subtotal: this.totales().subtotal,
      iva_monto: this.totales().iva,
      total: this.totales().total,
      detalles: detallesValidos,
    };

    this.svc.crear(payload).subscribe({
      next: () => {
        this.load();
        this.closeModal();
        this.saving.set(false);
      },
      error: (error) => {
        this.formError.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  verDetalle(v: Venta): void {
    this.svc.detalle(v.id!).subscribe((detalle) => this.detalleVenta.set(detalle));
  }

  anular(v: Venta): void {
    const motivo = prompt('Motivo de anulación:');
    if (motivo === null) return;
    this.svc.anular(v.id!, motivo).subscribe({
      next: () => this.load(),
      error: (error) => this.formError.set(this.getErrorMessage(error)),
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;
    if (error?.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error)[0];
      if (Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === 'string') return firstValue;
    }
    return 'No fue posible procesar la venta.';
  }
}
/*
 * Pantalla de ventas.
 * Maneja la captura de ventas, selección de cliente/almacén y construcción del detalle por SKU.
 */
