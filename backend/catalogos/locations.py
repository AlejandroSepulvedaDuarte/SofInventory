from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any

from rest_framework import serializers

from usuarios.validators import normalize_semantic_text, validate_person_or_place


CATALOG_PATH = Path(__file__).resolve().parent / 'data' / 'colombia.json'
LOCATION_FIELDS = ('pais', 'departamento', 'ciudad')


class LocationCatalogError(RuntimeError):
    """Indica que la fuente territorial local no es íntegra o no está disponible."""


def normalize_location_key(value: Any) -> str:
    normalized = normalize_semantic_text(value).replace('’', "'")
    normalized = unicodedata.normalize('NFKD', normalized)
    without_accents = ''.join(
        character for character in normalized
        if not unicodedata.combining(character)
    )
    return re.sub(r'[^a-z0-9]+', ' ', without_accents.casefold()).strip()


@lru_cache(maxsize=1)
def load_colombia_catalog() -> dict[str, Any]:
    try:
        with CATALOG_PATH.open(encoding='utf-8') as catalog_file:
            catalog = json.load(catalog_file)
    except (OSError, json.JSONDecodeError) as error:
        raise LocationCatalogError(
            'No fue posible cargar el catálogo territorial local.'
        ) from error

    departments = catalog.get('departments')
    if not isinstance(departments, list) or len(departments) != 33:
        raise LocationCatalogError(
            'El catálogo territorial local no contiene los 33 territorios esperados.'
        )
    municipality_count = sum(
        len(department.get('municipalities', []))
        for department in departments
    )
    if municipality_count != catalog.get('municipality_count') or municipality_count != 1122:
        raise LocationCatalogError(
            'El catálogo territorial local está incompleto.'
        )
    return catalog


@lru_cache(maxsize=1)
def _catalog_indexes() -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, dict[str, str]]]]:
    departments_by_key: dict[str, dict[str, Any]] = {}
    municipalities_by_department: dict[str, dict[str, dict[str, str]]] = {}

    for department in load_colombia_catalog()['departments']:
        department_key = normalize_location_key(department['name'])
        departments_by_key[department_key] = department
        municipalities_by_department[department['code']] = {
            normalize_location_key(municipality['name']): municipality
            for municipality in department['municipalities']
        }

    department_aliases = {
        'bogota': 'bogota d c',
        'bogota dc': 'bogota d c',
        'distrito capital': 'bogota d c',
        'archipielago de san andres': (
            'archipielago de san andres providencia y santa catalina'
        ),
    }
    for alias, canonical_key in department_aliases.items():
        if canonical_key in departments_by_key:
            departments_by_key[alias] = departments_by_key[canonical_key]

    bogota = departments_by_key.get('bogota d c')
    if bogota:
        bogota_municipality = municipalities_by_department[bogota['code']].get('bogota d c')
        if bogota_municipality:
            municipalities_by_department[bogota['code']]['bogota'] = bogota_municipality
            municipalities_by_department[bogota['code']]['bogota dc'] = bogota_municipality

    return departments_by_key, municipalities_by_department


def is_colombia(value: Any) -> bool:
    return normalize_location_key(value) == 'colombia'


def find_department(value: Any) -> dict[str, Any] | None:
    departments_by_key, _ = _catalog_indexes()
    return departments_by_key.get(normalize_location_key(value))


def find_municipality(department_code: str, value: Any) -> dict[str, str] | None:
    _, municipalities_by_department = _catalog_indexes()
    return municipalities_by_department.get(department_code, {}).get(
        normalize_location_key(value)
    )


def _instance_value(instance: Any, field: str) -> Any:
    return getattr(instance, field, '') if instance is not None else ''


def _is_unchanged_legacy_location(values: dict[str, str], instance: Any) -> bool:
    if instance is None:
        return False
    return all(
        normalize_location_key(values[field])
        == normalize_location_key(_instance_value(instance, field))
        for field in LOCATION_FIELDS
    )


def _foreign_location_errors(values: dict[str, str]) -> dict[str, str]:
    errors: dict[str, str] = {}
    configurations = {
        'pais': (
            'El país es obligatorio.',
            'El país no puede contener números.',
            'El país solo puede contener letras, espacios, apóstrofos y guiones.',
        ),
        'departamento': (
            'El estado, provincia o departamento es obligatorio.',
            'El estado, provincia o departamento no puede contener números.',
            'El estado, provincia o departamento solo puede contener letras, espacios, apóstrofos y guiones.',
        ),
        'ciudad': (
            'La ciudad es obligatoria.',
            'La ciudad no puede contener números.',
            'La ciudad solo puede contener letras, espacios, apóstrofos y guiones.',
        ),
    }
    for field, (empty_message, number_message, invalid_message) in configurations.items():
        try:
            values[field] = validate_person_or_place(
                values[field],
                empty_message=empty_message,
                number_message=number_message,
                invalid_message=invalid_message,
            )
        except serializers.ValidationError as error:
            detail = error.detail
            errors[field] = str(detail[0] if isinstance(detail, list) else detail)
    return errors


def validate_location(attrs: dict[str, Any], instance: Any = None) -> dict[str, Any]:
    """Valida y normaliza los tres campos sin modificar el contrato textual de la API."""
    if instance is not None and not any(field in attrs for field in LOCATION_FIELDS):
        return attrs

    values = {
        field: normalize_semantic_text(
            attrs[field] if field in attrs else _instance_value(instance, field)
        )
        for field in LOCATION_FIELDS
    }
    unchanged_legacy = _is_unchanged_legacy_location(values, instance)

    try:
        colombian_location = is_colombia(values['pais'])
        if colombian_location:
            errors: dict[str, str] = {}
            if not values['pais']:
                errors['pais'] = 'El país es obligatorio.'
            department = find_department(values['departamento'])
            if not values['departamento']:
                errors['departamento'] = 'Selecciona un departamento.'
            elif department is None:
                errors['departamento'] = (
                    'El departamento seleccionado no existe en el catálogo territorial de Colombia.'
                )

            municipality = None
            if department is not None:
                municipality = find_municipality(department['code'], values['ciudad'])
            if not values['ciudad']:
                errors['ciudad'] = 'Selecciona una ciudad o municipio.'
            elif department is not None and municipality is None:
                errors['ciudad'] = (
                    'La ciudad o municipio no pertenece al departamento seleccionado.'
                )

            if errors:
                if unchanged_legacy:
                    for field in LOCATION_FIELDS:
                        if field in attrs:
                            attrs[field] = _instance_value(instance, field)
                    return attrs
                raise serializers.ValidationError(errors)

            values = {
                'pais': 'Colombia',
                'departamento': department['name'],
                'ciudad': municipality['name'],
            }
        else:
            errors = _foreign_location_errors(values)
            if errors:
                if unchanged_legacy:
                    for field in LOCATION_FIELDS:
                        if field in attrs:
                            attrs[field] = _instance_value(instance, field)
                    return attrs
                raise serializers.ValidationError(errors)
    except LocationCatalogError as error:
        raise serializers.ValidationError({
            'pais': (
                'No fue posible validar la ubicación porque el catálogo territorial local '
                'no está disponible.'
            )
        }) from error

    for field, value in values.items():
        attrs[field] = value
    return attrs
