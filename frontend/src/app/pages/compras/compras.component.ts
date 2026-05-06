import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ComprasService, ProductosService, ProveedoresService } from '../../core/services/api.services';
import { Compra, DetalleCompra, Producto, Proveedor } from '../../core/models';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="page">
        <!-- Encabezado del módulo con acceso al formulario de registro -->
        <div class="page-header">
          <div>
            <h1><i class="fas fa-cart-shopping"></i> Compras</h1>
            <p><i class="fas fa-circle-info"></i> {{ compras().length }} compras registradas</p>
          </div>
          <button class="btn-primary" (click)="openModal()">
            <i class="fas fa-plus"></i> Registrar Compra
          </button>
        </div>

        <!-- Tabla resumen de compras registradas -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of compras()">
                <td><code>{{ c.numero_factura }}</code></td>
                <td>{{ getProvNombre(c.proveedor) }}</td>
                <td>{{ c.fecha_compra }}</td>
                <td>{{ c.tipo_compra }}</td>
                <td>{{ c.total | currency:'COP':'symbol':'1.0-0' }}</td>
                <td><span class="badge" [class]="'badge-' + c.estado">{{ c.estado }}</span></td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon" (click)="verDetalle(c)" title="Ver detalle"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-danger" *ngIf="c.estado !== 'anulada'" (click)="anular(c)" title="Anular"><i class="fas fa-ban"></i></button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="compras().length === 0">
                <td colspan="7" class="empty-row">No hay compras registradas</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal principal para registrar la cabecera y el detalle de la compra -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal modal-xl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2><i class="fas fa-cart-shopping"></i> Registrar Compra</h2>
              <button class="close-btn" (click)="closeModal()"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="modal-body">
              <!-- Datos generales de la compra -->
              <div class="form-grid">
                <div class="field">
                  <label>Proveedor *</label>
                  <select [(ngModel)]="form.proveedor">
                    <option [ngValue]="null">Seleccionar...</option>
                    <option *ngFor="let p of proveedores()" [ngValue]="p.id">{{ p.razon_social }}</option>
                  </select>
                </div>
                <div class="field">
                  <label>Número Factura *</label>
                  <input type="text" [(ngModel)]="form.numero_factura" placeholder="Solo números" />
                </div>
                <div class="field">
                  <label>Fecha *</label>
                  <input type="date" [(ngModel)]="form.fecha_compra" />
                </div>
                <div class="field">
                  <label>Tipo de Compra *</label>
                  <select [(ngModel)]="form.tipo_compra">
                    <option value="Contado">Contado</option>
                    <option value="Credito">Crédito</option>
                  </select>
                </div>
              </div>

              <!-- Detalle de productos comprados con cálculo de subtotal, IVA y total -->
              <div class="detalle-section">
                <div class="detalle-header">
                  <h3><i class="fas fa-box-open"></i> Productos</h3>
                  <button type="button" class="btn-secondary btn-sm" (click)="addLinea()"><i class="fas fa-plus"></i> Agregar Producto</button>
                </div>

                <div class="detalle-table-wrap">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Costo Unitario</th>
                        <th>IVA %</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let d of detalles(); let i = index">
                        <td>
                          <select [(ngModel)]="d.producto" style="width:100%">
                            <option [ngValue]="0">Seleccionar...</option>
                            <option *ngFor="let p of productos()" [ngValue]="p.id">{{ getProductoLabel(p) }}</option>
                          </select>
                        </td>
                        <td><input type="number" [(ngModel)]="d.cantidad" min="1" style="width:70px" /></td>
                        <td><input type="number" [(ngModel)]="d.costo_unitario" min="0" style="width:100px" /></td>
                        <td><input type="number" [(ngModel)]="d.iva_porcentaje" min="0" max="100" style="width:60px" /></td>
                        <td>{{ calcSubtotal(d) | currency:'COP':'symbol':'1.0-0' }}</td>
                        <td><button class="btn-icon btn-danger" (click)="removeLinea(i)"><i class="fas fa-trash"></i></button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="totales">
                  <div>Subtotal: <strong>{{ calcTotal().subtotal | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                  <div>IVA: <strong>{{ calcTotal().iva | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                  <div class="total-final">Total: <strong>{{ calcTotal().total | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                </div>
              </div>

              <div class="error-msg" *ngIf="formError()">{{ formError() }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Registrar Compra' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Modal de solo lectura para revisar una compra ya creada -->
        <div class="modal-overlay" *ngIf="detalleCompra()" (click)="detalleCompra.set(null)">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Detalle Compra - {{ detalleCompra()?.numero_factura }}</h2>
              <button class="close-btn" (click)="detalleCompra.set(null)"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="modal-body">
              <table class="data-table" *ngIf="detalleCompra()?.detalles">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Costo Unit.</th>
                    <th>IVA %</th>
                    <th>Subtotal</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let d of detalleCompra()!.detalles">
                    <td>{{ getDetalleProductoLabel(d) }}</td>
                    <td>{{ d.cantidad }}</td>
                    <td>{{ d.costo_unitario | currency:'COP':'symbol':'1.0-0' }}</td>
                    <td>{{ d.iva_porcentaje }}%</td>
                    <td>{{ d.subtotal | currency:'COP':'symbol':'1.0-0' }}</td>
                    <td>{{ d.total | currency:'COP':'symbol':'1.0-0' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="totales" style="margin-top:16px">
                <div>Subtotal: <strong>{{ detalleCompra()?.subtotal | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                <div>IVA: <strong>{{ detalleCompra()?.iva_total | currency:'COP':'symbol':'1.0-0' }}</strong></div>
                <div class="total-final">Total: <strong>{{ detalleCompra()?.total | currency:'COP':'symbol':'1.0-0' }}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `,
  styles: [`
    .page { padding: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-header h1 { font-family: var(--font-display); font-size: 26px; color: var(--text-primary); margin: 0 0 4px; display:flex; align-items:center; gap:10px; }
    .page-header h1 i { color: var(--accent); }
    .page-header p { color: var(--text-muted); font-size: 13px; margin: 0; display:flex; align-items:center; gap:8px; }
    .detalle-section { margin-top: 24px; }
    .detalle-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .detalle-header h3 { margin: 0; font-size: 15px; color: var(--text-primary); display:flex; align-items:center; gap:8px; }
    .detalle-table-wrap { overflow-x: auto; }
    .totales { display: flex; gap: 24px; justify-content: flex-end; margin-top: 16px; padding: 12px 16px; background: var(--bg-input); border-radius: 8px; font-size: 14px; color: var(--text-secondary); }
    .total-final { font-weight: 700; color: var(--text-primary); font-size: 16px; }
  `],
})
export class ComprasComponent implements OnInit {
  compras = signal<Compra[]>([]);
  proveedores = signal<Proveedor[]>([]);
  productos = signal<Producto[]>([]);
  showModal = signal(false);
  detalleCompra = signal<Compra | null>(null);
  saving = signal(false);
  formError = signal('');
  form: Partial<Compra> = {};
  detalles = signal<DetalleCompra[]>([]);

  constructor(
    private svc: ComprasService,
    private provSvc: ProveedoresService,
    private prodSvc: ProductosService
  ) {}

  ngOnInit(): void {
    this.load();
    this.provSvc.listar().subscribe((p) => this.proveedores.set(p));
    this.prodSvc.listar().subscribe((p) => this.productos.set(p));
  }

  load(): void { this.svc.listar().subscribe((c) => this.compras.set(c)); }

  getProvNombre(prov: any): string {
    return typeof prov === 'object' ? prov?.razon_social : (this.proveedores().find((p) => p.id === prov)?.razon_social ?? prov);
  }

  getProductoNombre(prod: any): string {
    return typeof prod === 'object' ? prod?.nombre : (this.productos().find((p) => p.id === prod)?.nombre ?? String(prod));
  }

  getProductoLabel(producto: Producto): string {
    return `${producto.sku} - ${producto.nombre}`;
  }

  getDetalleProductoLabel(detalle: any): string {
    const producto = typeof detalle.producto === 'object'
      ? detalle.producto
      : this.productos().find((item) => item.id === Number(detalle.producto));

    if (producto) {
      return this.getProductoLabel(producto);
    }

    const sku = detalle.sku_producto ?? detalle.producto_sku ?? '';
    const nombre = detalle.producto_nombre ?? detalle.nombre_producto ?? this.getProductoNombre(detalle.producto);
    return [sku, nombre].filter(Boolean).join(' - ');
  }

  openModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.form = { proveedor: null as any, numero_factura: '', fecha_compra: today, tipo_compra: 'Contado' };
    this.detalles.set([{ producto: 0, cantidad: 1, costo_unitario: 0, iva_porcentaje: 0 }]);
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  addLinea(): void {
    this.detalles.update((d) => [...d, { producto: 0, cantidad: 1, costo_unitario: 0, iva_porcentaje: 0 }]);
  }

  removeLinea(i: number): void {
    this.detalles.update((d) => d.filter((_, idx) => idx !== i));
  }

  calcSubtotal(d: DetalleCompra): number {
    const base = (d.cantidad || 0) * (d.costo_unitario || 0);
    const iva = base * ((d.iva_porcentaje || 0) / 100);
    return base + iva;
  }

  calcTotal(): { subtotal: number; iva: number; total: number } {
    let subtotal = 0;
    let iva = 0;
    for (const d of this.detalles()) {
      const base = (d.cantidad || 0) * (d.costo_unitario || 0);
      const ivaAmt = base * ((d.iva_porcentaje || 0) / 100);
      subtotal += base;
      iva += ivaAmt;
    }
    return { subtotal, iva, total: subtotal + iva };
  }

  save(): void {
    if (!this.form.proveedor || !this.form.numero_factura || this.detalles().length === 0) {
      this.formError.set('Completa todos los campos y agrega al menos un producto.');
      return;
    }
    if (!/^\d+$/.test(String(this.form.numero_factura).trim())) {
      this.formError.set('El número de factura debe contener solo números.');
      return;
    }

    const detallesValidos = this.detalles().filter((d) => Number(d.producto) > 0 && Number(d.cantidad) > 0);
    if (detallesValidos.length === 0) {
      this.formError.set('Agrega al menos un producto válido.');
      return;
    }

    this.saving.set(true);
    const payload = { ...this.form, detalles: detallesValidos };
    this.svc.registrar(payload).subscribe({
      next: () => { this.load(); this.closeModal(); this.saving.set(false); },
      error: (e) => { this.formError.set(this.getErrorMessage(e)); this.saving.set(false); },
    });
  }

  verDetalle(c: Compra): void {
    this.svc.detalle(c.id!).subscribe((d) => this.detalleCompra.set(d));
  }

  anular(c: Compra): void {
    if (!confirm(`¿Anular la compra ${c.numero_factura}?`)) return;
    this.svc.anular(c.id!).subscribe({
      next: () => this.load(),
      error: (e) => alert(this.getErrorMessage(e)),
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;
    if (error?.error && typeof error.error === 'object') {
      const [field, value] = Object.entries(error.error)[0] ?? [];
      if (Array.isArray(value)) return field ? `${field}: ${String(value[0])}` : String(value[0]);
      if (typeof value === 'string') return field ? `${field}: ${value}` : value;
    }
    return 'No fue posible registrar la compra.';
  }
}
/*
 * Pantalla de compras.
 * Orquesta el registro de compras, cálculo de totales y construcción del payload de detalle por producto.
 */
