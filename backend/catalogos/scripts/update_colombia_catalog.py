"""Regenera el catálogo territorial local desde Datos Abiertos Colombia.

No se ejecuta en producción. La aplicación consume exclusivamente el JSON
versionado que este script genera en ``catalogos/data/colombia.json``.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path


DATASET_ENDPOINT = "https://www.datos.gov.co/resource/nudc-7mev.json"
DATASET_PAGE = (
    "https://www.datos.gov.co/Educaci-n/"
    "MEN_ESTADISTICAS_EN_EDUCACION_EN_PREESCOLAR-B-SICA/nudc-7mev"
)
EXPECTED_DEPARTMENTS = 33
EXPECTED_MUNICIPALITIES = 1122

DEPARTMENT_NAMES = {
    "05": "Antioquia",
    "08": "Atlántico",
    "11": "Bogotá D. C.",
    "13": "Bolívar",
    "15": "Boyacá",
    "17": "Caldas",
    "18": "Caquetá",
    "19": "Cauca",
    "20": "Cesar",
    "23": "Córdoba",
    "25": "Cundinamarca",
    "27": "Chocó",
    "41": "Huila",
    "44": "La Guajira",
    "47": "Magdalena",
    "50": "Meta",
    "52": "Nariño",
    "54": "Norte de Santander",
    "63": "Quindío",
    "66": "Risaralda",
    "68": "Santander",
    "70": "Sucre",
    "73": "Tolima",
    "76": "Valle del Cauca",
    "81": "Arauca",
    "85": "Casanare",
    "86": "Putumayo",
    "88": "Archipiélago de San Andrés, Providencia y Santa Catalina",
    "91": "Amazonas",
    "94": "Guainía",
    "95": "Guaviare",
    "97": "Vaupés",
    "99": "Vichada",
}


def fetch_records() -> list[dict[str, str]]:
    query = urllib.parse.urlencode(
        {
            "$select": (
                "c_digo_departamento,departamento,"
                "c_digo_municipio,municipio"
            ),
            "$where": "a_o='2024'",
            "$order": "c_digo_departamento,c_digo_municipio",
            "$limit": "5000",
        }
    )
    request = urllib.request.Request(
        f"{DATASET_ENDPOINT}?{query}",
        headers={"User-Agent": "SofInventory catalog updater/1.0"},
    )
    last_error: Exception | None = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                data = json.load(response)
            if not isinstance(data, list):
                raise ValueError("El portal no devolvió una lista JSON.")
            return data
        except Exception as error:  # pragma: no cover - utilidad manual
            last_error = error
            if attempt < 3:
                time.sleep(2**attempt)
    raise RuntimeError("No fue posible descargar el catálogo oficial.") from last_error


def build_catalog(records: list[dict[str, str]]) -> dict[str, object]:
    municipalities_by_department: dict[str, dict[str, str]] = defaultdict(dict)
    for record in records:
        department_code = str(record["c_digo_departamento"]).zfill(2)
        municipality_code = str(record["c_digo_municipio"]).zfill(5)
        if municipality_code[:2] != department_code:
            raise ValueError(
                f"El municipio {municipality_code} no pertenece al departamento "
                f"{department_code}."
            )
        municipality_name = str(record["municipio"]).strip()
        if municipality_code == "11001":
            municipality_name = "Bogotá D. C."
        municipalities_by_department[department_code][municipality_code] = municipality_name

    municipality_count = sum(
        len(municipalities) for municipalities in municipalities_by_department.values()
    )
    if set(municipalities_by_department) != set(DEPARTMENT_NAMES):
        raise ValueError("La respuesta no contiene exactamente los 33 territorios esperados.")
    if municipality_count != EXPECTED_MUNICIPALITIES:
        raise ValueError(
            f"Se esperaban {EXPECTED_MUNICIPALITIES} municipios/áreas y se "
            f"recibieron {municipality_count}."
        )

    departments = []
    for department_code in sorted(DEPARTMENT_NAMES):
        municipalities = municipalities_by_department[department_code]
        departments.append(
            {
                "code": department_code,
                "name": DEPARTMENT_NAMES[department_code],
                "municipalities": [
                    {"code": code, "name": municipalities[code]}
                    for code in sorted(municipalities)
                ],
            }
        )

    return {
        "version": "DIVIPOLA-MEN-2024",
        "source": {
            "name": (
                "MEN - Estadísticas en educación por municipio "
                "(códigos DIVIPOLA DANE)"
            ),
            "url": DATASET_PAGE,
            "period": "2024",
            "generated_at": "2026-08-07",
        },
        "department_count": EXPECTED_DEPARTMENTS,
        "municipality_count": municipality_count,
        "departments": departments,
    }


def main() -> None:
    catalog = build_catalog(fetch_records())
    target = Path(__file__).resolve().parents[1] / "data" / "colombia.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Catálogo generado: {target}")
    print(f"Departamentos/territorios: {catalog['department_count']}")
    print(f"Municipios/áreas: {catalog['municipality_count']}")


if __name__ == "__main__":
    main()
