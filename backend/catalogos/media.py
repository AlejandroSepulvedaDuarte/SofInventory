from __future__ import annotations

import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


ALLOWED_IMAGE_FORMATS = {
    'PNG': ('.png', 'image/png'),
    'JPEG': ('.jpg', 'image/jpeg'),
    'WEBP': ('.webp', 'image/webp'),
}
MAX_IMAGE_SIZE = 2 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000


def validate_uploaded_image(uploaded_file):
    """Valida contenido real, extensión, MIME y límites antes de persistir."""
    if not uploaded_file:
        return uploaded_file
    if uploaded_file.size > MAX_IMAGE_SIZE:
        raise ValidationError('La imagen no puede superar los 2 MB.')

    extension = Path(uploaded_file.name or '').suffix.lower()
    if extension not in {'.png', '.jpg', '.jpeg', '.webp'}:
        raise ValidationError('Selecciona una imagen PNG, JPG, JPEG o WebP.')

    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as image:
            image.verify()
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as image:
            image_format = image.format
            width, height = image.size
    except (UnidentifiedImageError, OSError, ValueError) as error:
        uploaded_file.seek(0)
        raise ValidationError('El archivo seleccionado no es una imagen válida.') from error
    finally:
        uploaded_file.seek(0)

    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError('Selecciona una imagen PNG, JPG, JPEG o WebP.')
    expected_extension, expected_mime = ALLOWED_IMAGE_FORMATS[image_format]
    compatible_extensions = {expected_extension}
    if image_format == 'JPEG':
        compatible_extensions.add('.jpeg')
    if extension not in compatible_extensions:
        raise ValidationError('La extensión del archivo no coincide con su contenido real.')
    content_type = (getattr(uploaded_file, 'content_type', '') or '').lower()
    if content_type and content_type != expected_mime:
        raise ValidationError('El tipo MIME del archivo no coincide con su contenido real.')
    if width < 1 or height < 1 or width * height > MAX_IMAGE_PIXELS:
        raise ValidationError('La imagen tiene dimensiones no permitidas.')
    return uploaded_file


def safe_image_upload_path(prefix, filename):
    extension = Path(filename or '').suffix.lower()
    if extension == '.jpeg':
        extension = '.jpg'
    return f'{prefix}/{uuid.uuid4().hex}{extension}'
