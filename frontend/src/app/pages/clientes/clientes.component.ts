/**
 * @component ClientesComponent
 * @description
 * Pantalla de gestión de clientes.
 * Soporta listar, buscar, crear, editar, cambiar estado y eliminar clientes.
 *
 * El formulario es dinámico: adapta sus campos obligatorios según el tipo de cliente
 * (persona natural → nombres/apellidos | persona jurídica → razón social).
 * Usa Signals y computed() de Angular (>= 17) para el estado reactivo y el filtrado.
 */
import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ClientesService, UsuariosService } from '../../core/services/api.services';
import { Cliente, TipoDocumento } from '../../core/models';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import {
  commercialNameError,
  documentNumberError,
  normalizeSemanticText,
  personNameError,
} from '../../shared/forms/semantic-validators';
import { NotificationService } from '../../shared/notifications/notification.service';
import { LocationFieldsComponent } from '../../shared/locations/location-fields.component';
import { LocationValue } from '../../shared/locations/location-form';
import { FormHelpComponent } from '../../shared/form-help/form-help.component';
import { FORM_HELP_CONTENT } from '../../shared/form-help/form-help-content';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective, LocationFieldsComponent, FormHelpComponent],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {
  readonly clientHelp = FORM_HELP_CONTENT.client;

  @ViewChild(LocationFieldsComponent) private locationFields?: LocationFieldsComponent;

  // ── Signals ──────────────────────────────────────────────────────────────
  clientes = signal<Cliente[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);      // Catálogo de tipos (CC, NIT, CE)
  showModal = signal(false);
  editing = signal<Cliente | null>(null);      // null = creación, con datos = edición
  saving = signal(false);
  readonly validation: FormFeedbackState;
  highlightedId = signal<number | null>(null);

  searchTerm = '';
  form: Partial<Cliente> = {};
  location: LocationValue = { pais: 'Colombia', departamento: '', ciudad: '' };

  // Búsqueda por: nombre, documento, email, teléfono o ciudad
  filteredClientes = computed(() => {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.clientes();

    return this.clientes().filter((cliente) =>
      [
        this.getNombre(cliente),
        cliente.numero_documento,
        cliente.email ?? '',
        cliente.telefono ?? '',
        cliente.ciudad ?? '',
      ].some((value) => value.toLowerCase().includes(term))
    );
  });

  constructor(
    private svc: ClientesService,
    private usuSvc: UsuariosService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(feedback, 'No fue posible guardar el cliente. Revisa los campos señalados.', '.client-form-modal');
  }

  ngOnInit(): void {
    this.load();
    this.usuSvc.listarTiposDocumento().subscribe((tipos) => this.tiposDoc.set(tipos));
  }

  load(): void {
    this.svc.listar().subscribe((clientes) => this.clientes.set(clientes));
  }

  // ── Helpers de presentación ──────────────────────────────────────────────

  // Natural: "Nombres Apellidos" | Jurídica: razón social o nombre comercial
  getNombre(c: Cliente): string {
    if (c.tipo_cliente === 'natural') {
      return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim() || 'Cliente sin nombre';
    }
    return c.razon_social ?? c.nombre_comercial ?? 'Cliente sin nombre';
  }

  // Formato: "CC 123456789"
  getDocumento(c: Cliente): string {
    const tipo = typeof c.tipo_documento === 'object' ? c.tipo_documento.codigo : '';
    return [tipo, c.numero_documento].filter(Boolean).join(' ');
  }

  // Capitaliza primera letra: 'mayorista' → 'Mayorista'
  formatCategoria(categoria?: string): string {
    if (!categoria) return 'General';
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
  }

  // Compone ubicación: "Medellín, Antioquia"
  getUbicacion(c: Cliente): string {
    return [c.ciudad, c.departamento, c.pais]
      .filter((value) => Boolean(value))
      .join(', ') || 'Sin ubicación';
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  // Abre modal: sin argumento = nuevo, con cliente = edición
  openModal(c?: Cliente): void {
    this.editing.set(c ?? null);
    this.form = c
      ? {
          ...c,
          // Normaliza tipo_documento de objeto a ID para el select
          tipo_documento: (c.tipo_documento as TipoDocumento)?.id ?? c.tipo_documento,
        }
      : {
          tipo_cliente: 'natural',
          categoria: 'general',
          tipo_documento: null as any,
          numero_documento: '',
          nombres: '',
          apellidos: '',
          razon_social: '',
          nombre_comercial: '',
          email: '',
          telefono: '',
          telefono2: '',
          direccion: '',
          ciudad: '',
          departamento: '',
          pais: 'Colombia',
          codigo_postal: '',
          estado: 'activo',
          notas: '',
        };
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

  // ── CRUD ─────────────────────────────────────────────────────────────────

  save(): void {
    const numero = String(this.form.numero_documento ?? '').trim();
    const errors: Record<string, string> = {};
    if (!this.form.tipo_cliente) errors['tipo_cliente'] = 'Selecciona un tipo de cliente.';
    if (!this.form.tipo_documento) errors['tipo_documento'] = 'Selecciona un tipo de documento.';
    const documentError = documentNumberError(numero, this.selectedDocumentTypeCode());
    if (documentError) errors['numero_documento'] = documentError;

    if (this.form.tipo_cliente === 'natural') {
      const namesError = personNameError(this.form.nombres, 'nombres');
      const lastNamesError = personNameError(this.form.apellidos, 'apellidos');
      if (namesError) errors['nombres'] = namesError;
      if (lastNamesError) errors['apellidos'] = lastNamesError;
    }
    if (this.form.tipo_cliente === 'juridica') {
      const businessNameError = commercialNameError(this.form.razon_social, 'razon_social');
      const commercialError = commercialNameError(this.form.nombre_comercial, 'nombre_comercial', false);
      if (businessNameError) errors['razon_social'] = businessNameError;
      if (commercialError) errors['nombre_comercial'] = commercialError;
    }
    if (this.form.tipo_cliente === 'juridica' && this.form.razon_social && this.form.nombre_comercial) {
      const razon = String(this.form.razon_social).trim().toLowerCase();
      const nombre = String(this.form.nombre_comercial).trim().toLowerCase();
      if (razon && nombre && razon === nombre) errors['nombre_comercial'] = 'El nombre comercial no debe ser igual a la razón social.';
    }

    const tel = String(this.form.telefono ?? '').trim();
    const tel2 = String(this.form.telefono2 ?? '').trim();
    if (tel && !/^[0-9]{1,15}$/.test(tel)) errors['telefono'] = 'El teléfono debe contener solo números y máximo 15 dígitos.';
    if (tel2 && !/^[0-9]{1,15}$/.test(tel2)) errors['telefono2'] = 'El teléfono alterno debe contener solo números y máximo 15 dígitos.';
    if (tel && tel2 && tel === tel2) errors['telefono2'] = 'Los teléfonos no pueden ser iguales.';

    const email = String(this.form.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors['email'] = 'El formato del correo electrónico no es válido.';

    Object.assign(
      errors,
      this.locationFields?.validate() ?? {
        pais: 'No fue posible validar la ubicación del cliente.',
      },
    );

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
      nombres: normalizeSemanticText(this.form.nombres),
      apellidos: normalizeSemanticText(this.form.apellidos),
      razon_social: normalizeSemanticText(this.form.razon_social),
      nombre_comercial: normalizeSemanticText(this.form.nombre_comercial),
      ...normalizedLocation,
    };

    const request = this.editing()
      ? this.svc.editar(this.editing()!.id!, this.form)
      : this.svc.crear(this.form);

    request.subscribe({
      next: (response) => {
        const wasEditing = Boolean(this.editing());
        const id = Number(response?.cliente?.id ?? this.editing()?.id ?? 0) || null;
        this.load();
        this.saving.set(false);
        this.showModal.set(false);
        this.notifications.success(`Cliente ${wasEditing ? 'actualizado' : 'registrado'} satisfactoriamente.`);
        this.highlight(id);
      },
      error: (error) => {
        this.validation.fromHttp(error);
        this.saving.set(false);
      },
    });
  }

  // Ciclo: activo → inactivo → bloqueado → activo
  cambiarEstado(c: Cliente): void {
    const nextState =
      c.estado === 'activo'    ? 'inactivo'  :
      c.estado === 'inactivo'  ? 'bloqueado' : 'activo';

    this.svc.cambiarEstado(c.id!, nextState).subscribe({
      next: () => { this.load(); this.notifications.success('Estado del cliente actualizado satisfactoriamente.'); },
      error: (error) => this.notifications.error(this.validationMessage(error, 'No fue posible cambiar el estado del cliente.')),
    });
  }

  eliminar(c: Cliente): void {
    if (!confirm(`¿Eliminar al cliente "${this.getNombre(c)}"?`)) return;

    this.svc.eliminar(c.id!).subscribe({
      next: () => { this.load(); this.notifications.success('Cliente eliminado satisfactoriamente.'); },
      error: (error) => this.notifications.error(this.validationMessage(error, 'No fue posible eliminar el cliente.')),
    });
  }

  // ── Inputs helpers: normalizar solo números y límites ─────────────────────
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

  telefonoMessage(field: 'telefono' | 'telefono2'): string {
    const validationMessage = this.validation.error(field);
    if (validationMessage) return validationMessage;
    const telefono = String(this.form[field] ?? '');
    if (!telefono || this.isTelefonoValido(telefono)) return '';
    return field === 'telefono'
      ? 'El teléfono debe contener solo números y máximo 15 dígitos.'
      : 'El teléfono alterno debe contener solo números y máximo 15 dígitos.';
  }

  onTelefonoInput(event: Event, field: 'telefono' | 'telefono2'): void {
    const el = event.target as HTMLInputElement;
    let v = String(el.value || '');
    v = v.replace(/\D/g, '').slice(0, 15);
    el.value = v;
    if (field === 'telefono') {
      this.form.telefono = v;
    } else {
      this.form.telefono2 = v;
    }
  }

  private validationMessage(error: unknown, fallback: string): string {
    return (error as any)?.error?.error ?? (error as any)?.error?.mensaje ?? fallback;
  }

  private highlight(id: number | null): void {
    if (!id) return;
    this.highlightedId.set(id);
    window.setTimeout(() => this.highlightedId.set(null), 3500);
  }
}
