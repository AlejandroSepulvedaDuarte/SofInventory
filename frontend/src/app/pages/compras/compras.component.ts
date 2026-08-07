/**
 * @component ComprasComponent
 * @description
 * Pantalla de registro y consulta de compras.
 * Maneja la cabecera (proveedor, factura, fecha, tipo) y el detalle por producto
 * (cantidad, costo unitario, IVA), calculando subtotales y totales en tiempo real
 * antes de construir el payload para el backend.
 *
 * Los catálogos de proveedores y productos se cargan una sola vez al iniciar.
 * Los helpers de presentación resuelven IDs u objetos indistintamente, ya que
 * el backend puede devolver cualquiera de los dos formatos según el endpoint.
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ComprasService, InventarioService, ProductosService, ProveedoresService } from '../../core/services/api.services';
import { Almacen, Compra, DetalleCompra, Producto, Proveedor } from '../../core/models';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { Empresa } from '../../core/models';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective],
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.css']
})
export class ComprasComponent implements OnInit {

  // ── Signals ──────────────────────────────────────────────────────────────
  compras      = signal<Compra[]>([]);
  proveedores  = signal<Proveedor[]>([]);
  productos    = signal<Producto[]>([]);
  almacenes    = signal<Almacen[]>([]);
  showModal    = signal(false);
  detalleCompra = signal<Compra | null>(null);  // null = modal cerrado
  saving       = signal(false);
  readonly validation: FormFeedbackState;

  // ── Formulario ───────────────────────────────────────────────────────────
  form: Partial<Compra> = {};
  detalles = signal<DetalleCompra[]>([]);  // Se inicializa con una fila vacía al abrir modal

  constructor(
    private svc: ComprasService,
    private provSvc: ProveedoresService,
    private prodSvc: ProductosService,
    private invSvc: InventarioService,
    public company: EmpresaService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(feedback, 'No fue posible registrar la compra. Revisa los campos señalados.', '.purchase-form-modal');
  }

  ngOnInit(): void {
    this.load();
    this.provSvc.listar().subscribe((p) => this.proveedores.set(p));
    this.prodSvc.listar().subscribe((p) => this.productos.set(p));
    this.invSvc.listarAlmacenes().subscribe((almacenes) => this.almacenes.set(almacenes));
    this.company.cargar().subscribe({ error: () => undefined });
  }

  load(): void {
    this.svc.listar().subscribe((c) => this.compras.set(c));
  }

  // ── Helpers de presentación ──────────────────────────────────────────────

  // Resuelve nombre del proveedor (objeto o ID)
  getProvNombre(prov: any): string {
    return typeof prov === 'object'
      ? prov?.razon_social
      : (this.proveedores().find((p) => p.id === prov)?.razon_social ?? prov);
  }

  // Resuelve nombre del producto (objeto o ID) - fallback
  getProductoNombre(prod: any): string {
    return typeof prod === 'object'
      ? prod?.nombre
      : (this.productos().find((p) => p.id === prod)?.nombre ?? String(prod));
  }

  // Formato "SKU - Nombre" para el select
  getProductoLabel(producto: Producto): string {
    return `${producto.sku} - ${producto.nombre}`;
  }

  // Maneja 3 formatos posibles: objeto, ID, o campos sueltos (sku_producto, producto_nombre)
  getDetalleProductoLabel(detalle: any): string {
    const producto = typeof detalle.producto === 'object'
      ? detalle.producto
      : this.productos().find((item) => item.id === Number(detalle.producto));

    if (producto) return this.getProductoLabel(producto);

    const sku    = detalle.sku_producto ?? detalle.producto_sku ?? '';
    const nombre = detalle.producto_nombre ?? detalle.nombre_producto ?? this.getProductoNombre(detalle.producto);
    return [sku, nombre].filter(Boolean).join(' - ');
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  openModal(): void {
    const today = new Date().toISOString().split('T')[0];
    const almacen = this.almacenes().find((item) => item.estado === 'activo');
    this.form = {
      proveedor: null as any,
      almacen: almacen?.id ?? null,
      numero_factura: '',
      fecha_compra: today,
      tipo_compra: 'Contado',
      observaciones: '',
    };
    this.detalles.set([{ producto: 0, cantidad: 1, costo_unitario: 0, iva_porcentaje: 0 }]);
    this.validation.clear();
    this.showModal.set(true);
  }

  closeModal(): void { if (!this.saving()) this.showModal.set(false); }

  addLinea(): void {
    this.detalles.update((d) => [...d, { producto: 0, cantidad: 1, costo_unitario: 0, iva_porcentaje: 0 }]);
  }

  removeLinea(i: number): void {
    this.detalles.update((d) => d.filter((_, idx) => idx !== i));
  }

  // ── Cálculo de totales ───────────────────────────────────────────────────

  // Subtotal por línea: base + IVA
  calcSubtotal(d: DetalleCompra): number {
    const base = (d.cantidad || 0) * (d.costo_unitario || 0);
    return base + base * ((d.iva_porcentaje || 0) / 100);
  }

  // Suma total de todas las líneas (se llama desde template, mantener ligero)
  calcTotal(): { subtotal: number; iva: number; total: number } {
    let subtotal = 0, iva = 0;
    for (const d of this.detalles()) {
      const base   = (d.cantidad || 0) * (d.costo_unitario || 0);
      const ivaAmt = base * ((d.iva_porcentaje || 0) / 100);
      subtotal += base;
      iva      += ivaAmt;
    }
    return { subtotal, iva, total: subtotal + iva };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  save(): void {
    const errors: Record<string, string> = {};
    const factura = String(this.form.numero_factura ?? '').trim();
    if (!this.form.proveedor) errors['proveedor'] = 'Selecciona un proveedor.';
    if (!this.form.almacen) errors['almacen'] = 'Selecciona un almacén receptor.';
    if (!factura) errors['numero_factura'] = 'El número de factura es obligatorio.';
    else if (!/^\d+$/.test(factura)) errors['numero_factura'] = 'El número de factura debe contener solo números.';
    if (!this.form.fecha_compra) errors['fecha_compra'] = 'La fecha de compra es obligatoria.';
    if (!this.form.tipo_compra) errors['tipo_compra'] = 'Selecciona un tipo de compra.';

    const detallesValidos = this.detalles().filter(
      (d) => Number(d.producto) > 0 && Number(d.cantidad) > 0
    );
    if (detallesValidos.length === 0) errors['detalles'] = 'Agrega al menos un producto con una cantidad mayor que cero.';
    if (this.detalles().some((d) => Number(d.costo_unitario) < 0)) errors['detalles'] = 'El costo unitario no puede ser negativo.';
    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }

    this.validation.clear();
    this.saving.set(true);
    const payload = { ...this.form, detalles: detallesValidos };

    this.svc.registrar(payload).subscribe({
      next: () => {
        this.load();
        this.saving.set(false);
        this.showModal.set(false);
        this.notifications.success('Compra registrada satisfactoriamente.');
      },
      error: (e) => { this.validation.fromHttp(e); this.saving.set(false); },
    });
  }

  verDetalle(c: Compra): void {
    this.svc.detalle(c.id!).subscribe((d) => this.detalleCompra.set(d));
  }

  printReceipt(): void {
    window.setTimeout(() => window.print(), 50);
  }

  receiptCompany(purchase: Compra | null): Partial<Empresa> {
    const snapshot = purchase?.empresa_snapshot ?? {};
    return Object.keys(snapshot).length ? snapshot : (this.company.empresa() ?? {});
  }

  currentLogo(): string {
    return this.company.empresa()?.logo_url ?? '';
  }

  anular(c: Compra): void {
    if (!confirm(`¿Anular la compra ${c.numero_factura}?`)) return;
    const motivo = prompt('Motivo de anulacion:', 'Correccion de compra');
    if (motivo === null) return;
    this.svc.anular(c.id!, motivo).subscribe({
      next: () => { this.load(); this.notifications.success('Compra anulada satisfactoriamente.'); },
      error: (e) => this.notifications.error(this.getErrorMessage(e)),
    });
  }

  // Normaliza errores: error.error → mensaje → campo específico
  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error   === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;

    if (error?.error && typeof error.error === 'object') {
      const [field, value] = Object.entries(error.error)[0] ?? [];
      if (Array.isArray(value))      return field ? `${field}: ${String(value[0])}` : String(value[0]);
      if (typeof value === 'string') return field ? `${field}: ${value}` : value;
    }

    return 'No fue posible registrar la compra.';
  }
}
