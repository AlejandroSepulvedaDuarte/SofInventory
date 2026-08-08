/**
 * @component ProveedoresComponent
 * @description
 * Pantalla de gestión de proveedores (CRUD completo).
 * Maneja listado, búsqueda, creación, edición, cambio de estado (Activo/Inactivo)
 * y eliminación lógica de proveedores.
 * 
 * El formulario incluye datos de contacto, ubicación geográfica y tipo de proveedor
 * (Bienes/Servicios/Mixto). Los tipos de documento se cargan desde catálogo externo.
 */

import { Component, OnInit, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ProveedoresService, UsuariosService } from '../../core/services/api.services';
import { Proveedor, TipoDocumento } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import {
  commercialNameError,
  documentNumberError,
  jobTitleError,
  normalizeSemanticText,
  personNameError,
} from '../../shared/forms/semantic-validators';
import { NotificationService } from '../../shared/notifications/notification.service';
import { LocationFieldsComponent } from '../../shared/locations/location-fields.component';
import { LocationValue } from '../../shared/locations/location-form';
import { FormHelpComponent } from '../../shared/form-help/form-help.component';
import { FORM_HELP_CONTENT } from '../../shared/form-help/form-help-content';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective, LocationFieldsComponent, FormHelpComponent],
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.css'],
})
export class ProveedoresComponent implements OnInit {
  readonly providerHelp = FORM_HELP_CONTENT.provider;

  @ViewChild(LocationFieldsComponent) private locationFields?: LocationFieldsComponent;
  
  // ── Señales de estado ──────────────────────────────────────────
  proveedores = signal<Proveedor[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);     // Catálogo de tipos (CC, NIT, CE, etc.)
  showModal = signal(false);
  editing = signal<Proveedor | null>(null);   // null = modo creación, con datos = edición
  saving = signal(false);
  readonly validation: FormFeedbackState;
  
  searchTerm = '';  // No es señal, pero se usa en computed
  form: Partial<Proveedor> = {};
  location: LocationValue = { pais: 'Colombia', departamento: '', ciudad: '' };

  /**
   * Búsqueda reactiva en frontend.
   * Filtra por: razón social, número documento o email.
   * Se actualiza automáticamente al cambiar searchTerm.
   */
  filteredProveedores = computed(() => {
    const t = this.searchTerm.toLowerCase();
    if (!t) return this.proveedores();
    return this.proveedores().filter(p =>
      p.razon_social.toLowerCase().includes(t) ||
      p.numero_documento.includes(t) ||
      p.email.toLowerCase().includes(t) ||
      p.ciudad.toLowerCase().includes(t) ||
      p.departamento.toLowerCase().includes(t) ||
      p.pais.toLowerCase().includes(t)
    );
  });

  constructor(
    private svc: ProveedoresService,
    private usuSvc: UsuariosService,
    private auth: AuthService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(feedback, 'No fue posible guardar el proveedor. Revisa los campos señalados.', '.provider-form-modal');
  }

  ngOnInit(): void {
    this.load();
    // Carga catálogo de tipos de documento (CC, NIT, etc.)
    this.usuSvc.listarTiposDocumento().subscribe(t => this.tiposDoc.set(t));
  }

  load(): void { 
    this.svc.listar().subscribe(p => this.proveedores.set(p)); 
  }

  getUbicacion(proveedor: Proveedor): string {
    return [proveedor.ciudad, proveedor.departamento, proveedor.pais]
      .filter((value) => Boolean(value))
      .join(', ') || 'Sin ubicación';
  }

  /**
   * Abre modal en modo creación (sin argumento) o edición (con proveedor).
   * En modo edición, transforma tipo_documento (puede venir como objeto o ID).
   */
  openModal(p?: Proveedor): void {
    this.editing.set(p ?? null);
    this.form = p
      ? { ...p, tipo_documento: (p.tipo_documento as any)?.id ?? p.tipo_documento }
      : { tipo_documento: null as any, numero_documento: '', razon_social: '',
          nombre_contacto: '', email: '', telefono: '', direccion: '',
          pais: 'Colombia', departamento: '', ciudad: '',
          tipo_proveedor: 'Bienes', estado: 'Activo' };
    this.validation.clear();
    this.location = {
      pais: String(this.form.pais ?? ''),
      departamento: String(this.form.departamento ?? ''),
      ciudad: String(this.form.ciudad ?? ''),
    };
    this.showModal.set(true);
  }

  closeModal(): void { 
    if (!this.saving()) this.showModal.set(false);
  }

  /**
   * Guarda proveedor (crea o edita según editing()).
   * Validación en frontend: todos los campos obligatorios deben tener valor.
   * En creación, asigna creado_por con el ID del usuario logueado.
   */
  save(): void {
    const numero = String(this.form.numero_documento ?? '').trim();
    const errors: Record<string, string> = {};
    if (!this.form.tipo_documento) errors['tipo_documento'] = 'Selecciona un tipo de documento.';
    const documentError = documentNumberError(numero, this.selectedDocumentTypeCode());
    if (documentError) errors['numero_documento'] = documentError;
    const required: Array<[string, unknown, string]> = [
      ['email', this.form.email, 'El correo electrónico es obligatorio.'],
      ['telefono', this.form.telefono, 'El teléfono es obligatorio.'],
      ['direccion', this.form.direccion, 'La dirección es obligatoria.'],
    ];
    for (const [field, value, message] of required) if (!String(value ?? '').trim()) errors[field] = message;
    const businessNameError = commercialNameError(this.form.razon_social, 'razon_social');
    const contactNameError = personNameError(this.form.nombre_contacto, 'nombre_contacto');
    const contactJobError = jobTitleError(this.form.cargo_contacto);
    if (businessNameError) errors['razon_social'] = businessNameError;
    if (contactNameError) errors['nombre_contacto'] = contactNameError;
    if (contactJobError) errors['cargo_contacto'] = contactJobError;
    Object.assign(
      errors,
      this.locationFields?.validate() ?? {
        pais: 'No fue posible validar la ubicación del proveedor.',
      },
    );
    if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(this.form.email))) errors['email'] = 'El formato del correo electrónico no es válido.';
    if (this.form.telefono && !/^[0-9]{1,15}$/.test(String(this.form.telefono))) errors['telefono'] = 'El teléfono debe contener solo números y máximo 15 dígitos.';
    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }
    this.validation.clear();
    this.saving.set(true);

    const normalizedLocation = this.locationFields!.normalizedValue();

    this.form = {
      ...this.form,
      numero_documento: numero,
      razon_social: normalizeSemanticText(this.form.razon_social),
      nombre_contacto: normalizeSemanticText(this.form.nombre_contacto),
      cargo_contacto: normalizeSemanticText(this.form.cargo_contacto),
      ...normalizedLocation,
    };
    
    // Modo edición: envía form directamente
    // Modo creación: agrega creado_por con ID del usuario actual
    const payload = this.editing()
      ? this.form
      : { ...this.form, creado_por: this.auth.currentUser()?.id };
    
    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, payload)
      : this.svc.crear(payload);
    
    req.subscribe({
      next: () => {
        const wasEditing = Boolean(this.editing());
        this.load(); 
        this.saving.set(false); 
        this.showModal.set(false);
        this.notifications.success(`Proveedor ${wasEditing ? 'actualizado' : 'registrado'} satisfactoriamente.`);
      },
      error: (e) => { 
        this.validation.fromHttp(e);
        this.saving.set(false); 
      },
    });
  }

  /**
   * Cambia estado del proveedor (Activo ↔ Inactivo).
   * No requiere confirmación previa (acción rápida).
   */
  cambiarEstado(p: Proveedor): void {
    this.svc.cambiarEstado(p.id!).subscribe({
      next: () => { this.load(); this.notifications.success('Estado del proveedor actualizado satisfactoriamente.'); },
      error: (e) => this.notifications.error(this.getErrorMessage(e)),
    });
  }

  /**
   * Elimina proveedor (borrado físico, no recomendado para producción).
   * Requiere confirmación explícita del usuario.
   */
  eliminar(p: Proveedor): void {
    if (!confirm(`¿Eliminar al proveedor "${p.razon_social}"?`)) return;
    this.svc.eliminar(p.id!).subscribe({
      next: () => { this.load(); this.notifications.success('Proveedor eliminado satisfactoriamente.'); },
      error: (e) => this.notifications.error(this.getErrorMessage(e)),
    });
  }

  /**
   * Normaliza errores del backend a mensajes legibles.
   * Prioridad: error.error.error → error.error.mensaje → primer campo de validación
   */
  selectedDocumentTypeCode(): string {
    const selected = this.form.tipo_documento;
    if (selected && typeof selected === 'object') return selected.codigo;
    return this.tiposDoc().find((type) => String(type.id) === String(selected))?.codigo ?? '';
  }

  numeroDocumentoMessage(): string {
    const validationMessage = this.validation.error('numero_documento');
    if (validationMessage) return validationMessage;
    const numero = String(this.form.numero_documento ?? '');
    return numero ? documentNumberError(numero, this.selectedDocumentTypeCode()) : '';
  }

  isTelefonoValido(telefono: string | undefined | null): boolean {
    if (!telefono) return false;
    return /^[0-9]{1,15}$/.test(String(telefono));
  }

  telefonoMessage(): string {
    const validationMessage = this.validation.error('telefono');
    if (validationMessage) return validationMessage;
    const telefono = String(this.form.telefono ?? '');
    return telefono && !this.isTelefonoValido(telefono)
      ? 'El teléfono debe contener solo números y máximo 15 dígitos.'
      : '';
  }

  onTelefonoInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    let v = String(el.value || '');
    v = v.replace(/\D/g, '').slice(0, 15);
    el.value = v;
    this.form.telefono = v;
  }

  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;
    if (error?.error && typeof error.error === 'object') {
      const fieldMap: Record<string, string> = {
        'numero_documento': 'Número de documento',
        'email': 'Correo electrónico',
        'razon_social': 'Razón social',
        'nombre_contacto': 'Nombre de contacto',
        'telefono': 'Teléfono',
      };
      const parts: string[] = [];
      for (const [field, val] of Object.entries(error.error)) {
        let msg = '';
        if (Array.isArray(val) && val.length) msg = String(val[0]);
        else msg = String(val);
        const label = fieldMap[field] ?? (field ? field.replace('_', ' ') : 'Error');
        parts.push(`${label}: ${msg}`);
      }
      if (parts.length) return parts.join('. ');
    }
    return 'No fue posible guardar la información del proveedor.';
  }
}

