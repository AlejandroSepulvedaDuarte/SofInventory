import { placeNameError } from '../forms/semantic-validators';


export type LocationMode = 'colombia' | 'foreign';

export interface LocationValue {
  pais: string;
  departamento: string;
  ciudad: string;
}

export interface ColombiaMunicipality {
  code: string;
  name: string;
}

export interface ColombiaDepartment {
  code: string;
  name: string;
  municipalities: ColombiaMunicipality[];
}

export interface ColombiaCatalog {
  version: string;
  source: {
    name: string;
    url: string;
    period: string;
    generated_at: string;
  };
  department_count: number;
  municipality_count: number;
  departments: ColombiaDepartment[];
}

export type LocationErrors = Partial<Record<keyof LocationValue, string>>;


export function normalizeLocationKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isColombia(value: unknown): boolean {
  return normalizeLocationKey(value) === 'colombia';
}

export function locationModeFor(value: LocationValue): LocationMode {
  return isColombia(value.pais) ? 'colombia' : 'foreign';
}

export function findDepartment(
  catalog: ColombiaCatalog,
  value: unknown,
): ColombiaDepartment | undefined {
  const key = normalizeLocationKey(value);
  const aliases: Record<string, string> = {
    bogota: '11',
    'bogota dc': '11',
    'distrito capital': '11',
    'archipielago de san andres': '88',
  };
  const aliasCode = aliases[key];
  return catalog.departments.find((department) =>
    aliasCode
      ? department.code === aliasCode
      : normalizeLocationKey(department.name) === key
  );
}

export function findMunicipality(
  department: ColombiaDepartment,
  value: unknown,
): ColombiaMunicipality | undefined {
  const key = normalizeLocationKey(value);
  return department.municipalities.find((municipality) => {
    if (department.code === '11' && ['bogota', 'bogota dc'].includes(key)) {
      return municipality.code === '11001';
    }
    return normalizeLocationKey(municipality.name) === key;
  });
}

export function reconcileCatalogLocation(
  value: LocationValue,
  catalog: ColombiaCatalog,
): LocationValue {
  if (!isColombia(value.pais)) return { ...value };
  const department = findDepartment(catalog, value.departamento);
  if (!department) return { ...value, pais: 'Colombia' };
  const municipality = findMunicipality(department, value.ciudad);
  return {
    pais: 'Colombia',
    departamento: department.name,
    ciudad: municipality?.name ?? value.ciudad,
  };
}

export function switchLocationMode(mode: LocationMode): LocationValue {
  return mode === 'colombia'
    ? { pais: 'Colombia', departamento: '', ciudad: '' }
    : { pais: '', departamento: '', ciudad: '' };
}

export function changeLocationDepartment(
  location: LocationValue,
  department: string,
): LocationValue {
  return { ...location, departamento: department, ciudad: '' };
}

export function isCitySelectorDisabled(
  location: LocationValue,
  loading: boolean,
  catalogError: string,
): boolean {
  return loading || Boolean(catalogError) || !Boolean(location.departamento);
}

export function sameLocation(left: LocationValue, right: LocationValue): boolean {
  return (Object.keys(left) as Array<keyof LocationValue>).every(
    (field) => normalizeLocationKey(left[field]) === normalizeLocationKey(right[field]),
  );
}

export function validateLocationValue(
  location: LocationValue,
  mode: LocationMode,
  catalog: ColombiaCatalog | null,
  catalogError = '',
  legacyOriginal: LocationValue | null = null,
  allowUnchangedLegacy = false,
): LocationErrors {
  if (mode === 'colombia') {
    if (catalogError) {
      return { pais: 'No fue posible cargar el catálogo territorial local.' };
    }
    if (!catalog) {
      return { pais: 'Espera mientras se carga el catálogo territorial.' };
    }

    const department = findDepartment(catalog, location.departamento);
    const municipality = department
      ? findMunicipality(department, location.ciudad)
      : undefined;
    const errors: LocationErrors = {};
    if (!String(location.departamento ?? '').trim()) {
      errors.departamento = 'Selecciona un departamento.';
    } else if (!department) {
      errors.departamento = 'El departamento seleccionado no existe en el catálogo territorial de Colombia.';
    }
    if (!String(location.ciudad ?? '').trim()) {
      errors.ciudad = 'Selecciona una ciudad o municipio.';
    } else if (department && !municipality) {
      errors.ciudad = 'La ciudad o municipio no pertenece al departamento seleccionado.';
    }

    if (
      Object.keys(errors).length &&
      allowUnchangedLegacy &&
      legacyOriginal &&
      sameLocation(location, legacyOriginal)
    ) {
      return {};
    }
    return errors;
  }

  const errors: LocationErrors = {};
  const countryError = placeNameError(location.pais, 'pais', true);
  const departmentError = placeNameError(location.departamento, 'departamento', true);
  const cityError = placeNameError(location.ciudad, 'ciudad', true);
  if (countryError) errors.pais = countryError;
  if (departmentError) {
    errors.departamento = departmentError
      .replace('El departamento', 'El estado, provincia o departamento')
      .replace('El Departamento', 'El estado, provincia o departamento');
  }
  if (cityError) errors.ciudad = cityError;

  if (
    Object.keys(errors).length &&
    allowUnchangedLegacy &&
    legacyOriginal &&
    sameLocation(location, legacyOriginal)
  ) {
    return {};
  }
  return errors;
}
