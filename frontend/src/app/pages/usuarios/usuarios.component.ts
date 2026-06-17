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
  
  searchTerm = '';
  form: Partial<Usuario> = {};

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

  constructor(private svc: UsuariosService, private auth: AuthService) {}

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
    this.form = u
      ? {
          ...u,
          // Normaliza tipo_documento y rol de objeto a ID para los selects
          tipo_documento: (u.tipo_documento as any)?.id ?? u.tipo_documento,
          rol: (u.rol as any)?.id ?? u.rol,
          password: '',  // Limpia contraseña en edición
        }
      : {
          tipo_documento: undefined as any,
          numero_documento: '',
          nombre_completo: '',
          email: '',
          username: '',
          password: '',
          rol: undefined as any,
          estado: 'activo',
          fecha_creacion: today,
        };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { 
    this.showModal.set(false); 
  }

  save(): void {
    // Validaciones: campos obligatorios + contraseña requerida en creación
    const required = ['nombre_completo', 'email', 'username', 'rol', 'tipo_documento', 'numero_documento'];
    const missing = required.some(k => !(this.form as any)[k]);
    if (missing || (!this.editing() && !this.form.password)) {
      this.formError.set('Completa todos los campos obligatorios.');
      return;
    }
    
    this.saving.set(true);

    // En edición, elimina password del payload si está vacío (no actualizar)
    const payload = { ...this.form };
    if (this.editing() && !payload.password) delete payload.password;

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
        this.formError.set(e.error?.error ?? JSON.stringify(e.error)); 
        this.saving.set(false); 
      },
    });
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
