import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ClientesService, UsuariosService } from '../../core/services/api.services';
import { Cliente, TipoDocumento } from '../../core/models';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  template: `
    <app-layout>
      <div class="page">
        <div class="page-header">
          <div>
            <h1><i class="fas fa-users"></i> Clientes</h1>
            <p><i class="fas fa-circle-info"></i> {{ clientes().length }} clientes registrados</p>
          </div>
          <div class="header-actions">
            <div class="search-wrapper">
              <i class="fas fa-magnifying-glass search-icon"></i>
              <input type="text" class="search-input" placeholder="Buscar clientes..." [(ngModel)]="searchTerm" />
            </div>
            <button class="btn-primary" (click)="openModal()">
              <i class="fas fa-user-plus"></i>
              Nuevo Cliente
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th><i class="fas fa-address-card"></i> Cliente</th>
                <th><i class="fas fa-id-card"></i> Documento</th>
                <th><i class="fas fa-user-tag"></i> Tipo</th>
                <th><i class="fas fa-layer-group"></i> Categoría</th>
                <th><i class="fas fa-envelope"></i> Contacto</th>
                <th><i class="fas fa-location-dot"></i> Ubicación</th>
                <th><i class="fas fa-circle-half-stroke"></i> Estado</th>
                <th><i class="fas fa-gear"></i> Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of filteredClientes()">
                <td>
                  <div class="entity-cell">
                    <strong>{{ getNombre(c) }}</strong>
                    <small>{{ c.tipo_cliente === 'natural' ? 'Persona natural' : 'Persona jurídica' }}</small>
                  </div>
                </td>
                <td>
                  <code class="sku-code">{{ getDocumento(c) }}</code>
                </td>
                <td>
                  <span class="tipo-badge">
                    <i class="fas" [class.fa-user]="c.tipo_cliente === 'natural'" [class.fa-building]="c.tipo_cliente === 'juridica'"></i>
                    {{ c.tipo_cliente === 'natural' ? 'Natural' : 'Jurídica' }}
                  </span>
                </td>
                <td>{{ formatCategoria(c.categoria) }}</td>
                <td>
                  <div class="contact-cell">
                    <a *ngIf="c.email" class="email-link" [href]="'mailto:' + c.email">
                      <i class="fas fa-envelope icon-muted"></i>{{ c.email }}
                    </a>
                    <span *ngIf="!c.email" class="muted-line">Sin correo</span>
                    <span class="muted-line" *ngIf="c.telefono">
                      <i class="fas fa-phone icon-muted"></i>{{ c.telefono }}
                    </span>
                  </div>
                </td>
                <td>{{ getUbicacion(c) }}</td>
                <td>
                  <span class="badge" [class]="'badge-' + c.estado">{{ c.estado }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon" title="Editar" (click)="openModal(c)">
                      <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon" title="Cambiar estado" (click)="cambiarEstado(c)">
                      <i class="fas fa-arrows-rotate"></i>
                    </button>
                    <button class="btn-icon btn-danger" title="Eliminar" (click)="eliminar(c)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredClientes().length === 0">
                <td colspan="8" class="empty-row"><i class="fas fa-inbox"></i> No se encontraron clientes</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
          <div class="modal modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>
                <i class="fas" [class.fa-pen]="editing()" [class.fa-user-plus]="!editing()"></i>
                {{ editing() ? 'Editar Cliente' : 'Nuevo Cliente' }}
              </h2>
              <button class="close-btn" (click)="closeModal()">
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div class="modal-body">
              <div class="form-grid">
                <div class="field">
                  <label><i class="fas fa-user-tag"></i> Tipo de Cliente *</label>
                  <select [(ngModel)]="form.tipo_cliente">
                    <option value="natural">Persona Natural</option>
                    <option value="juridica">Persona Jurídica</option>
                  </select>
                </div>

                <div class="field">
                  <label><i class="fas fa-layer-group"></i> Categoría</label>
                  <select [(ngModel)]="form.categoria">
                    <option value="general">General</option>
                    <option value="minorista">Minorista</option>
                    <option value="mayorista">Mayorista</option>
                    <option value="corporativo">Corporativo</option>
                  </select>
                </div>

                <div class="field">
                  <label><i class="fas fa-file-lines"></i> Tipo Documento *</label>
                  <select [(ngModel)]="form.tipo_documento">
                    <option [ngValue]="null">Seleccionar...</option>
                    <option *ngFor="let t of tiposDoc()" [ngValue]="t.id">{{ t.codigo }} - {{ t.nombre }}</option>
                  </select>
                </div>

                <div class="field">
                  <label><i class="fas fa-id-card"></i> Número Documento *</label>
                  <input type="text" [(ngModel)]="form.numero_documento" placeholder="Número de documento" />
                </div>

                <ng-container *ngIf="form.tipo_cliente === 'natural'">
                  <div class="field">
                    <label><i class="fas fa-user"></i> Nombres *</label>
                    <input type="text" [(ngModel)]="form.nombres" placeholder="Nombres" />
                  </div>
                  <div class="field">
                    <label><i class="fas fa-user"></i> Apellidos *</label>
                    <input type="text" [(ngModel)]="form.apellidos" placeholder="Apellidos" />
                  </div>
                </ng-container>

                <ng-container *ngIf="form.tipo_cliente === 'juridica'">
                  <div class="field">
                    <label><i class="fas fa-building"></i> Razón Social *</label>
                    <input type="text" [(ngModel)]="form.razon_social" placeholder="Razón social" />
                  </div>
                  <div class="field">
                    <label><i class="fas fa-store"></i> Nombre Comercial</label>
                    <input type="text" [(ngModel)]="form.nombre_comercial" placeholder="Nombre comercial" />
                  </div>
                </ng-container>

                <div class="field">
                  <label><i class="fas fa-envelope"></i> Email</label>
                  <input type="email" [(ngModel)]="form.email" placeholder="correo@ejemplo.com" />
                </div>

                <div class="field">
                  <label><i class="fas fa-phone"></i> Teléfono</label>
                  <input type="text" [(ngModel)]="form.telefono" placeholder="Teléfono principal" />
                </div>

                <div class="field">
                  <label><i class="fas fa-phone-volume"></i> Teléfono 2</label>
                  <input type="text" [(ngModel)]="form.telefono2" placeholder="Teléfono alterno" />
                </div>

                <div class="field">
                  <label><i class="fas fa-map-location-dot"></i> Ciudad</label>
                  <input type="text" [(ngModel)]="form.ciudad" placeholder="Ciudad" />
                </div>

                <div class="field">
                  <label><i class="fas fa-map"></i> Departamento</label>
                  <input type="text" [(ngModel)]="form.departamento" placeholder="Departamento" />
                </div>

                <div class="field">
                  <label><i class="fas fa-earth-americas"></i> País</label>
                  <input type="text" [(ngModel)]="form.pais" placeholder="País" />
                </div>

                <div class="field">
                  <label><i class="fas fa-mail-bulk"></i> Código Postal</label>
                  <input type="text" [(ngModel)]="form.codigo_postal" placeholder="Código postal" />
                </div>

                <div class="field">
                  <label><i class="fas fa-circle-half-stroke"></i> Estado</label>
                  <select [(ngModel)]="form.estado">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>

                <div class="field full">
                  <label><i class="fas fa-location-dot"></i> Dirección</label>
                  <input type="text" [(ngModel)]="form.direccion" placeholder="Dirección" />
                </div>

                <div class="field full">
                  <label><i class="fas fa-clipboard"></i> Notas</label>
                  <textarea [(ngModel)]="form.notas" rows="2" placeholder="Notas adicionales"></textarea>
                </div>
              </div>

              <div class="error-msg" *ngIf="formError()">
                <i class="fas fa-circle-xmark"></i> {{ formError() }}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeModal()">
                <i class="fas fa-xmark"></i> Cancelar
              </button>
              <button class="btn-primary" (click)="save()" [disabled]="saving()">
                <i class="fas" [class.fa-spinner]="saving()" [class.fa-spin]="saving()" [class.fa-floppy-disk]="!saving()"></i>
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
    .page-header h1,
    .page-header p,
    .tipo-badge,
    .email-link,
    .muted-line,
    .entity-cell,
    .contact-cell,
    .error-msg {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .page-header h1 i,
    .icon-muted,
    .search-icon { color: var(--accent); }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-wrapper { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 10px; pointer-events: none; font-size: 13px; }
    .search-input { padding-left: 32px; }
    .entity-cell,
    .contact-cell { flex-direction: column; align-items: flex-start; gap: 2px; }
    .entity-cell strong { color: var(--text-primary); }
    .entity-cell small,
    .muted-line { color: var(--text-muted); font-size: 12px; }
    .email-link { color: var(--accent); text-decoration: none; }
    .email-link:hover { text-decoration: underline; }
    .sku-code { color: var(--text-secondary); }
    .tipo-badge { color: var(--text-secondary); }
    .error-msg { margin-top: 12px; }
  `],
})
export class ClientesComponent implements OnInit {
  clientes = signal<Cliente[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);
  showModal = signal(false);
  editing = signal<Cliente | null>(null);
  saving = signal(false);
  formError = signal('');
  searchTerm = '';
  form: Partial<Cliente> = {};

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

  constructor(private svc: ClientesService, private usuSvc: UsuariosService) {}

  ngOnInit(): void {
    this.load();
    this.usuSvc.listarTiposDocumento().subscribe((tipos) => this.tiposDoc.set(tipos));
  }

  load(): void {
    this.svc.listar().subscribe((clientes) => this.clientes.set(clientes));
  }

  getNombre(c: Cliente): string {
    if (c.tipo_cliente === 'natural') {
      return `${c.nombres ?? ''} ${c.apellidos ?? ''}`.trim() || 'Cliente sin nombre';
    }
    return c.razon_social ?? c.nombre_comercial ?? 'Cliente sin nombre';
  }

  getDocumento(c: Cliente): string {
    const tipo = typeof c.tipo_documento === 'object' ? c.tipo_documento.codigo : '';
    return [tipo, c.numero_documento].filter(Boolean).join(' ');
  }

  formatCategoria(categoria?: string): string {
    if (!categoria) return 'General';
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
  }

  getUbicacion(c: Cliente): string {
    return [c.ciudad, c.departamento].filter((value) => !!value).join(', ') || c.pais || 'Sin ubicación';
  }

  openModal(c?: Cliente): void {
    this.editing.set(c ?? null);
    this.form = c
      ? {
          ...c,
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
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  save(): void {
    if (!this.form.numero_documento || !this.form.tipo_documento) {
      this.formError.set('Tipo y número de documento son obligatorios.');
      return;
    }

    if (this.form.tipo_cliente === 'natural' && (!this.form.nombres || !this.form.apellidos)) {
      this.formError.set('Los nombres y apellidos son obligatorios para persona natural.');
      return;
    }

    if (this.form.tipo_cliente === 'juridica' && !this.form.razon_social) {
      this.formError.set('La razón social es obligatoria para persona jurídica.');
      return;
    }

    this.saving.set(true);
    const request = this.editing()
      ? this.svc.editar(this.editing()!.id!, this.form)
      : this.svc.crear(this.form);

    request.subscribe({
      next: () => {
        this.load();
        this.closeModal();
        this.saving.set(false);
      },
      error: (error) => {
        this.formError.set(this.getErrorMessage(error));
        this.saving.set(false);
      },
    });
  }

  cambiarEstado(c: Cliente): void {
    const nextState = c.estado === 'activo' ? 'inactivo' : c.estado === 'inactivo' ? 'bloqueado' : 'activo';
    this.svc.cambiarEstado(c.id!, nextState).subscribe({
      next: () => this.load(),
      error: (error) => this.formError.set(this.getErrorMessage(error)),
    });
  }

  eliminar(c: Cliente): void {
    if (!confirm(`¿Eliminar al cliente "${this.getNombre(c)}"?`)) return;
    this.svc.eliminar(c.id!).subscribe({
      next: () => this.load(),
      error: (error) => this.formError.set(this.getErrorMessage(error)),
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;
    if (error?.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error)[0];
      if (Array.isArray(firstValue)) return String(firstValue[0]);
      if (typeof firstValue === 'string') return firstValue;
    }
    return 'No fue posible guardar la información del cliente.';
  }
}
/*
 * Pantalla de clientes.
 * Gestiona listado, creación, edición y cambio de estado, adaptando el formulario al contrato del backend.
 */
