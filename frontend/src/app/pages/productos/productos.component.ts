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

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit {
  
  // ── Señales de estado ──────────────────────────────────────────
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  showModal = signal(false);
  editing = signal<Producto | null>(null);   // null = creación, con datos = edición
  saving = signal(false);
  formError = signal('');
  
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

  constructor(private svc: ProductosService) { }

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
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  /**
   * Guarda producto (crea o edita según editing()).
   * Validación básica: campos obligatorios deben tener valor.
   */
  save(): void {
    if (!this.form.nombre || !this.form.marca || !this.form.referencia || !this.form.categoria) {
      this.formError.set('Completa los campos obligatorios.');
      return;
    }
    
    this.saving.set(true);
    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, this.form)
      : this.svc.crear(this.form);

    req.subscribe({
      next: () => {
        this.load();
        this.closeModal();
        this.saving.set(false);
      },
      error: (e) => {
        this.formError.set(e.error?.error ?? 'Error al guardar');
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
          alert(`Producto ${mensajeAccion}do correctamente`);
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

          alert(errorMsg);
        }
      });
    }
  }
}