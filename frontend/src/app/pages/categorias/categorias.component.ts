/**
 * @component CategoriasComponent
 * @description
 * Pantalla de gestión de categorías de productos.
 * Permite listar todas las categorías existentes, crear nuevas mediante un modal
 * y eliminar las que ya no se necesiten.
 *
 * Usa Signals de Angular (>= 17) para manejar el estado reactivo de la vista.
 */
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ProductosService } from '../../core/services/api.services';
import { Categoria } from '../../core/models';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {

  //Signals 
  categorias = signal<Categoria[]>([]);
  showModal = signal(false);
  saving = signal(false);
  formError = signal('');

  //Formulario 
  form: Partial<Categoria> = {};

  // Opciones para tipo_control (sincronizadas con backend)
  tiposControl = [
    { value: 'GENERAL',     label: 'General'      },
    { value: 'HERRAMIENTA', label: 'Herramienta'  },
    { value: 'ELECTRICO',   label: 'Eléctrico'    },
    { value: 'LIQUIDO',     label: 'Líquido'      },
    { value: 'TORNILLERIA', label: 'Tornillería'  },
  ];

  constructor(private svc: ProductosService) {}

  ngOnInit(): void {
    this.load();
  }

  // ── Carga de datos 
  load(): void {
    this.svc.listarCategorias().subscribe(c => this.categorias.set(c));
  }

  // ── Modal 
  openModal(): void {
    this.form = { nombre: '', tipo_control: 'GENERAL', descripcion: '' };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  //CRUD 
  save(): void {
    if (!this.form.nombre) {
      this.formError.set('El nombre es obligatorio.');
      return;
    }

    this.saving.set(true);

    this.svc.crearCategoria(this.form).subscribe({
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

  eliminar(c: Categoria): void {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;

    this.svc.eliminarCategoria(c.id!).subscribe({
      next: () => this.load(),
      error: (e) => {
        const msg = e.error?.error || e.error?.detail || 'Error al eliminar';
        alert(msg);
      },
    });
  }
}