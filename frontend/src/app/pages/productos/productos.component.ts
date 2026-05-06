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
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  showModal = signal(false);
  editing = signal<Producto | null>(null);
  saving = signal(false);
  formError = signal('');
  searchTerm = signal('');
  filtroEstado = signal('');

  form: Partial<Producto> = {};

  unidades = ['Unidad', 'Caja', 'Metro', 'Litro', 'Galon', 'Rollo', 'Bulto', 'Kilo'];

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
    this.svc.listarCategorias().subscribe(c => this.categorias.set(c));
  }

  load(): void {
    this.svc.listar().subscribe(p => this.productos.set(p));
  }

  getCatNombre(cat: any): string {
    return typeof cat === 'object' ? cat?.nombre : (this.categorias().find(c => c.id === cat)?.nombre ?? '-');
  }

  openModal(p?: Producto): void {
    this.editing.set(p ?? null);
    this.form = p ? { ...p, categoria: (p.categoria as any)?.id ?? p.categoria } : {
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

  // Cambiar estado del producto
  cambiarEstado(p: Producto): void {
    // Determinar el nuevo estado con tipos correctos
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
          // Actualizar el estado localmente
          p.estado = nuevoEstado;
          // Recargar la lista para asegurar consistencia
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
/*
 * Pantalla de productos.
 * Gestiona catálogo, búsqueda, filtros y cambios de estado de los productos del sistema.
 */
