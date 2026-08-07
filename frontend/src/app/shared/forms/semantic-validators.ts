export type PersonField = 'nombre_completo' | 'nombres' | 'apellidos' | 'nombre_contacto';
export type PlaceField = 'pais' | 'departamento' | 'ciudad';
export type CommercialField = 'producto' | 'marca' | 'categoria' | 'razon_social' | 'nombre_comercial' | 'almacen';

const PERSON_OR_PLACE_PATTERN = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;
const JOB_TITLE_PATTERN = /^\p{L}+(?:[ -]\p{L}+)*$/u;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const HAS_LETTER_PATTERN = /\p{L}/u;
const HAS_NUMBER_PATTERN = /\p{N}/u;

const PERSON_MESSAGES: Record<PersonField, { required: string; spaces: string; number: string; invalid: string }> = {
  nombre_completo: {
    required: 'El nombre completo es obligatorio.',
    spaces: 'El nombre completo no puede estar formado solamente por espacios.',
    number: 'El nombre completo no puede contener números.',
    invalid: 'El nombre solo puede contener letras, espacios, apóstrofos y guiones.',
  },
  nombres: {
    required: 'Los nombres son obligatorios.',
    spaces: 'Los nombres no pueden estar formados solamente por espacios.',
    number: 'Los nombres no pueden contener números.',
    invalid: 'Los nombres solo pueden contener letras, espacios, apóstrofos y guiones.',
  },
  apellidos: {
    required: 'Los apellidos son obligatorios.',
    spaces: 'Los apellidos no pueden estar formados solamente por espacios.',
    number: 'Los apellidos no pueden contener números.',
    invalid: 'Los apellidos solo pueden contener letras, espacios, apóstrofos y guiones.',
  },
  nombre_contacto: {
    required: 'El nombre de contacto es obligatorio.',
    spaces: 'El nombre de contacto no puede estar formado solamente por espacios.',
    number: 'El nombre de contacto no puede contener números.',
    invalid: 'El nombre de contacto solo puede contener letras, espacios, apóstrofos y guiones.',
  },
};

const PLACE_LABELS: Record<PlaceField, { article: 'El' | 'La'; label: string }> = {
  pais: { article: 'El', label: 'país' },
  departamento: { article: 'El', label: 'departamento' },
  ciudad: { article: 'La', label: 'ciudad' },
};

const COMMERCIAL_MESSAGES: Record<CommercialField, { required: string; letter: string }> = {
  producto: {
    required: 'El nombre del producto es obligatorio.',
    letter: 'El nombre del producto debe contener al menos una letra.',
  },
  marca: {
    required: 'La marca es obligatoria.',
    letter: 'La marca debe contener al menos una letra.',
  },
  categoria: {
    required: 'El nombre de la categoría es obligatorio.',
    letter: 'El nombre de la categoría debe contener al menos una letra.',
  },
  razon_social: {
    required: 'La razón social es obligatoria.',
    letter: 'La razón social debe contener al menos una letra.',
  },
  nombre_comercial: {
    required: 'El nombre comercial es obligatorio.',
    letter: 'El nombre comercial debe contener al menos una letra.',
  },
  almacen: {
    required: 'El nombre del almacén es obligatorio.',
    letter: 'El nombre del almacén debe contener al menos una letra.',
  },
};

export function normalizeSemanticText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function personNameError(value: unknown, field: PersonField): string {
  const raw = String(value ?? '');
  const normalized = normalizeSemanticText(raw);
  const messages = PERSON_MESSAGES[field];
  if (!normalized) return raw.length ? messages.spaces : messages.required;
  if (HAS_NUMBER_PATTERN.test(normalized)) return messages.number;
  return PERSON_OR_PLACE_PATTERN.test(normalized) ? '' : messages.invalid;
}

export function placeNameError(value: unknown, field: PlaceField, required = false): string {
  const raw = String(value ?? '');
  const normalized = normalizeSemanticText(raw);
  const { article, label } = PLACE_LABELS[field];
  if (!normalized) {
    if (raw.length) return `${article} ${label} no puede estar formado solamente por espacios.`;
    return required ? `${article} ${label} es obligatorio${article === 'La' ? 'a' : ''}.` : '';
  }
  if (HAS_NUMBER_PATTERN.test(normalized)) return `${article} ${label} no puede contener números.`;
  return PERSON_OR_PLACE_PATTERN.test(normalized)
    ? ''
    : `${article} ${label} solo puede contener letras, espacios, apóstrofos y guiones.`;
}

export function jobTitleError(value: unknown): string {
  const raw = String(value ?? '');
  const normalized = normalizeSemanticText(raw);
  if (!normalized) return raw.length ? 'El cargo no puede estar formado solamente por espacios.' : '';
  if (HAS_NUMBER_PATTERN.test(normalized)) return 'El cargo no puede contener números.';
  return JOB_TITLE_PATTERN.test(normalized)
    ? ''
    : 'El cargo solo puede contener letras, espacios y guiones.';
}

export function commercialNameError(value: unknown, field: CommercialField, required = true): string {
  const raw = String(value ?? '');
  const normalized = normalizeSemanticText(raw);
  const messages = COMMERCIAL_MESSAGES[field];
  if (!normalized) {
    if (!required && !raw.length) return '';
    return raw.length ? `${messages.required.replace(/ es obligatori[oa]\.$/, '')} no puede estar formado solamente por espacios.` : messages.required;
  }
  if (!HAS_LETTER_PATTERN.test(normalized)) {
    if (field === 'categoria' && /^\p{N}+$/u.test(normalized)) {
      return 'El nombre de la categoría no puede estar compuesto solamente por números.';
    }
    return messages.letter;
  }
  return '';
}

export function usernameError(value: unknown): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'El nombre de usuario es obligatorio.';
  return USERNAME_PATTERN.test(normalized)
    ? ''
    : 'El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo, sin espacios.';
}

export function documentNumberError(value: unknown, documentTypeCode: unknown): string {
  const normalized = String(value ?? '').trim();
  const code = String(documentTypeCode ?? '').trim().toUpperCase();
  if (!normalized) return 'El número de documento es obligatorio.';

  if (['CC', 'CE', 'TI'].includes(code) && !/^\d{6,10}$/.test(normalized)) {
    return `El documento tipo ${code} debe contener entre 6 y 10 dígitos.`;
  }
  if (code === 'NIT' && !/^\d{6,15}(?:-\d)?$/.test(normalized)) {
    return 'El NIT debe contener entre 6 y 15 dígitos y puede incluir un guion seguido del dígito de verificación.';
  }
  if (code === 'PA' && !/^[A-Za-z0-9-]{5,20}$/.test(normalized)) {
    return 'El pasaporte debe contener entre 5 y 20 letras o números, sin espacios.';
  }
  if (code && !['CC', 'CE', 'TI', 'NIT', 'PA'].includes(code) && !/^[A-Za-z0-9-]{3,20}$/.test(normalized)) {
    return 'El número de documento debe contener entre 3 y 20 letras, números o guiones, sin espacios.';
  }
  return '';
}
