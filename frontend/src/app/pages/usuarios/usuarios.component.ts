import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { UsuariosService } from '../../core/services/api.services';
import { Usuario, Rol, TipoDocumento } from '../../core/models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="page">
        <div class="page-header">
          <div>
            <h1>Usuarios</h1>
            <p>{{ usuarios().length }} usuarios registrados</p>
          </div>
          <div class="header-actions">
            <input type="text" class="search-input" placeholder="🔍 Buscar..." [(ngModel)]="searchTerm" />
            <button class="btn-primary" (click)="openModal()">+ Nuevo Usuario</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha Creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of filteredUsuarios()">
                <td><code>{{ u.username }}</code></td>
                <td>{{ u.nombre_completo }}</td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="badge badge-activo">{{ getRolNombre(u.rol) }}</span>
                </td>
                <td>
                  <span class="badge" [class]="u.estado === 'activo' ? 'badge-activo' : 'badge-inactivo'">
                    {{ u.estado }}
                  </span>
                </td>
                <td>{{ u.fecha_creacion }}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon" title="Editar" (click)="openModal(u)">✏️</button>
                    <button class="btn-icon" title="Cambiar estado" (click)="cambiarEstado(u)">🔄</button>
                    <button class="btn-icon btn-danger" title="Eliminar" (click)="eliminar(u)">🗑️</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsuarios().length === 0">
                <td colspan="7" class="empty-row">No se encontraron usuarios</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal -->
        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editing() ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
              <button class="close-btn" (click)="closeModal()">✕</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="field">
                  <label>Tipo Documento *</label>
                  <select [(ngModel)]="form.tipo_documento">
                    <option value="">Seleccionar...</option>
                    <option *ngFor="let t of tiposDoc()" [value]="t.id">{{ t.codigo }} - {{ t.nombre }}</option>
                  </select>
                </div>
                <div class="field">
                  <label>Número Documento *</label>
                  <input type="text" [(ngModel)]="form.numero_documento" placeholder="Número de documento" />
                </div>
                <div class="field">
                  <label>Nombre Completo *</label>
                  <input type="text" [(ngModel)]="form.nombre_completo" placeholder="Nombre completo" />
                </div>
                <div class="field">
                  <label>Email *</label>
                  <input type="email" [(ngModel)]="form.email" placeholder="correo@empresa.com" />
                </div>
                <div class="field">
                  <label>Username *</label>
                  <input type="text" [(ngModel)]="form.username" placeholder="nombre.usuario" />
                </div>
                <div class="field">
                  <label>{{ editing() ? 'Nueva Contraseña (opcional)' : 'Contraseña *' }}</label>
                  <input type="password" [(ngModel)]="form.password" [placeholder]="editing() ? 'Dejar vacío para no cambiar' : 'Contraseña'" />
                </div>
                <div class="field">
                  <label>Rol *</label>
                  <select [(ngModel)]="form.rol">
                    <option value="">Seleccionar...</option>
                    <option *ngFor="let r of roles()" [value]="r.id">{{ r.nombre }}</option>
                  </select>
                </div>
                <div class="field">
                  <label>Fecha Creación *</label>
                  <input type="date" [(ngModel)]="form.fecha_creacion" />
                </div>
                <div class="field full">
                  <label>Observaciones</label>
                  <textarea [(ngModel)]="form.observaciones" rows="2" placeholder="Observaciones adicionales"></textarea>
                </div>
              </div>
              <div class="error-msg" *ngIf="formError()">{{ formError() }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">Cancelar</button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                {{ saving() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </app-layout>
  `,
  styles: [`
    .page { padding: 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .page-header h1 { font-family: var(--font-display); font-size: 26px; color: var(--text-primary); margin: 0 0 4px; }
    .page-header p { color: var(--text-muted); font-size: 13px; margin: 0; }
    .header-actions { display: flex; gap: 12px; }
  `],
})
export class UsuariosComponent implements OnInit {
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);
  showModal = signal(false);
  editing = signal<Usuario | null>(null);
  saving = signal(false);
  formError = signal('');
  searchTerm = '';
  form: Partial<Usuario> = {};

  filteredUsuarios = computed(() => {
    const t = this.searchTerm.toLowerCase();
    if (!t) return this.usuarios();
    return this.usuarios().filter(u =>
      u.username.toLowerCase().includes(t) ||
      u.nombre_completo.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t)
    );
  });

  constructor(private svc: UsuariosService) {}

  ngOnInit(): void {
    this.load();
    this.svc.listarRoles().subscribe(r => this.roles.set(r));
    this.svc.listarTiposDocumento().subscribe(t => this.tiposDoc.set(t));
  }

  load(): void { this.svc.listar().subscribe(u => this.usuarios.set(u)); }

  getRolNombre(rol: any): string {
    return typeof rol === 'object' ? rol?.nombre : (this.roles().find(r => r.id === rol)?.nombre ?? String(rol));
  }

  openModal(u?: Usuario): void {
    this.editing.set(u ?? null);
    const today = new Date().toISOString().split('T')[0];
    this.form = u
      ? {
          ...u,
          tipo_documento: (u.tipo_documento as any)?.id ?? u.tipo_documento,
          rol: (u.rol as any)?.id ?? u.rol,
          password: '',
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

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const required = ['nombre_completo', 'email', 'username', 'rol', 'tipo_documento', 'numero_documento'];
    const missing = required.some(k => !(this.form as any)[k]);
    if (missing || (!this.editing() && !this.form.password)) {
      this.formError.set('Completa todos los campos obligatorios.');
      return;
    }
    this.saving.set(true);

    // Remove empty password on edit
    const payload = { ...this.form };
    if (this.editing() && !payload.password) delete payload.password;

    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, payload)
      : this.svc.crear(payload);

    req.subscribe({
      next: () => { this.load(); this.closeModal(); this.saving.set(false); },
      error: (e) => { this.formError.set(e.error?.error ?? JSON.stringify(e.error)); this.saving.set(false); },
    });
  }

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
}
/*
 * Pantalla de usuarios.
 * Permite administración de cuentas internas, roles y estados para los perfiles del sistema.
 */
