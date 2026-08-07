import re

from rest_framework import serializers


UNICODE_LETTER_RE = re.compile(r'[^\W\d_]', re.UNICODE)
PERSON_OR_PLACE_RE = re.compile(
    r"^[^\W\d_]+(?:[ '\u2019-][^\W\d_]+)*$",
    re.UNICODE,
)
JOB_TITLE_RE = re.compile(r'^[^\W\d_]+(?:[ -][^\W\d_]+)*$', re.UNICODE)
USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]+$')


def normalize_semantic_text(value):
    """Recorta y colapsa espacios sin alterar letras, tildes ni mayúsculas."""
    return ' '.join(str(value or '').strip().split())


def validate_person_or_place(
    value,
    *,
    empty_message,
    number_message,
    invalid_message,
):
    normalized = normalize_semantic_text(value)
    if not normalized:
        raise serializers.ValidationError(empty_message)
    if any(character.isdigit() for character in normalized):
        raise serializers.ValidationError(number_message)
    if not PERSON_OR_PLACE_RE.fullmatch(normalized):
        raise serializers.ValidationError(invalid_message)
    return normalized


def validate_job_title(value):
    normalized = normalize_semantic_text(value)
    if not normalized:
        raise serializers.ValidationError(
            'El cargo no puede estar formado solamente por espacios.'
        )
    if any(character.isdigit() for character in normalized):
        raise serializers.ValidationError('El cargo no puede contener números.')
    if not JOB_TITLE_RE.fullmatch(normalized):
        raise serializers.ValidationError(
            'El cargo solo puede contener letras, espacios y guiones.'
        )
    return normalized


def validate_commercial_name(value, *, empty_message, letter_message):
    normalized = normalize_semantic_text(value)
    if not normalized:
        raise serializers.ValidationError(empty_message)
    if not UNICODE_LETTER_RE.search(normalized):
        raise serializers.ValidationError(letter_message)
    if any(ord(character) < 32 for character in normalized):
        raise serializers.ValidationError(
            'El valor contiene caracteres de control no permitidos.'
        )
    return normalized


def validate_username_value(value):
    normalized = str(value or '').strip()
    if not normalized:
        raise serializers.ValidationError(
            'El nombre de usuario es obligatorio.'
        )
    if not USERNAME_RE.fullmatch(normalized):
        raise serializers.ValidationError(
            'El nombre de usuario solo puede contener letras, números, punto, guion y guion bajo, sin espacios.'
        )
    return normalized


def validate_document_number(value, document_type_code):
    normalized = str(value or '').strip()
    code = str(document_type_code or '').strip().upper()

    if not normalized:
        raise serializers.ValidationError(
            'El número de documento es obligatorio.'
        )

    if code in {'CC', 'CE', 'TI'}:
        if not re.fullmatch(r'\d{6,10}', normalized):
            raise serializers.ValidationError(
                f'El documento tipo {code} debe contener entre 6 y 10 dígitos.'
            )
    elif code == 'NIT':
        if not re.fullmatch(r'\d{6,15}(?:-\d)?', normalized):
            raise serializers.ValidationError(
                'El NIT debe contener entre 6 y 15 dígitos y puede incluir un guion seguido del dígito de verificación.'
            )
    elif code == 'PA':
        if not re.fullmatch(r'[A-Za-z0-9-]{5,20}', normalized):
            raise serializers.ValidationError(
                'El pasaporte debe contener entre 5 y 20 letras o números, sin espacios.'
            )
    elif not re.fullmatch(r'[A-Za-z0-9-]{3,20}', normalized):
        raise serializers.ValidationError(
            'El número de documento debe contener entre 3 y 20 letras, números o guiones, sin espacios.'
        )

    return normalized


def document_type_code(serializer):
    raw_type = serializer.initial_data.get('tipo_documento')
    if raw_type in (None, '') and serializer.instance is not None:
        return serializer.instance.tipo_documento.codigo

    from .models import TipoDocumento

    try:
        return TipoDocumento.objects.only('codigo').get(pk=raw_type).codigo
    except (TipoDocumento.DoesNotExist, TypeError, ValueError):
        return ''
