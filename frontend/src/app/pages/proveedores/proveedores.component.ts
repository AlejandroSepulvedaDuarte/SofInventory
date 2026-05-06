import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { ProveedoresService, UsuariosService } from '../../core/services/api.services';
import { Proveedor, TipoDocumento } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.css'],
})
export class ProveedoresComponent implements OnInit {
  proveedores = signal<Proveedor[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);
  showModal = signal(false);
  editing = signal<Proveedor | null>(null);
  saving = signal(false);
  formError = signal('');
  searchTerm = '';
  form: Partial<Proveedor> = {};

  filteredProveedores = computed(() => {
    const t = this.searchTerm.toLowerCase();
    if (!t) return this.proveedores();
    return this.proveedores().filter(p =>
      p.razon_social.toLowerCase().includes(t) ||
      p.numero_documento.includes(t) ||
      p.email.toLowerCase().includes(t)
    );
  });

  constructor(
    private svc: ProveedoresService,
    private usuSvc: UsuariosService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.load();
    this.usuSvc.listarTiposDocumento().subscribe(t => this.tiposDoc.set(t));
  }

  load(): void { this.svc.listar().subscribe(p => this.proveedores.set(p)); }

  openModal(p?: Proveedor): void {
    this.editing.set(p ?? null);
    this.form = p
      ? { ...p, tipo_documento: (p.tipo_documento as any)?.id ?? p.tipo_documento }
      : { tipo_documento: null as any, numero_documento: '', razon_social: '',
          nombre_contacto: '', email: '', telefono: '', direccion: '',
          pais: 'Colombia', departamento: '', ciudad: '',
          tipo_proveedor: 'Bienes', estado: 'Activo' };
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  save(): void {
    if (!this.form.tipo_documento || !this.form.numero_documento || !this.form.razon_social ||
        !this.form.nombre_contacto || !this.form.email || !this.form.telefono ||
        !this.form.pais || !this.form.departamento || !this.form.ciudad || !this.form.direccion) {
      this.formError.set('Completa todos los campos obligatorios del proveedor.');
      return;
    }
    this.saving.set(true);
    const payload = this.editing()
      ? this.form
      : { ...this.form, creado_por: this.auth.currentUser()?.id };
    const req = this.editing()
      ? this.svc.editar(this.editing()!.id!, payload)
      : this.svc.crear(payload);
    req.subscribe({
      next: () => { this.load(); this.closeModal(); this.saving.set(false); },
      error: (e) => { this.formError.set(this.getErrorMessage(e)); this.saving.set(false); },
    });
  }

  cambiarEstado(p: Proveedor): void {
    this.svc.cambiarEstado(p.id!).subscribe(() => this.load());
  }

  eliminar(p: Proveedor): void {
    if (!confirm(`¿Eliminar al proveedor "${p.razon_social}"?`)) return;
    this.svc.eliminar(p.id!).subscribe({
      next: () => this.load(),
      error: (e) => alert(this.getErrorMessage(e)),
    });
  }

  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;
    if (error?.error && typeof error.error === 'object') {
      const [field, firstValue] = Object.entries(error.error)[0] ?? [];
      if (Array.isArray(firstValue)) return field ? `${field}: ${String(firstValue[0])}` : String(firstValue[0]);
      if (typeof firstValue === 'string') return field ? `${field}: ${firstValue}` : firstValue;
    }
    return 'No fue posible guardar la información del proveedor.';
  }
}
/*
 * Pantalla de proveedores.
 * Gestiona aliados comerciales y adapta la creación al backend activo, incluyendo compatibilidad con creado_por.
 */
