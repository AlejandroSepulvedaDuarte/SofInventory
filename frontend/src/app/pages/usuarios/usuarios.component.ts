/**
 * @component UsuariosComponent
 * @description
 * Pantalla de gestión de usuarios del sistema.
 * Soporta listar, buscar, crear, editar, cambiar estado y eliminar usuarios.
 * 
 * Los roles y tipos de documento se cargan desde el backend al iniciar.
 * En modo edición, la contraseña es opcional (solo se actualiza si se proporciona).
 */
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { UsuariosService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { Usuario, Rol, TipoDocumento } from '../../core/models';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import {
  documentNumberError,
  normalizeSemanticText,
  personNameError,
  usernameError,
} from '../../shared/forms/semantic-validators';
import { NotificationService } from '../../shared/notifications/notification.service';
import { FormHelpComponent } from '../../shared/form-help/form-help.component';
import { FORM_HELP_CONTENT } from '../../shared/form-help/form-help-content';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent, FormErrorSummaryComponent, FieldErrorComponent, FieldValidationDirective, FormHelpComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  readonly userHelp = FORM_HELP_CONTENT.user;
  
  // ── Signals ──────────────────────────────────────────────────────────────
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);
  showModal = signal(false);
  editing = signal<Usuario | null>(null);    // null = creación, con datos = edición
  saving = signal(false);
  readonly validation: FormFeedbackState;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  
  searchTerm = '';
  form: Partial<Usuario> & { confirm_password?: string } = {};

  // Búsqueda por username, nombre completo o email
  filteredUsuarios = computed(() => {
    const t = this.searchTerm.toLowerCase();
    if (!t) return this.usuarios();
    return this.usuarios().filter(u =>
      u.username.toLowerCase().includes(t) ||
      u.nombre_completo.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t)
    );
  });

  constructor(
    private svc: UsuariosService,
    public auth: AuthService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(feedback, 'No fue posible guardar el usuario. Revisa los campos señalados.', '.user-form-modal');
  }

  ngOnInit(): void {
    this.load();
    this.svc.listarRoles().subscribe(r => this.roles.set(r));
    this.svc.listarTiposDocumento().subscribe(t => this.tiposDoc.set(t));
  }

  load(): void { 
    this.svc.listar().subscribe(u => this.usuarios.set(u)); 
  }

  // Resuelve nombre del rol (objeto o ID)
  getRolNombre(rol: any): string {
    return typeof rol === 'object' 
      ? rol?.nombre 
      : (this.roles().find(r => r.id === rol)?.nombre ?? String(rol));
  }

  // Abre modal: sin argumento = nuevo, con usuario = edición
  openModal(u?: Usuario): void {
    this.editing.set(u ?? null);
    const today = new Date().toISOString().split('T')[0];
    const initialForm: any = u
      ? {
          ...u,
          // Normaliza tipo_documento y rol de objeto a ID para los selects
          tipo_documento: (u.tipo_documento as any)?.id ?? u.tipo_documento,
          rol: (u.rol as any)?.id ?? u.rol,
          password: '',  // Limpia contraseña en edición
          confirm_password: '',
        }
      : {
          tipo_documento: undefined as any,
          numero_documento: '',
          nombre_completo: '',
          email: '',
          username: '',
          password: '',
          confirm_password: '',
          rol: undefined as any,
          estado: 'activo',
          fecha_creacion: today,
        };

    this.form = initialForm;
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    this.validation.clear();
    this.showModal.set(true);
  }

  closeModal(): void { 
    if (!this.saving()) this.showModal.set(false);
  }

  save(): void {
    const documento = String(this.form.numero_documento ?? '').trim();
    const nombreCompleto = String(this.form.nombre_completo ?? '');
    const username = String(this.form.username ?? '').trim();
    const password = String(this.form.password ?? '').trim();
    const confirmPassword = String((this.form as any).confirm_password ?? '').trim();
    const errors: Record<string, string> = {};
    if (!this.form.tipo_documento) errors['tipo_documento'] = 'Selecciona un tipo de documento.';
    const documentError = documentNumberError(documento, this.selectedDocumentTypeCode());
    if (documentError) errors['numero_documento'] = documentError;
    const fullNameError = personNameError(nombreCompleto, 'nombre_completo');
    if (fullNameError) errors['nombre_completo'] = fullNameError;
    if (!String(this.form.email ?? '').trim()) errors['email'] = 'El correo electrónico es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(this.form.email))) errors['email'] = 'El formato del correo electrónico no es válido.';
    const usernameValidationError = usernameError(username);
    if (usernameValidationError) errors['username'] = usernameValidationError;
    if (!this.form.rol) errors['rol'] = 'Selecciona un rol.';

    if (!this.editing() || password) {
      if (!password) errors['password'] = 'La contraseña es obligatoria.';
      if (!confirmPassword) errors['confirm_password'] = 'Confirma la contraseña.';
      else if (password !== confirmPassword) errors['confirm_password'] = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }

    this.validation.clear();
    this.saving.set(true);

    const payload: any = {
      ...this.form,
      numero_documento: documento,
      nombre_completo: normalizeSemanticText(nombreCompleto),
      username,
    };
    if (this.editing() && !password) {
      delete payload.password;
      delete payload.confirm_password;
    }

    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, payload)
      : this.svc.crear(payload);

    req.subscribe({
      next: () => {
        const wasEditing = Boolean(this.editing());
        this.load();
        this.saving.set(false);
        this.showModal.set(false);
        this.notifications.success(`Usuario ${wasEditing ? 'actualizado' : 'registrado'} satisfactoriamente.`);
      },
      error: (e) => {
        this.validation.fromHttp(e);
        this.saving.set(false);
      },
    });
  }

  formatFormError(error: any): string {
    if (!error) {
      return 'Error desconocido. Intenta nuevamente.';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error.error) {
      return error.error;
    }

    const messages: string[] = [];
    const fieldMap: Record<string, string> = {
      username: 'El nombre de usuario ya se encuentra registrado.',
      email: 'El correo electrónico ya se encuentra registrado.',
      numero_documento: 'El número de documento ya se encuentra registrado.',
      password: 'La contraseña no es válida o ya está en uso.',
      confirm_password: 'Las contraseñas no coinciden.',
    };

    Object.keys(error).forEach((key) => {
      const value = error[key];
      if (Array.isArray(value)) {
        const rawMessage = value.join(' ');
        messages.push(fieldMap[key] ?? rawMessage);
      } else if (typeof value === 'string') {
        messages.push(fieldMap[key] ?? value);
      }
    });

    return messages.length > 0 ? messages.join(' ') : 'Ocurrió un error. Verifica los datos e intenta nuevamente.';
  }

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  selectedDocumentTypeCode(): string {
    const selected = this.form.tipo_documento;
    if (selected && typeof selected === 'object') return selected.codigo;
    return this.tiposDoc().find((type) => String(type.id) === String(selected))?.codigo ?? '';
  }

  // Cambia entre activo ↔ inactivo
  cambiarEstado(u: Usuario): void {
    this.svc.cambiarEstado(u.id!).subscribe({
      next: () => { this.load(); this.notifications.success('Estado del usuario actualizado satisfactoriamente.'); },
      error: (e) => this.notifications.error(e.error?.error ?? 'No fue posible cambiar el estado del usuario.'),
    });
  }

  eliminar(u: Usuario): void {
    if (!confirm(`¿Eliminar al usuario "${u.username}"? Esta acción no se puede deshacer.`)) return;
    this.svc.eliminar(u.id!).subscribe({
      next: () => { this.load(); this.notifications.success('Usuario eliminado satisfactoriamente.'); },
      error: (e) => this.notifications.error(e.error?.error ?? 'No fue posible eliminar el usuario.'),
    });
  }

  desbloquear(u: Usuario): void {
    if (!this.auth.isAdmin()) {
      this.notifications.error('No tienes permisos para desbloquear cuentas.');
      return;
    }

    if (!confirm(`¿Desbloquear la cuenta del usuario "${u.username}"?`)) return;

    this.svc.desbloquear(u.id!).subscribe({
      next: () => {
        this.notifications.success('Cuenta desbloqueada satisfactoriamente.');
        this.load();
      },
      error: (e) => {
        this.notifications.error(e.error?.error ?? 'No fue posible desbloquear la cuenta.');
      }
    });
  }
}
