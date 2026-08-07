import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FieldErrorComponent } from '../forms/field-error.component';
import { FieldValidationDirective } from '../forms/field-validation.directive';
import { FormFeedbackState } from '../forms/form-feedback.service';
import { normalizeSemanticText } from '../forms/semantic-validators';
import { ColombiaLocationService } from './colombia-location.service';
import {
  ColombiaCatalog,
  ColombiaDepartment,
  ColombiaMunicipality,
  LocationErrors,
  LocationMode,
  LocationValue,
  changeLocationDepartment,
  findDepartment,
  findMunicipality,
  isCitySelectorDisabled,
  locationModeFor,
  reconcileCatalogLocation,
  switchLocationMode,
  validateLocationValue,
} from './location-form';


@Component({
  selector: 'app-location-fields',
  standalone: true,
  imports: [CommonModule, FormsModule, FieldErrorComponent, FieldValidationDirective],
  templateUrl: './location-fields.component.html',
  styleUrls: ['./location-fields.component.css'],
})
export class LocationFieldsComponent implements OnInit {
  @Input() idPrefix = 'location';
  @Input() allowUnchangedLegacy = false;
  @Input({ required: true }) validation!: FormFeedbackState;
  @Output() locationChange = new EventEmitter<LocationValue>();

  private value: LocationValue = { pais: 'Colombia', departamento: '', ciudad: '' };
  private original: LocationValue | null = null;
  private lastEmitted: LocationValue | null = null;

  mode: LocationMode = 'colombia';
  readonly catalog = signal<ColombiaCatalog | null>(null);
  readonly loading = signal(true);
  readonly catalogError = signal('');

  @Input({ required: true })
  set location(location: LocationValue) {
    if (location === this.lastEmitted) {
      this.value = location;
      return;
    }
    this.value = {
      pais: String(location?.pais ?? ''),
      departamento: String(location?.departamento ?? ''),
      ciudad: String(location?.ciudad ?? ''),
    };
    this.original = { ...this.value };
    this.mode = locationModeFor(this.value);
    this.reconcileCurrentValue();
  }

  get location(): LocationValue {
    return this.value;
  }

  constructor(private locations: ColombiaLocationService) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(force = false): void {
    this.loading.set(true);
    this.catalogError.set('');
    this.locations.load(force).subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.loading.set(false);
        this.reconcileCurrentValue();
      },
      error: () => {
        this.catalog.set(null);
        this.loading.set(false);
        this.catalogError.set(
          'No fue posible cargar el catálogo territorial local. Inténtalo nuevamente.',
        );
      },
    });
  }

  departments(): ColombiaDepartment[] {
    return this.catalog()?.departments ?? [];
  }

  municipalities(): ColombiaMunicipality[] {
    const catalog = this.catalog();
    if (!catalog) return [];
    return findDepartment(catalog, this.value.departamento)?.municipalities ?? [];
  }

  cityDisabled(): boolean {
    return isCitySelectorDisabled(this.value, this.loading(), this.catalogError());
  }

  hasLegacyDepartment(): boolean {
    const catalog = this.catalog();
    return Boolean(
      this.mode === 'colombia' &&
      catalog &&
      this.value.departamento &&
      !findDepartment(catalog, this.value.departamento),
    );
  }

  hasLegacyCity(): boolean {
    const catalog = this.catalog();
    if (this.mode !== 'colombia' || !catalog || !this.value.ciudad) return false;
    const department = findDepartment(catalog, this.value.departamento);
    return !department || !findMunicipality(department, this.value.ciudad);
  }

  onModeChange(mode: LocationMode): void {
    this.mode = mode;
    this.value = switchLocationMode(mode);
    this.clearLocationErrors();
    this.emitValue();
  }

  onDepartmentChange(department: string): void {
    this.value = changeLocationDepartment(this.value, department);
    this.validation.clearField('departamento');
    this.validation.clearField('ciudad');
    this.emitValue();
  }

  onCityChange(city: string): void {
    this.value = { ...this.value, ciudad: city };
    this.validation.clearField('ciudad');
    this.emitValue();
  }

  onForeignFieldChange(field: keyof LocationValue, fieldValue: string): void {
    this.value = { ...this.value, [field]: fieldValue };
    this.validation.clearField(field);
    this.emitValue();
  }

  validate(): LocationErrors {
    return validateLocationValue(
      this.value,
      this.mode,
      this.catalog(),
      this.catalogError(),
      this.original,
      this.allowUnchangedLegacy,
    );
  }

  normalizedValue(): LocationValue {
    return {
      pais: this.mode === 'colombia' ? 'Colombia' : normalizeSemanticText(this.value.pais),
      departamento: normalizeSemanticText(this.value.departamento),
      ciudad: normalizeSemanticText(this.value.ciudad),
    };
  }

  error(field: keyof LocationValue): string {
    return this.validation.error(field);
  }

  private reconcileCurrentValue(): void {
    const catalog = this.catalog();
    if (!catalog || this.mode !== 'colombia') return;
    const reconciled = reconcileCatalogLocation(this.value, catalog);
    if (
      reconciled.pais !== this.value.pais ||
      reconciled.departamento !== this.value.departamento ||
      reconciled.ciudad !== this.value.ciudad
    ) {
      this.value = reconciled;
      this.emitValue();
    }
  }

  private clearLocationErrors(): void {
    this.validation.clearField('pais');
    this.validation.clearField('departamento');
    this.validation.clearField('ciudad');
  }

  private emitValue(): void {
    this.lastEmitted = { ...this.value };
    this.value = this.lastEmitted;
    this.locationChange.emit(this.lastEmitted);
  }
}
