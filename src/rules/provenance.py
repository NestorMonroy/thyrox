#!/usr/bin/env python3
"""El sello de procedencia de una regla emitida — la mitad Python.

La lee `verify/check_rule_divergence.py` para separar «emitida por el
proveedor» de «copia que alguien mantiene a mano». Sin esa separacion el
clasificador mide la emision como deriva: dos copias byte a byte no se
subsumen (el filtro `holders` exige que la otra aporte alguna linea propia) y
caen en `divergente (0 linea(s))`.

La mitad TypeScript (`src/rules/provenance.ts`) declara las mismas constantes;
`tests/rules/test_provenance_parity.py` las ata para que no deriven.
"""
from __future__ import annotations

#: La subcadena estable que el clasificador busca, en minusculas.
EMITTED_MARKER = "emitida por thyrox"

#: El directorio de definiciones, relativo a la raiz del proveedor.
DEFINITIONS_SEGMENT = "src/rules/definitions"


def emitted_marker(name: str) -> str:
    """La linea completa que el emisor estampa, para el control de paridad."""
    return (
        f"<!-- Emitida por THYROX desde {DEFINITIONS_SEGMENT}/{name}.ts — "
        f"no editar aqui: el cambio se hace en la definicion y se vuelve a emitir. -->"
    )
