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
import { ComprasService, ProductosService, ProveedoresService } from '../../core/services/api.services';
import { Compra, DetalleCompra, Producto, Proveedor } from '../../core/models';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './compras.component.html',
  styleUrls: ['./compras.component.css']
})
export class ComprasComponent implements OnInit {

  // ── Signals ──────────────────────────────────────────────────────────────
  compras      = signal<Compra[]>([]);
  proveedores  = signal<Proveedor[]>([]);
  productos    = signal<Producto[]>([]);
  showModal    = signal(false);
  detalleCompra = signal<Compra | null>(null);  // null = modal cerrado
  saving       = signal(false);
  formError    = signal('');

  // ── Formulario ───────────────────────────────────────────────────────────
  form: Partial<Compra> = {};
  detalles = signal<DetalleCompra[]>([]);  // Se inicializa con una fila vacía al abrir modal

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
    // Validaciones: proveedor, factura, al menos un detalle
    if (!this.form.proveedor || !this.form.numero_factura || this.detalles().length === 0) {
      this.formError.set('Completa todos los campos y agrega al menos un producto.');
      return;
    }
    // Factura solo números
    if (!/^\d+$/.test(String(this.form.numero_factura).trim())) {
      this.formError.set('El número de factura debe contener solo números.');
      return;
    }

    const detallesValidos = this.detalles().filter(
      (d) => Number(d.producto) > 0 && Number(d.cantidad) > 0
    );
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