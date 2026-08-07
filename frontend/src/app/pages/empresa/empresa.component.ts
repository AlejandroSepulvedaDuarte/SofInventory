import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Empresa } from '../../core/models';
import { EmpresaService } from '../../core/services/empresa.service';
import { FieldErrorComponent } from '../../shared/forms/field-error.component';
import { FieldValidationDirective } from '../../shared/forms/field-validation.directive';
import { FormErrorSummaryComponent } from '../../shared/forms/form-error-summary.component';
import { FormFeedbackService, FormFeedbackState } from '../../shared/forms/form-feedback.service';
import { commercialNameError, normalizeSemanticText } from '../../shared/forms/semantic-validators';
import { LayoutComponent } from '../../shared/components/layout.component';
import { LocationFieldsComponent } from '../../shared/locations/location-fields.component';
import { LocationValue } from '../../shared/locations/location-form';
import { NotificationService } from '../../shared/notifications/notification.service';


@Component({
  selector: 'app-empresa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutComponent,
    FormErrorSummaryComponent,
    FieldErrorComponent,
    FieldValidationDirective,
    LocationFieldsComponent,
  ],
  templateUrl: './empresa.component.html',
  styleUrls: ['./empresa.component.css'],
})
export class EmpresaComponent implements OnInit {
  @ViewChild(LocationFieldsComponent) locationFields?: LocationFieldsComponent;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly showForm = signal(false);
  readonly validation: FormFeedbackState;
  form: Partial<Empresa> = {};
  location: LocationValue = { pais: 'Colombia', departamento: '', ciudad: '' };
  selectedLogo: File | null = null;
  logoPreview = '';
  removeLogo = false;

  constructor(
    public company: EmpresaService,
    feedback: FormFeedbackService,
    private notifications: NotificationService,
  ) {
    this.validation = new FormFeedbackState(
      feedback,
      'No fue posible guardar la configuración. Revisa los campos señalados.',
      '.company-form',
    );
  }

  ngOnInit(): void {
    this.company.cargar().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.notifications.error('No fue posible cargar la configuración de la empresa.');
      },
    });
  }

  openForm(): void {
    const current = this.company.empresa();
    this.form = current ? { ...current } : {
      nombre_comercial: '',
      razon_social: '',
      nit: '',
      digito_verificacion: '',
      direccion: '',
      telefono: '',
      email: '',
      sitio_web: '',
      mensaje_comprobante: 'Gracias por su compra.',
      moneda: 'COP',
      prefijo_ventas: '',
    };
    this.location = {
      pais: current?.pais ?? 'Colombia',
      departamento: current?.departamento ?? '',
      ciudad: current?.ciudad ?? '',
    };
    this.logoPreview = current?.logo_url ?? '';
    this.selectedLogo = null;
    this.removeLogo = false;
    this.validation.clear();
    this.showForm.set(true);
  }

  closeForm(): void {
    if (!this.saving()) this.showForm.set(false);
  }

  updateLocation(location: LocationValue): void {
    this.location = location;
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.validation.clearField('logo');
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      this.validation.reject({ logo: 'Selecciona una imagen PNG, JPG, JPEG o WebP.' });
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.validation.reject({ logo: 'La imagen no puede superar los 2 MB.' });
      input.value = '';
      return;
    }
    this.revokePreview();
    this.selectedLogo = file;
    this.logoPreview = URL.createObjectURL(file);
    this.removeLogo = false;
  }

  removeCurrentLogo(): void {
    this.revokePreview();
    this.logoPreview = '';
    this.selectedLogo = null;
    this.removeLogo = true;
  }

  save(): void {
    if (this.saving()) return;
    const errors: Record<string, string> = {};
    const nameError = commercialNameError(this.form.nombre_comercial, 'nombre_comercial');
    if (nameError) errors['nombre_comercial'] = nameError;
    if (!String(this.form.nit ?? '').trim()) errors['nit'] = 'El NIT o identificación es obligatorio.';
    if (!String(this.form.direccion ?? '').trim()) errors['direccion'] = 'La dirección es obligatoria.';
    if (!String(this.form.telefono ?? '').trim()) errors['telefono'] = 'El teléfono es obligatorio.';
    Object.assign(errors, this.locationFields?.validate() ?? {});
    if (Object.keys(errors).length) {
      this.validation.reject(errors);
      return;
    }

    const normalizedLocation = this.locationFields?.normalizedValue() ?? this.location;
    const payload = new FormData();
    const values: Record<string, unknown> = {
      ...this.form,
      nombre_comercial: normalizeSemanticText(this.form.nombre_comercial),
      razon_social: normalizeSemanticText(this.form.razon_social),
      nit: normalizeSemanticText(this.form.nit),
      direccion: normalizeSemanticText(this.form.direccion),
      telefono: normalizeSemanticText(this.form.telefono),
      ...normalizedLocation,
      moneda: 'COP',
      quitar_logo: this.removeLogo,
    };
    for (const [key, value] of Object.entries(values)) {
      if (['id', 'logo', 'logo_url', 'fecha_creacion', 'fecha_actualizacion', 'creado_por_nombre', 'actualizado_por_nombre'].includes(key)) continue;
      payload.append(key, value == null ? '' : String(value));
    }
    if (this.selectedLogo) payload.append('logo', this.selectedLogo, this.selectedLogo.name);

    this.validation.clear();
    this.saving.set(true);
    this.company.guardar(payload, this.company.configurada()).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.selectedLogo = null;
        this.notifications.success('Configuración de la empresa guardada satisfactoriamente.');
      },
      error: (error) => {
        this.saving.set(false);
        this.validation.fromHttp(error);
      },
    });
  }

  companyInitials(): string {
    return String(this.company.empresa()?.nombre_comercial ?? 'SE')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  private revokePreview(): void {
    if (this.logoPreview.startsWith('blob:')) URL.revokeObjectURL(this.logoPreview);
  }
}
