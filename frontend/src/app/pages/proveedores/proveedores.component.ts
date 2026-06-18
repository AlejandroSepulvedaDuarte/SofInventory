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
  
  // ── Señales de estado ──────────────────────────────────────────
  proveedores = signal<Proveedor[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);     // Catálogo de tipos (CC, NIT, CE, etc.)
  showModal = signal(false);
  editing = signal<Proveedor | null>(null);   // null = modo creación, con datos = edición
  saving = signal(false);
  formError = signal('');
  
  searchTerm = '';  // No es señal, pero se usa en computed
  form: Partial<Proveedor> = {};

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
    // Carga catálogo de tipos de documento (CC, NIT, etc.)
    this.usuSvc.listarTiposDocumento().subscribe(t => this.tiposDoc.set(t));
  }

  load(): void { 
    this.svc.listar().subscribe(p => this.proveedores.set(p)); 
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
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { 
    this.showModal.set(false); 
  }

  /**
   * Guarda proveedor (crea o edita según editing()).
   * Validación en frontend: todos los campos obligatorios deben tener valor.
   * En creación, asigna creado_por con el ID del usuario logueado.
   */
  save(): void {
    // Validación de documento: solo números y máximo 10 dígitos
    const numero = String(this.form.numero_documento ?? '').trim();
    if (!/^[0-9]{1,10}$/.test(numero)) {
      this.formError.set('El número de documento debe contener solo números y máximo 10 dígitos.');
      return;
    }

    // Validación de campos obligatorios
    if (!this.form.tipo_documento || !this.form.numero_documento || !this.form.razon_social ||
        !this.form.nombre_contacto || !this.form.email || !this.form.telefono ||
        !this.form.pais || !this.form.departamento || !this.form.ciudad || !this.form.direccion) {
      this.formError.set('Completa todos los campos obligatorios del proveedor.');
      return;
    }
    
    this.saving.set(true);
    
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
        this.load(); 
        this.closeModal(); 
        this.saving.set(false); 
      },
      error: (e) => { 
        this.formError.set(this.getErrorMessage(e)); 
        this.saving.set(false); 
      },
    });
  }

  /**
   * Cambia estado del proveedor (Activo ↔ Inactivo).
   * No requiere confirmación previa (acción rápida).
   */
  cambiarEstado(p: Proveedor): void {
    this.svc.cambiarEstado(p.id!).subscribe(() => this.load());
  }

  /**
   * Elimina proveedor (borrado físico, no recomendado para producción).
   * Requiere confirmación explícita del usuario.
   */
  eliminar(p: Proveedor): void {
    if (!confirm(`¿Eliminar al proveedor "${p.razon_social}"?`)) return;
    this.svc.eliminar(p.id!).subscribe({
      next: () => this.load(),
      error: (e) => alert(this.getErrorMessage(e)),
    });
  }

  /**
   * Normaliza errores del backend a mensajes legibles.
   * Prioridad: error.error.error → error.error.mensaje → primer campo de validación
   */
  isNumeroDocumentoValido(numero: string | undefined | null): boolean {
    if (!numero) return false;
    return /^[0-9]{1,10}$/.test(String(numero));
  }

  onNumeroInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    let v = String(el.value || '');
    v = v.replace(/\D/g, '').slice(0, 10);
    el.value = v;
    this.form.numero_documento = v;
  }

  isTelefonoValido(telefono: string | undefined | null): boolean {
    if (!telefono) return false;
    return /^[0-9]{1,15}$/.test(String(telefono));
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

