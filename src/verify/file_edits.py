#!/usr/bin/env python3
"""Aplica ediciones propuestas sin tocar disco — envoltorio, no porte.

El aplicador es el de la herramienta `Edit` en TypeScript
(`src/packages/tool-registry/bin/applyEdits.ts`, que llama a
`getPatchForEdits` y a las reglas de `FileEditTool.validateInput`). Aquí sólo
se le pasa el lote y se lee su veredicto: una segunda implementación en
Python se desviaría de la primera sin que nadie lo notara.
"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENTRYPOINT = ROOT / "src/packages/tool-registry/bin/applyEdits.ts"


class ApplierUnavailable(RuntimeError):
    """El aplicador no respondió: no es un veredicto sobre las ediciones."""


def apply_files(files: list[dict]) -> dict[str, dict]:
    """`files`: `[{path, content (None = no existe), edits}]`. Devuelve, por
    ruta, `{"updatedFile": ...}` o `{"error": ...}`."""
    if not files:
        return {}
    bun = os.environ.get("THYROX_TOOLCHAIN_BUN_BIN", "bun")
    result = subprocess.run([bun, str(ENTRYPOINT)], input=json.dumps({"files": files}),
                            capture_output=True, text=True, cwd=ROOT)
    if result.returncode != 0:
        raise ApplierUnavailable(f"applyEdits salió {result.returncode}: {result.stderr.strip()[-300:]}")
    return {row["path"]: row for row in json.loads(result.stdout)["results"]}
