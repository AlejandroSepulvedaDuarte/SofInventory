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

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  
  // ── Signals ──────────────────────────────────────────────────────────────
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);
  showModal = signal(false);
  editing = signal<Usuario | null>(null);    // null = creación, con datos = edición
  saving = signal(false);
  formError = signal('');
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

  constructor(private svc: UsuariosService, public auth: AuthService) {}

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
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { 
    this.showModal.set(false); 
  }

  save(): void {
    const required = ['nombre_completo', 'email', 'username', 'rol', 'tipo_documento', 'numero_documento'];
    const missing = required.some(k => !(this.form as any)[k]);
    const documento = String(this.form.numero_documento ?? '').trim();
    const password = String(this.form.password ?? '').trim();
    const confirmPassword = String((this.form as any).confirm_password ?? '').trim();

    if (missing) {
      this.formError.set('Completa todos los campos obligatorios.');
      return;
    }

    if (!/^[0-9]{1,10}$/.test(documento)) {
      this.formError.set('El número de documento debe contener solo números y máximo 10 caracteres.');
      return;
    }

    if (!this.editing() || password) {
      if (!password) {
        this.formError.set('La contraseña es obligatoria.');
        return;
      }
      if (!confirmPassword) {
        this.formError.set('Confirma la contraseña.');
        return;
      }
      if (password !== confirmPassword) {
        this.formError.set('Las contraseñas no coinciden.');
        return;
      }
    }

    this.saving.set(true);

    const payload: any = { ...this.form, numero_documento: documento };
    if (this.editing() && !password) {
      delete payload.password;
      delete payload.confirm_password;
    }

    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, payload)
      : this.svc.crear(payload);

    req.subscribe({
      next: () => {
        this.load();
        this.closeModal();
        this.saving.set(false);
      },
      error: (e) => {
        this.formError.set(this.formatFormError(e.error));
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

  allowOnlyNumbers(event: KeyboardEvent): void {
    const allowedKeys = ['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'];
    if (allowedKeys.includes(event.key)) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Cambia entre activo ↔ inactivo
  cambiarEstado(u: Usuario): void {
    this.svc.cambiarEstado(u.id!).subscribe(() => this.load());
  }

  eliminar(u: Usuario): void {
    if (!confirm(`¿Eliminar al usuario "${u.username}"? Esta acción no se puede deshacer.`)) return;
    this.svc.eliminar(u.id!).subscribe({
      next: () => this.load(),
      error: (e) => alert(e.error?.error ?? 'Error al eliminar'),
    });
  }

  desbloquear(u: Usuario): void {
    if (!this.auth.isAdmin()) {
      alert('No tienes permisos para desbloquear cuentas.');
      return;
    }

    if (!confirm(`¿Desbloquear la cuenta del usuario "${u.username}"?`)) return;

    this.svc.desbloquear(u.id!).subscribe({
      next: () => {
        alert('Cuenta desbloqueada correctamente.');
        this.load();
      },
      error: (e) => {
        alert(e.error?.error ?? 'Error al desbloquear la cuenta');
      }
    });
  }
}
