/**
 * @component VentasComponent
 * @description
 * Pantalla de registro y consulta de ventas.
 * Maneja cabecera (cliente, almacén, método de pago, descuento) y detalle de productos.
 * Calcula subtotales, IVA y total en tiempo real con validación de stock.
 * Permite ver detalle histórico y anular ventas con motivo.
 */
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
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.css'],
})
export class VentasComponent implements OnInit {
  
  // ── Signals ──────────────────────────────────────────────────────────────
  ventas = signal<Venta[]>([]);
  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  almacenes = signal<Almacen[]>([]);
  stockAlmacen = signal<Record<number, number>>({});
  showModal = signal(false);
  detalleVenta = signal<Venta | null>(null);  // null = modal cerrado
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

  // Excluye almacenes inactivos o en mantenimiento
  almacenesActivos(): Almacen[] {
    return this.almacenes().filter((almacen) => almacen.estado !== 'inactivo' && almacen.estado !== 'mantenimiento');
  }

  productosActivos(): Producto[] {
    return this.productos().filter((producto) => producto.estado === 'activo');
  }

  formatMetodoPago(value?: string): string {
    return this.metodosPago.find((item) => item.value === value)?.label ?? value ?? 'Sin método';
  }

  // Resuelve nombre del cliente (puede venir como objeto, ID o null)
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
    return this.stockAlmacen()[Number(productoId)] ?? 0;
  }

  getProductoLabel(producto: Producto): string {
    return `${producto.sku} - ${producto.nombre}`;
  }

  // Maneja formato del detalle: puede tener sku/nombre embebido o solo ID
  getDetalleProductoLabel(detalle: DetalleVenta): string {
    if (detalle.sku_producto || detalle.nombre_producto) {
      return [detalle.sku_producto, detalle.nombre_producto].filter(Boolean).join(' - ');
    }
    const producto = this.productos().find((item) => item.id === Number(detalle.producto));
    return producto ? this.getProductoLabel(producto) : String(detalle.producto ?? '');
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  openModal(): void {
    this.form = {
      cliente: null,
      metodo_pago: 'efectivo',
      descuento: 0,
      observaciones: '',
      efectivo_recibido: 0,
    };
    this.almacenId = this.almacenesActivos()[0]?.id ?? null;
    this.cargarStockAlmacen();
    this.detalles.set([{ producto: 0, cantidad: 1, precio_unitario: 0 }]);
    this.totales.set({ subtotal: 0, iva: 0, total: 0 });
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onAlmacenChange(almacenId: number | null): void {
    this.almacenId = almacenId;
    this.cargarStockAlmacen();
  }

  private cargarStockAlmacen(): void {
    if (!this.almacenId) {
      this.stockAlmacen.set({});
      return;
    }
    this.invSvc.listarStock(this.almacenId).subscribe((items) => {
      const stock: Record<number, number> = {};
      for (const item of items) stock[Number(item.producto_id)] = Number(item.stock_actual);
      this.stockAlmacen.set(stock);
    });
  }

  addLinea(): void {
    this.detalles.update((detalles) => [...detalles, { producto: 0, cantidad: 1, precio_unitario: 0 }]);
  }

  removeLinea(index: number): void {
    this.detalles.update((detalles) => detalles.filter((_, itemIndex) => itemIndex !== index));
    this.recalc();
  }

  // Al seleccionar producto, carga su precio de venta automáticamente
  onProductoChange(d: DetalleVenta): void {
    const producto = this.productos().find((item) => item.id === Number(d.producto));
    if (producto) {
      d.precio_unitario = Number(producto.precio_venta);
    }
    this.recalc();
  }

  // Recalcula subtotal, IVA y total en tiempo real
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

  // Cambio = efectivo recibido - total (solo para método efectivo)
  calcCambioVal(): number {
    const recibido = Number(this.form.efectivo_recibido || 0);
    return Math.max(0, recibido - this.totales().total);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  save(): void {
    const detallesValidos = this.detalles().filter((detalle) => Number(detalle.producto) > 0 && Number(detalle.cantidad) > 0);

    // Validaciones
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

    const cantidades = new Map<number, number>();
    for (const detalle of detallesValidos) {
      const productoId = Number(detalle.producto);
      cantidades.set(productoId, (cantidades.get(productoId) ?? 0) + Number(detalle.cantidad));
    }
    for (const [productoId, cantidad] of cantidades.entries()) {
      if (cantidad > this.getStockProducto(productoId)) {
        this.formError.set(`Stock insuficiente para ${this.getProductoLabel(this.productos().find(p => p.id === productoId)!)}.`);
        return;
      }
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
        this.prodSvc.listar().subscribe((productos) => this.productos.set(productos));
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

  // Anulación con motivo obligatorio
  anular(v: Venta): void {
    const motivo = prompt('Motivo de anulación:');
    if (motivo === null) return;
    this.svc.anular(v.id!, motivo).subscribe({
      next: () => {
        this.load();
        this.prodSvc.listar().subscribe((productos) => this.productos.set(productos));
      },
      error: (error) => this.formError.set(this.getErrorMessage(error)),
    });
  }

  // Normaliza errores del backend
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
