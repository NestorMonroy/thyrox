#!/usr/bin/env python3
"""check_infrastructure_runtime_idle.py — el Ollama de infraestructura no ejecuta.

ADR-007, contrato del plano de ejecución: ``estado observado del runtime ⊆
estado autorizado por los grants activos``. Toda residencia de un modelo vive
en una ``ExecutionUnit`` que ``PodmanModelUnitMaterializer`` materializa desde
un ``ExecutionGrant`` (topología A, enmienda 1.13.0), y el coordinador barre al
arrancar las unidades sin grant. ``thyrox-ollama`` es otra cosa: infraestructura
de la Regla 5 que guarda y sirve el almacén de modelos al catálogo y al
instalador, sin grant. Ninguna residencia puede estar cargada ahí: si lo está,
alguien ejecutó un modelo por una segunda ruta.

Este gate reconcilia esa mitad, que ningún otro mide: pregunta ``/api/ps`` al
runtime de infraestructura y falla si hay algún modelo cargado.

Salida: 0 sin residencias; 1 con alguna (la nombra); 2 sin poder medir (nadie
escucha, respuesta ilegible o sin ``models``): un vacío sin medida no es PASS.

*Métrica:* los modelos que ``/api/ps`` del runtime de infraestructura declara
cargados en el momento de la consulta.
*Ciega a:* una residencia que se cargó y descargó entre dos consultas, y a una
ejecución que no deja modelo residente (``keep_alive: 0``): detecta el estado,
no impide la ruta. Impedirla es otra decisión (ver la nota de cierre del ADR).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_PORT = "51434"
PORT_VARIABLE = "THYROX_INFRA_OLLAMA_PORT"
LOOPBACK = "127.0.0.1"
TIMEOUT_SECONDS = 5
UNMEASURED = 2


class Unmeasured(Exception):
    """El runtime no dio una medida: se rehúsa en vez de publicar un vacío."""


def loaded_models(base_url: str) -> list[dict]:
    try:
        with urllib.request.urlopen(f"{base_url.rstrip('/')}/api/ps", timeout=TIMEOUT_SECONDS) as response:
            document = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, OSError) as error:
        raise Unmeasured(f"no respondió {base_url}/api/ps: {error}") from error
    except json.JSONDecodeError as error:
        raise Unmeasured(f"{base_url}/api/ps no devolvió JSON: {error}") from error
    models = document.get("models") if isinstance(document, dict) else None
    if not isinstance(models, list):
        raise Unmeasured(f"{base_url}/api/ps no trae la lista models")
    return models


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="El Ollama de infraestructura no tiene residencias.")
    port = os.environ.get(PORT_VARIABLE, "").strip() or DEFAULT_PORT
    parser.add_argument("--ollama-url", default=f"http://{LOOPBACK}:{port}")
    args = parser.parse_args(argv)
    try:
        models = loaded_models(args.ollama_url)
    except Unmeasured as error:
        print(f"check_infrastructure_runtime_idle: no se pudo medir: {error}", file=sys.stderr)
        return UNMEASURED
    for model in models:
        print(f"  residencia sin grant en la infraestructura: {model.get('name', '?')} (digest {model.get('digest', '?')})")
    print(f"check_infrastructure_runtime_idle: {len(models)} residencia(s) en {args.ollama_url}")
    return 1 if models else 0


if __name__ == "__main__":
    sys.exit(main())
