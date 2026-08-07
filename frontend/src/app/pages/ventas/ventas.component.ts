import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Almacen, Cliente, DetalleVenta, Empresa, Producto, Venta } from '../../core/models';
import {
  ClientesService,
  InventarioService,
  ProductosService,
  VentasService,
} from '../../core/services/api.services';
import { EmpresaService } from '../../core/services/empresa.service';
import { LayoutComponent } from '../../shared/components/layout.component';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import { NotificationService } from '../../shared/notifications/notification.service';


interface SaleResult {
  id: number;
  number: string;
  total: number;
}


@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutComponent,
    FormErrorSummaryComponent,
    FieldErrorComponent,
    FieldValidationDirective,
  ],
  templateUrl: './ventas.component.html',
  styleUrls: ['./ventas.component.css'],
})
export class VentasComponent implements OnInit {
  @ViewChild('saleDialog') saleDialog?: ElementRef<HTMLElement>;
  @ViewChild('productPicker') productPicker?: ElementRef<HTMLSelectElement>;

  readonly ventas = signal<Venta[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly almacenes = signal<Almacen[]>([]);
  readonly stockAlmacen = signal<Record<number, number>>({});
  readonly showModal = signal(false);
  readonly detalleVenta = signal<Venta | null>(null);
  readonly saleResult = signal<SaleResult | null>(null);
  readonly saving = signal(false);
  readonly loadingDetail = signal(false);
  readonly validation: FormFeedbackState;
  readonly productSearch = signal('');

  form: Partial<Venta> = {};
  detalles = signal<DetalleVenta[]>([]);
  totales = signal({ subtotal: 0, iva: 0, total: 0 });
  almacenId: number | null = null;
  productToAdd: number | null = null;
  private initialState = '';

  readonly filteredProducts = computed(() => {
    const term = this.productSearch().trim().toLocaleLowerCase('es-CO');
    const active = this.productos().filter((product) => product.estado === 'activo');
    if (!term) return active;
    return active.filter((product) =>
      [product.nombre, product.sku, product.referencia, product.marca]
        .some((value) => String(value ?? '').toLocaleLowerCase('es-CO').includes(term)),
    );
  });

  readonly metodosPago = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'debito', label: 'Tarjeta débito' },
    { value: 'credito', label: 'Tarjeta crédito' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'DaviPlata' },
    { value: 'otro', label: 'Otro' },
  ];

  constructor(
    private sales: VentasService,
    private clients: ClientesService,
    private products: ProductosService,
    private inventory: InventarioService,
    public company: EmpresaService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(
      feedback,
      'No fue posible registrar la venta. Revisa los campos señalados.',
      '.sale-form-modal',
    );
  }

  ngOnInit(): void {
    this.load();
    this.clients.listar().subscribe((items) => this.clientes.set(items));
    this.products.listar().subscribe((items) => this.productos.set(items));
    this.inventory.listarAlmacenes().subscribe((items) => this.almacenes.set(items));
    this.company.cargar().subscribe({ error: () => undefined });
  }

  load(): void {
    this.sales.listar().subscribe((items) => this.ventas.set(items));
  }

  almacenesActivos(): Almacen[] {
    return this.almacenes().filter((warehouse) =>
      warehouse.estado !== 'inactivo' && warehouse.estado !== 'mantenimiento'
    );
  }

  formatMetodoPago(value?: string): string {
    return this.metodosPago.find((item) => item.value === value)?.label ?? value ?? 'No disponible';
  }

  getClienteNombre(value: unknown): string {
    if (!value) return 'Cliente general';
    if (typeof value === 'object') return this.getClienteNombreObj(value as Cliente);
    const found = this.clientes().find((client) => client.id === Number(value));
    return found ? this.getClienteNombreObj(found) : 'Cliente general';
  }

  getClienteNombreObj(client: Cliente): string {
    if (client.tipo_cliente === 'natural') {
      return `${client.nombres ?? ''} ${client.apellidos ?? ''}`.trim() || 'Cliente general';
    }
    return client.razon_social ?? client.nombre_comercial ?? 'Cliente general';
  }

  getStockProducto(productId: number): number {
    return this.stockAlmacen()[Number(productId)] ?? 0;
  }

  getProduct(productId: number): Producto | undefined {
    return this.productos().find((product) => product.id === Number(productId));
  }

  getProductoLabel(product: Producto): string {
    return `${product.sku} · ${product.nombre} · ${product.referencia}`;
  }

  getDetalleProductoLabel(detail: DetalleVenta): string {
    if (detail.sku_producto || detail.nombre_producto) {
      return [detail.sku_producto, detail.nombre_producto].filter(Boolean).join(' · ');
    }
    const product = this.getProduct(Number(detail.producto));
    return product ? this.getProductoLabel(product) : 'Producto no disponible';
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
    this.productToAdd = null;
    this.productSearch.set('');
    this.detalles.set([]);
    this.totales.set({ subtotal: 0, iva: 0, total: 0 });
    this.validation.clear();
    this.showModal.set(true);
    this.loadStock();
    this.initialState = this.currentState();
    window.setTimeout(() => this.productPicker?.nativeElement.focus());
  }

  requestClose(): void {
    if (this.saving()) return;
    if (this.currentState() !== this.initialState) {
      const shouldExit = window.confirm('Hay cambios sin guardar. ¿Deseas salir?');
      if (!shouldExit) return;
    }
    this.showModal.set(false);
    this.validation.clear();
  }

  onAlmacenChange(warehouseId: number | null): void {
    this.almacenId = warehouseId;
    this.validation.clearField('almacen');
    this.loadStock();
  }

  onPaymentChange(): void {
    this.validation.clearField('metodo_pago');
    this.validation.clearField('efectivo_recibido');
    if (this.form.metodo_pago !== 'efectivo') {
      this.form.efectivo_recibido = undefined;
      this.form.cambio = undefined;
    }
  }

  addSelectedProduct(): void {
    const productId = Number(this.productToAdd);
    const product = this.getProduct(productId);
    if (!product) {
      this.validation.reject({ detalles: 'Selecciona un producto para agregar.' });
      return;
    }
    const existing = this.detalles().find((detail) => Number(detail.producto) === productId);
    if (existing) {
      existing.cantidad = Number(existing.cantidad) + 1;
      this.detalles.set([...this.detalles()]);
    } else {
      this.detalles.update((items) => [
        ...items,
        { producto: productId, cantidad: 1, precio_unitario: Number(product.precio_venta) },
      ]);
    }
    this.productToAdd = null;
    this.validation.clearField('detalles');
    this.recalc();
    window.setTimeout(() => this.productPicker?.nativeElement.focus());
  }

  removeLine(index: number): void {
    this.detalles.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
    this.recalc();
  }

  changeQuantity(detail: DetalleVenta): void {
    detail.cantidad = Math.max(1, Math.trunc(Number(detail.cantidad) || 1));
    this.validation.clearField('detalles');
    this.recalc();
  }

  lineSubtotal(detail: DetalleVenta): number {
    return Number(detail.precio_unitario || 0) * Number(detail.cantidad || 0);
  }

  lineIva(detail: DetalleVenta): number {
    const rate = Number(this.getProduct(Number(detail.producto))?.iva_porcentaje ?? detail.iva_porcentaje ?? 0);
    return this.lineSubtotal(detail) * rate / 100;
  }

  recalc(): void {
    let subtotal = 0;
    let iva = 0;
    for (const detail of this.detalles()) {
      subtotal += this.lineSubtotal(detail);
      iva += this.lineIva(detail);
    }
    const discount = Math.max(0, Number(this.form.descuento || 0));
    this.totales.set({ subtotal, iva, total: Math.max(0, subtotal - discount + iva) });
  }

  calcCambioVal(): number {
    if (this.form.metodo_pago !== 'efectivo') return 0;
    return Math.max(0, Number(this.form.efectivo_recibido || 0) - this.totales().total);
  }

  canSave(): boolean {
    return !this.saving() && this.detalles().length > 0;
  }

  save(): void {
    if (this.saving()) return;
    const errors: Record<string, string> = {};
    if (!this.almacenId) errors['almacen'] = 'Selecciona un almacén para registrar la venta.';
    if (!this.form.metodo_pago) errors['metodo_pago'] = 'Selecciona un método de pago.';
    if (!this.detalles().length) errors['detalles'] = 'Agrega al menos un producto.';
    if (Number(this.form.descuento || 0) < 0) errors['descuento'] = 'El descuento no puede ser negativo.';
    if (Number(this.form.descuento || 0) > this.totales().subtotal) {
      errors['descuento'] = 'El descuento no puede superar el subtotal.';
    }

    const quantities = new Map<number, number>();
    for (const detail of this.detalles()) {
      const productId = Number(detail.producto);
      const quantity = Number(detail.cantidad);
      if (quantity <= 0) errors['detalles'] = 'Todas las cantidades deben ser mayores que cero.';
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    for (const [productId, quantity] of quantities) {
      if (quantity > this.getStockProducto(productId)) {
        errors['detalles'] = `La cantidad de ${this.getProduct(productId)?.nombre ?? 'producto'} supera el stock disponible.`;
        break;
      }
    }
    if (
      this.form.metodo_pago === 'efectivo' &&
      Number(this.form.efectivo_recibido || 0) < this.totales().total
    ) {
      errors['efectivo_recibido'] = 'El efectivo recibido no puede ser menor al total de la venta.';
    }
    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }

    this.validation.clear();
    this.saving.set(true);
    this.sales.crear({
      ...this.form,
      almacen_id: this.almacenId,
      total: this.totales().total,
      detalles: this.detalles(),
    }).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.showModal.set(false);
        this.saleResult.set({
          id: Number(response.venta_id),
          number: String(response.numero_factura),
          total: Number(response.total),
        });
        this.load();
        this.products.listar().subscribe((items) => this.productos.set(items));
        this.notifications.success(`Venta ${response.numero_factura} registrada satisfactoriamente.`);
      },
      error: (error) => {
        this.saving.set(false);
        this.validation.fromHttp(error);
      },
    });
  }

  viewDetail(sale: Venta): void {
    this.openDetail(Number(sale.id));
  }

  viewResultDetail(): void {
    const result = this.saleResult();
    if (!result) return;
    this.saleResult.set(null);
    this.openDetail(result.id);
  }

  printResult(): void {
    const result = this.saleResult();
    if (!result) return;
    this.saleResult.set(null);
    this.openDetail(result.id, true);
  }

  printReceipt(): void {
    window.setTimeout(() => window.print(), 50);
  }

  receiptCompany(sale: Venta | null): Partial<Empresa> {
    const snapshot = sale?.empresa_snapshot ?? {};
    return Object.keys(snapshot).length ? snapshot : (this.company.empresa() ?? {});
  }

  currentLogo(): string {
    return this.company.empresa()?.logo_url ?? '';
  }

  cancelSale(sale: Venta): void {
    const reason = window.prompt('Motivo de anulación:');
    if (reason === null) return;
    if (!reason.trim()) {
      this.notifications.error('Debes indicar el motivo de anulación.');
      return;
    }
    this.sales.anular(Number(sale.id), reason.trim()).subscribe({
      next: () => {
        this.load();
        this.products.listar().subscribe((items) => this.productos.set(items));
        this.notifications.success('Venta anulada satisfactoriamente.');
      },
      error: (error) => this.notifications.error(this.getErrorMessage(error)),
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.showModal()) {
        event.preventDefault();
        this.requestClose();
      } else if (this.detalleVenta()) {
        this.detalleVenta.set(null);
      } else if (this.saleResult()) {
        this.saleResult.set(null);
      }
      return;
    }
    if (event.key !== 'Tab' || !this.showModal() || !this.saleDialog) return;
    const focusable = Array.from(
      this.saleDialog.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private openDetail(id: number, printAfterLoad = false): void {
    this.loadingDetail.set(true);
    this.sales.detalle(id).subscribe({
      next: (detail) => {
        this.loadingDetail.set(false);
        this.detalleVenta.set(detail);
        if (printAfterLoad) this.printReceipt();
      },
      error: () => {
        this.loadingDetail.set(false);
        this.notifications.error('No fue posible cargar el detalle de la venta.');
      },
    });
  }

  private loadStock(): void {
    if (!this.almacenId) {
      this.stockAlmacen.set({});
      return;
    }
    this.inventory.listarStock(this.almacenId).subscribe((items) => {
      const stock: Record<number, number> = {};
      for (const item of items) stock[Number(item.producto_id)] = Number(item.stock_actual);
      this.stockAlmacen.set(stock);
    });
  }

  private currentState(): string {
    return JSON.stringify({ form: this.form, almacen: this.almacenId, details: this.detalles() });
  }

  private getErrorMessage(error: any): string {
    return error?.error?.error ?? error?.error?.mensaje ?? 'No fue posible procesar la venta.';
  }
}
