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
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.css']
})
export class ClientesComponent implements OnInit {

  // ── Signals ──────────────────────────────────────────────────────────────
  clientes = signal<Cliente[]>([]);
  tiposDoc = signal<TipoDocumento[]>([]);      // Catálogo de tipos (CC, NIT, CE)
  showModal = signal(false);
  editing = signal<Cliente | null>(null);      // null = creación, con datos = edición
  saving = signal(false);
  formError = signal('');

  searchTerm = '';
  form: Partial<Cliente> = {};

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

  constructor(private svc: ClientesService, private usuSvc: UsuariosService) {}

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
    return (
      [c.ciudad, c.departamento].filter((value) => !!value).join(', ') ||
      c.pais ||
      'Sin ubicación'
    );
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
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  save(): void {
    // Validaciones según tipo de cliente
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

  // Ciclo: activo → inactivo → bloqueado → activo
  cambiarEstado(c: Cliente): void {
    const nextState =
      c.estado === 'activo'    ? 'inactivo'  :
      c.estado === 'inactivo'  ? 'bloqueado' : 'activo';

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

  // Normaliza errores del backend: error.error → mensaje → campo específico
  private getErrorMessage(error: any): string {
    if (typeof error?.error?.error   === 'string') return error.error.error;
    if (typeof error?.error?.mensaje === 'string') return error.error.mensaje;

    if (error?.error && typeof error.error === 'object') {
      const firstValue = Object.values(error.error)[0];
      if (Array.isArray(firstValue))       return String(firstValue[0]);
      if (typeof firstValue === 'string')  return firstValue;
    }

    return 'No fue posible guardar la información del cliente.';
  }
}