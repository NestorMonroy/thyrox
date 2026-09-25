"""Las tres rutas del plan v3: clasificar un error de tsc por dónde vive su causa.

- **determinista**: el código de error tiene una sola corrección posible
  (módulo sin declaraciones, símbolo sin portar, parámetro inferible);
- **compartida**: el mensaje cita un tipo exportado desde más de un archivo
  —una copia reducida de un contrato—, y arreglar la definición colapsa los
  errores de todos sus consumidores;
- **local**: el resto, que sigue siendo del pool de agentes por archivo.

La ruta determinista manda sobre la compartida: su corrección no necesita
juicio, así que no espera en la cola de definiciones.

Medido al escribirlo (paso 112, 613 errores): unificar UNA definición
duplicada quitó 67 errores y reveló 5, contra unos 15 por lote del pool.
"""
from __future__ import annotations

import os
import re
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

# TS7016: módulo sin declaraciones · TS2305/TS2724: símbolo que el módulo no
# exporta (sin portar) · TS7006: parámetro con `any` implícito.
DETERMINISTIC = frozenset({"TS7016", "TS2305", "TS2724", "TS7006"})

HEADER = re.compile(r"^(?P<file>[^(\s][^(]*)\((?P<line>\d+),(?P<col>\d+)\): error (?P<code>TS\d+): (?P<message>.*)$")
# Un tipo citado es el texto entre comillas que sigue a la palabra `type`; el
# de una propiedad (`Property 'x'`) o un módulo (`module 'x'`) no lo es.
QUOTED_TYPE = re.compile(r"\b[Tt]ype '((?:[^']|'(?!\s|\.|$))*)'")
IDENTIFIER = re.compile(r"\b[A-Z][A-Za-z0-9_]*\b")
EXPORTED = re.compile(r"^export (?:type|interface) ([A-Z][A-Za-z0-9_]*)", re.M)
# Una copia LOCAL (sin `export`) de un tipo exportado en otro lado también
# compite con él: paso 113, dos `type CanUseToolFn = (...args: unknown[])`
# en `agent` causaban 6 errores que esta cola no veía.
LOCAL = re.compile(r"^(?:type|interface) ([A-Z][A-Za-z0-9_]*)", re.M)
SKIPPED = {"node_modules", "dist", "__tests__"}


@dataclass(frozen=True)
class Diagnostic:
    file: str
    line: int
    code: str
    message: str


def parse_diagnostics(log: str) -> list[Diagnostic]:
    """Sólo las cabeceras: las líneas sangradas son la explicación de la anterior."""
    found = []
    for raw in log.splitlines():
        match = HEADER.match(raw)
        if match:
            found.append(Diagnostic(match["file"], int(match["line"]), match["code"], match["message"]))
    return found


def outer_level(text: str) -> str:
    """El tipo sin el interior de sus literales de objeto (`{…}`) ni de sus
    listas de parámetros (`(…)`): lo que tsc imprime dentro es estructura, no
    el tipo citado. Paso 114: ocho errores de `ToolPermissionContext` se
    atribuyeron a `AdditionalWorkingDirectory`, impreso dentro de su literal."""
    kept, depth = [], 0
    for char in text:
        if char in "{(":
            depth += 1
        elif char in "})":
            depth = max(depth - 1, 0)
        elif depth == 0:
            kept.append(char)
    return "".join(kept)


def cited_types(message: str) -> set[str]:
    names: set[str] = set()
    for quoted in QUOTED_TYPE.findall(message):
        names.update(IDENTIFIER.findall(outer_level(quoted)))
    return names


def duplicated_types(root: Path) -> dict[str, list[str]]:
    """Nombres declarados como `type`/`interface` en más de un archivo, si al
    menos uno lo exporta. Un nombre sólo local en varios archivos (`Props`,
    `State`) no cuenta: son tipos distintos que comparten nombre."""
    where: dict[str, set[str]] = defaultdict(set)
    exported: set[str] = set()
    # Poda in situ y sin seguir enlaces: `src/packages` tiene cientos de
    # enlaces de workspace, y un recorrido que los sigue no termina (h-thyrox-29).
    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if d not in SKIPPED)
        for name in sorted(files):
            if not name.endswith((".ts", ".tsx")) or name.endswith(".d.ts"):
                continue
            path = Path(current) / name
            text = path.read_text(encoding="utf-8", errors="ignore")
            relative = str(path.relative_to(root))
            for declared in EXPORTED.findall(text):
                exported.add(declared)
                where[declared].add(relative)
            for declared in LOCAL.findall(text):
                where[declared].add(relative)
    return {name: sorted(files) for name, files in sorted(where.items())
            if len(files) > 1 and name in exported}


def shared_type(diagnostic: Diagnostic, duplicates: dict[str, list[str]]) -> str | None:
    cited = sorted(cited_types(diagnostic.message) & duplicates.keys())
    return cited[0] if cited else None


def classify(diagnostics: list[Diagnostic], duplicates: dict[str, list[str]],
             deterministic: frozenset[str] = DETERMINISTIC) -> dict[str, list[Diagnostic]]:
    routes: dict[str, list[Diagnostic]] = {"deterministic": [], "shared": [], "local": []}
    for diagnostic in diagnostics:
        if diagnostic.code in deterministic:
            routes["deterministic"].append(diagnostic)
        elif shared_type(diagnostic, duplicates):
            routes["shared"].append(diagnostic)
        else:
            routes["local"].append(diagnostic)
    return routes


def shared_queue(shared: list[Diagnostic], duplicates: dict[str, list[str]]) -> list[dict]:
    """Una entrada por definición duplicada, de la que más errores cita a la que menos."""
    by_type: dict[str, list[Diagnostic]] = defaultdict(list)
    for diagnostic in shared:
        by_type[shared_type(diagnostic, duplicates)].append(diagnostic)
    queue = [{"type": name, "errors": len(found), "definitions": duplicates[name],
              "consumers": sorted({d.file for d in found})} for name, found in by_type.items()]
    return sorted(queue, key=lambda entry: (-entry["errors"], entry["type"]))
