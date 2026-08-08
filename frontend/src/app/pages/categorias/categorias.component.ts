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
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import { commercialNameError, normalizeSemanticText } from '../../shared/forms/semantic-validators';
import { NotificationService } from '../../shared/notifications/notification.service';
import { FormHelpComponent } from '../../shared/form-help/form-help.component';
import { FORM_HELP_CONTENT } from '../../shared/form-help/form-help-content';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective, FormHelpComponent],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {
  readonly categoryHelp = FORM_HELP_CONTENT.category;

  //Signals 
  categorias = signal<Categoria[]>([]);
  showModal = signal(false);
  saving = signal(false);
  readonly validation: FormFeedbackState;

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

  constructor(
    private svc: ProductosService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(feedback, 'No fue posible guardar la categoría. Revisa los campos señalados.', '.category-form-modal');
  }

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
    this.validation.clear();
    this.showModal.set(true);
  }

  closeModal(): void {
    if (!this.saving()) this.showModal.set(false);
  }

  //CRUD 
  save(): void {
    const errors: Record<string, string> = {};
    const categoryNameError = commercialNameError(this.form.nombre, 'categoria');
    if (categoryNameError) errors['nombre'] = categoryNameError;
    if (!this.form.tipo_control) errors['tipo_control'] = 'Selecciona un tipo de control.';
    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }

    this.validation.clear();
    this.saving.set(true);

    this.form = { ...this.form, nombre: normalizeSemanticText(this.form.nombre) };

    this.svc.crearCategoria(this.form).subscribe({
      next: () => {
        this.load();
        this.saving.set(false);
        this.showModal.set(false);
        this.notifications.success('Categoría registrada satisfactoriamente.');
      },
      error: (e) => {
        this.validation.fromHttp(e);
        this.saving.set(false);
      },
    });
  }

  eliminar(c: Categoria): void {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;

    this.svc.eliminarCategoria(c.id!).subscribe({
      next: () => { this.load(); this.notifications.success('Categoría eliminada satisfactoriamente.'); },
      error: (e) => {
        const msg = e.error?.error || e.error?.detail || 'Error al eliminar';
        this.notifications.error(msg);
      },
    });
  }
}
