import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export type FieldErrors = Record<string, string>;

export interface NormalizedFormError {
  summary: string;
  fieldErrors: FieldErrors;
}

export class FormFeedbackState {
  readonly summary = signal('');
  readonly fields = signal<FieldErrors>({});

  constructor(
    private feedback: FormFeedbackService,
    private fallbackSummary: string,
    private scopeSelector = '.modal'
  ) {}

  clear(): void {
    this.summary.set('');
    this.fields.set({});
  }

  reject(fieldErrors: FieldErrors, summary = this.fallbackSummary): void {
    this.summary.set(summary);
    this.fields.set(fieldErrors);
    this.feedback.focusFirstInvalid(this.scopeSelector);
  }

  fromHttp(error: unknown): void {
    const normalized = this.feedback.normalize(error, this.fallbackSummary);
    this.summary.set(normalized.summary);
    this.fields.set(normalized.fieldErrors);
    if (Object.keys(normalized.fieldErrors).length) this.feedback.focusFirstInvalid(this.scopeSelector);
  }

  error(field: string): string { return this.fields()[field] ?? ''; }
  invalid(field: string): boolean { return Boolean(this.error(field)); }

  clearField(field: string): void {
    if (!this.fields()[field]) return;
    const next = { ...this.fields() };
    delete next[field];
    this.fields.set(next);
    if (!Object.keys(next).length) this.summary.set('');
  }
}

const FIELD_ALIASES: Record<string, string> = {
  proveedor_id: 'proveedor',
  almacen_id: 'almacen',
  almacen_destino_id: 'almacen_destino',
  cliente_id: 'cliente',
  producto_id: 'producto',
  productos: 'detalles',
  tipo_documento_id: 'tipo_documento',
  non_field_errors: 'general',
  detail: 'general',
};

const FIELD_LABELS: Record<string, string> = {
  nombre: 'nombre',
  codigo: 'código',
  sku: 'código',
  marca: 'marca',
  referencia: 'referencia',
  categoria: 'categoría',
  tipo_control: 'tipo de control',
  tipo_cliente: 'tipo de cliente',
  tipo_documento: 'tipo de documento',
  numero_documento: 'número de documento',
  nombre_completo: 'nombre completo',
  nombres: 'nombres',
  apellidos: 'apellidos',
  razon_social: 'razón social',
  nombre_comercial: 'nombre comercial',
  nombre_contacto: 'nombre de contacto',
  cargo_contacto: 'cargo del contacto',
  email: 'correo electrónico',
  telefono: 'teléfono',
  telefono2: 'teléfono alterno',
  direccion: 'dirección',
  pais: 'país',
  departamento: 'departamento',
  ciudad: 'ciudad',
  rol: 'rol',
  estado: 'estado',
  username: 'nombre de usuario',
  password: 'contraseña',
  confirm_password: 'confirmación de contraseña',
  proveedor: 'proveedor',
  almacen: 'almacén',
  almacen_destino: 'almacén destino',
  numero_factura: 'número de factura',
  fecha_compra: 'fecha de compra',
  tipo_compra: 'tipo de compra',
  tipo_proveedor: 'tipo de proveedor',
  cliente: 'cliente',
  metodo_pago: 'método de pago',
  efectivo_recibido: 'efectivo recibido',
  producto: 'producto',
  detalles: 'productos',
  cantidad: 'cantidad',
  precio_compra: 'precio de compra',
  precio_venta: 'precio de venta',
  iva_porcentaje: 'porcentaje de IVA',
  unidad_medida: 'unidad de medida',
  stock_minimo: 'stock mínimo',
  capacidad: 'capacidad',
  fecha_creacion: 'fecha de creación',
  descripcion: 'descripción',
  observaciones: 'observaciones',
  especificaciones: 'especificaciones',
};

@Injectable({ providedIn: 'root' })
export class FormFeedbackService {
  normalize(error: unknown, fallbackSummary: string): NormalizedFormError {
    const response = error instanceof HttpErrorResponse ? error : (error as any);
    const status = Number(response?.status ?? 0);

    if (status === 0) {
      return {
        summary: 'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
        fieldErrors: {},
      };
    }
    if (status === 401 || status === 403) {
      return {
        summary: 'No tienes permisos para realizar esta operación.',
        fieldErrors: {},
      };
    }
    if (status >= 500) {
      return {
        summary: 'No fue posible completar la operación. Inténtalo nuevamente.',
        fieldErrors: {},
      };
    }

    const payload = response?.error ?? response ?? {};
    const fieldErrors = this.extractFieldErrors(payload);
    const explicit = this.extractExplicitMessage(payload);
    const summary = explicit || (Object.keys(fieldErrors).length ? fallbackSummary : fallbackSummary.replace(' Revisa los campos señalados.', '.'));

    return { summary: this.translate(summary), fieldErrors };
  }

  focusFirstInvalid(scopeSelector = '.modal'): void {
    window.setTimeout(() => {
      const scope = document.querySelector<HTMLElement>(scopeSelector);
      const control = scope?.querySelector<HTMLElement>('.is-invalid, [aria-invalid="true"]');
      if (!control) return;
      control.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      window.setTimeout(() => control.focus({ preventScroll: true }), 180);
    });
  }

  private extractFieldErrors(payload: any): FieldErrors {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
    const source = payload.errors && typeof payload.errors === 'object' ? payload.errors : payload;
    const ignored = new Set(['error', 'mensaje', 'message', 'detail', 'status', 'code']);
    const result: FieldErrors = {};

    for (const [rawField, value] of Object.entries(source)) {
      if (ignored.has(rawField)) continue;
      const field = FIELD_ALIASES[rawField] ?? rawField;
      const rawMessage = this.firstMessage(value);
      if (!rawMessage) continue;
      if (field === 'general') continue;
      result[field] = this.translate(rawMessage, field);
    }

    const explicit = this.extractExplicitMessage(payload);
    if (explicit) {
      const prefixed = explicit.match(/^([a-zA-Z_]+)\s*:\s*(.+)$/);
      if (prefixed) {
        const field = FIELD_ALIASES[prefixed[1]] ?? prefixed[1];
        if (field !== 'general') result[field] = this.translate(prefixed[2], field);
      }
      const lower = explicit.toLowerCase();
      if (/sku|c[oó]digo/.test(lower) && /producto/.test(lower)) result['referencia'] ??= this.translate(explicit, 'referencia');
      if (/documento/.test(lower)) result['numero_documento'] ??= this.translate(explicit, 'numero_documento');
      if (/correo|email/.test(lower)) result['email'] ??= this.translate(explicit, 'email');
    }
    return result;
  }

  private extractExplicitMessage(payload: any): string {
    if (typeof payload === 'string') return this.safeMessage(payload);
    if (!payload || typeof payload !== 'object') return '';
    for (const key of ['error', 'mensaje', 'message', 'detail']) {
      if (typeof payload[key] === 'string') return this.safeMessage(payload[key]);
    }
    const general = payload.non_field_errors ?? payload.errors?.non_field_errors;
    return this.firstMessage(general);
  }

  private firstMessage(value: unknown): string {
    if (Array.isArray(value)) return value.length ? this.firstMessage(value[0]) : '';
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) {
        const message = this.firstMessage(nested);
        if (message) return message;
      }
      return '';
    }
    return typeof value === 'string' ? this.safeMessage(value) : '';
  }

  private safeMessage(value: string): string {
    const message = value.trim();
    if (!message || /traceback|postgres|sqlstate|integrityerror|exception|<!doctype|<html/i.test(message)) return '';
    return message.length > 400 ? `${message.slice(0, 397)}…` : message;
  }

  private translate(message: string, field?: string): string {
    const label = FIELD_LABELS[field ?? ''] ?? 'campo';
    const normalized = message.trim();
    const lower = normalized.toLowerCase();
    if (/this field is required|required field/.test(lower)) return `El ${label} es obligatorio.`;
    if (/this field may not be blank|may not be blank/.test(lower)) return `El ${label} no puede estar vacío.`;
    if (/this field may not be null|may not be null/.test(lower)) return `Selecciona un ${label}.`;
    if (/already exists|must be unique|unique set/.test(lower)) return `Ya existe un registro con este ${label}.`;
    if (/enter a valid email|valid email address/.test(lower)) return 'El formato del correo electrónico no es válido.';
    if (/valid integer|whole number/.test(lower)) return `El ${label} debe ser un número entero válido.`;
    if (/not a valid choice|valid choice/.test(lower)) return `Selecciona un ${label} válido.`;
    if (/ensure this value is greater than or equal to/.test(lower)) return `El ${label} debe ser mayor o igual al mínimo permitido.`;
    if (/ensure this value is less than or equal to/.test(lower)) return `El ${label} no puede superar el máximo permitido.`;
    if (/no more than .* characters|ensure this field has no more than/.test(lower)) return `El ${label} supera la longitud máxima permitida.`;
    return normalized;
  }
}
