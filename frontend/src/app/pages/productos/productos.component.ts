/**
 * @component ProductosComponent
 * @description
 * Pantalla de gestión de productos (catálogo).
 * Maneja listado, búsqueda, filtros por estado, creación, edición
 * y cambio de estado (activo/inactivo/pendiente) de productos.
 * 
 * El formulario incluye datos comerciales (precios, IVA, marca, categoría)
 * y de inventario (stock mínimo, unidad de medida).
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ProductosService } from '../../core/services/api.services';
import { Producto, Categoria } from '../../core/models';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import { commercialNameError, normalizeSemanticText } from '../../shared/forms/semantic-validators';
import { NotificationService } from '../../shared/notifications/notification.service';
import { FormHelpComponent } from '../../shared/form-help/form-help.component';
import { FORM_HELP_CONTENT } from '../../shared/form-help/form-help-content';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective, FormHelpComponent],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  readonly productHelp = FORM_HELP_CONTENT.product;
  
  // ── Señales de estado ──────────────────────────────────────────
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  showModal = signal(false);
  editing = signal<Producto | null>(null);   // null = creación, con datos = edición
  saving = signal(false);
  readonly validation: FormFeedbackState;
  highlightedId = signal<number | null>(null);
  detalleProducto = signal<Producto | null>(null);
  selectedImage: File | null = null;
  imagePreview = '';
  removeImage = false;
  
  // Filtros reactivos (se usan en el computed filteredProductos)
  searchTerm = signal('');
  filtroEstado = signal('');   // '', 'activo', 'inactivo', 'pendiente'

  form: Partial<Producto> = {};

  // Opciones para el selector de unidad de medida
  unidades = ['Unidad', 'Caja', 'Metro', 'Litro', 'Galon', 'Rollo', 'Bulto', 'Kilo'];

  /**
   * Productos filtrados reactivamente.
   * Aplica filtro por estado (si hay) y luego búsqueda por nombre/SKU/marca.
   */
  filteredProductos = computed(() => {
    let list = this.productos();
    const estado = this.filtroEstado();
    const term = this.searchTerm();
    
    if (estado) list = list.filter(p => p.estado === estado);
    if (term) {
      const t = term.toLowerCase();
      list = list.filter(p =>
        p.nombre.toLowerCase().includes(t) ||
        p.sku.toLowerCase().includes(t) ||
        p.marca.toLowerCase().includes(t)
      );
    }
    return list;
  });

  constructor(
    private svc: ProductosService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(feedback, 'No fue posible guardar el producto. Revisa los campos señalados.', '.product-form-modal');
  }

  ngOnInit(): void {
    this.load();
    // Carga catálogo de categorías para el selector
    this.svc.listarCategorias().subscribe(c => this.categorias.set(c));
  }

  load(): void {
    this.svc.listar().subscribe(p => this.productos.set(p));
  }

  /**
   * Resuelve nombre de categoría (puede venir como objeto o como ID).
   * Usado en la tabla para mostrar el nombre legible.
   */
  getCatNombre(cat: any): string {
    return typeof cat === 'object' 
      ? cat?.nombre 
      : (this.categorias().find(c => c.id === cat)?.nombre ?? '-');
  }

  /**
   * Abre modal en modo creación (sin argumento) o edición (con producto).
   * En edición, normaliza categoria (puede venir como objeto o ID).
   */
  openModal(p?: Producto): void {
    this.editing.set(p ?? null);
    this.form = p 
      ? { ...p, categoria: (p.categoria as any)?.id ?? p.categoria } 
      : {
          nombre: '', marca: '', referencia: '', categoria: undefined,
          unidad_medida: 'Unidad', precio_compra: 0, precio_venta: 0,
          iva_porcentaje: 0, stock_minimo: 0, descripcion: '',
        };
    this.validation.clear();
    this.revokePreview();
    this.selectedImage = null;
    this.removeImage = false;
    this.imagePreview = p?.imagen_url ?? '';
    this.showModal.set(true);
  }

  closeModal(): void {
    if (!this.saving()) {
      this.showModal.set(false);
      this.revokePreview();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.validation.clearField('imagen');
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      this.validation.reject({ imagen: 'Selecciona una imagen PNG, JPG, JPEG o WebP.' });
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.validation.reject({ imagen: 'La imagen no puede superar los 2 MB.' });
      input.value = '';
      return;
    }
    this.revokePreview();
    this.selectedImage = file;
    this.imagePreview = URL.createObjectURL(file);
    this.removeImage = false;
  }

  removeCurrentImage(): void {
    this.revokePreview();
    this.selectedImage = null;
    this.imagePreview = '';
    this.removeImage = true;
  }

  /**
   * Guarda producto (crea o edita según editing()).
   * Validación básica: campos obligatorios deben tener valor.
   */
  save(): void {
    const errors: Record<string, string> = {};
    const productNameError = commercialNameError(this.form.nombre, 'producto');
    const brandError = commercialNameError(this.form.marca, 'marca');
    if (productNameError) errors['nombre'] = productNameError;
    if (brandError) errors['marca'] = brandError;
    if (!String(this.form.referencia ?? '').trim()) errors['referencia'] = 'La referencia es obligatoria.';
    if (!this.form.categoria) errors['categoria'] = 'Selecciona una categoría.';
    if (Number(this.form.precio_compra ?? 0) < 0) errors['precio_compra'] = 'El precio de compra no puede ser negativo.';
    if (Number(this.form.precio_venta ?? 0) < 0) errors['precio_venta'] = 'El precio de venta no puede ser negativo.';
    if (Number(this.form.stock_minimo ?? 0) < 0) errors['stock_minimo'] = 'El stock mínimo no puede ser negativo.';
    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }
    this.validation.clear();
    this.saving.set(true);

    this.form = {
      ...this.form,
      nombre: normalizeSemanticText(this.form.nombre),
      marca: normalizeSemanticText(this.form.marca),
      referencia: normalizeSemanticText(this.form.referencia),
    };
    const payload = new FormData();
    for (const [key, value] of Object.entries(this.form)) {
      if (['id', 'sku', 'stock', 'estado', 'imagen', 'imagen_url', 'creado_por'].includes(key)) continue;
      if (value == null || typeof value === 'object') continue;
      payload.append(key, String(value));
    }
    payload.append('quitar_imagen', String(this.removeImage));
    if (this.selectedImage) payload.append('imagen', this.selectedImage, this.selectedImage.name);

    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, payload)
      : this.svc.crear(payload);

    req.subscribe({
      next: (response) => {
        const wasEditing = Boolean(this.editing());
        const id = Number(response?.producto?.id ?? this.editing()?.id ?? 0) || null;
        this.load();
        this.saving.set(false);
        this.showModal.set(false);
        this.revokePreview();
        this.selectedImage = null;
        this.notifications.success(`Producto ${wasEditing ? 'actualizado' : 'registrado'} satisfactoriamente.`);
        this.highlight(id);
      },
      error: (e) => {
        this.validation.fromHttp(e);
        this.saving.set(false);
      },
    });
  }

  /**
   * Cambia estado del producto con lógica específica:
   * - Activo → Inactivo
   * - Inactivo → Activo
   * - Pendiente → Activo
   * Muestra confirmación antes de ejecutar.
   */
  cambiarEstado(p: Producto): void {
    let nuevoEstado: 'activo' | 'inactivo' | 'pendiente';
    let mensajeAccion: string;

    if (p.estado === 'activo') {
      nuevoEstado = 'inactivo';
      mensajeAccion = 'inactiva';
    } else if (p.estado === 'inactivo') {
      nuevoEstado = 'activo';
      mensajeAccion = 'activa';
    } else {
      // Para productos pendientes, activar directamente
      nuevoEstado = 'activo';
      mensajeAccion = 'activar';
    }

    const mensaje = `¿Estás seguro que deseas ${mensajeAccion} el producto "${p.nombre}"?`;

    if (confirm(mensaje)) {
      console.log(`Cambiando estado de ${p.estado} a ${nuevoEstado}`);

      this.svc.cambiarEstado(p.id!, nuevoEstado).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          // Actualización local + recarga completa para consistencia
          p.estado = nuevoEstado;
          this.load();
          this.notifications.success('Estado del producto actualizado satisfactoriamente.');
        },
        error: (e) => {
          console.error('Error detallado:', e);
          let errorMsg = 'Error al cambiar estado del producto';

          if (e.error?.error) {
            errorMsg = e.error.error;
          } else if (e.error?.message) {
            errorMsg = e.error.message;
          } else if (typeof e.error === 'string') {
            errorMsg = e.error;
          }

          this.notifications.error(errorMsg);
        }
      });
    }
  }

  verDetalle(producto: Producto): void {
    this.detalleProducto.set(producto);
  }

  private highlight(id: number | null): void {
    if (!id) return;
    this.highlightedId.set(id);
    window.setTimeout(() => this.highlightedId.set(null), 3500);
  }

  private revokePreview(): void {
    if (this.imagePreview.startsWith('blob:')) URL.revokeObjectURL(this.imagePreview);
  }
}
