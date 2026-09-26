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


# Agrupar por FORMA y no sólo por nombre (h-thyrox-185): en el paso 134, 9 de
# 19 unidades eran tipos distintos con el mismo nombre. La suite anula esta
# mitad para comprobar que sus casos caen.
GROUP_BY_SHAPE = True
DECLARATION = re.compile(r"^(?P<export>export )?(?P<kind>type|interface) (?P<name>[A-Z][A-Za-z0-9_]*)\b", re.M)
# Un marcador ocupa el sitio del contrato sin su forma: es una copia reducida
# por definición, así que se agrupa con cualquier forma del mismo nombre.
STUB = re.compile(r"^(?:unknown|any|object|\{\s*\}|Record<\s*string\s*,\s*(?:unknown|any)\s*>);?$")
# Dos literales de objeto son el mismo tipo si comparten al menos esta
# fracción de los campos del menor, y al menos dos: un campo convencional
# (`children`) no encadena props de componentes distintos.
MIN_SHARED_FIELDS = 2
MIN_SHARED_FRACTION = 0.5
# Un nombre con más grupos de forma que esto es una convención por archivo
# (`Props`: 155 grupos en 282 copias), no un contrato; el siguiente nombre del
# árbol tiene 8 (banco route2-shape-grouping-20260925T204815).
MAX_DISTINCT_SHAPES = 10
ALIAS = re.compile(r"^(?:import\(|[A-Z][\w.]*(?:<[^{]*>)?$)")
FIELD = re.compile(r"^\s*(?:readonly\s+)?['\"]?([A-Za-z_$][\w$]*)['\"]?\??\s*:")
DISCRIMINANT = re.compile(r"^\s*type\s*:\s*'([^']*)'")
OPENERS, CLOSERS = "({[", ")}]"


@dataclass(frozen=True)
class Shape:
    """La forma de una declaración: qué clase de tipo es, su cabeza (el primer
    identificador de una intersección o una unión), su discriminante literal y
    los campos de su literal de objeto de primer nivel."""
    kind: str
    head: str
    discriminant: str | None
    fields: frozenset[str]


def _body(text: str, start: int, kind: str) -> str:
    """El lado derecho de la declaración: tras ``=`` en un ``type``, desde la
    llave en una ``interface``; termina en el salto de línea a profundidad 0
    que no continúa con ``|`` o ``&``."""
    if kind == "type":
        start = _declaration_equals(text, start) + 1
    else:
        start = text.index("{", start)
    depth, out = 0, []
    for index in range(start, len(text)):
        char = text[index]
        if char in OPENERS:
            depth += 1
        elif char in CLOSERS:
            depth -= 1
            if depth == 0 and kind == "interface":
                out.append(char)
                break
        elif char == "\n" and depth == 0 and "".join(out).strip():
            following = text[index + 1:].lstrip(" \t")
            if not following.startswith(("|", "&")) and not "".join(out).rstrip().endswith(("|", "&", "=>", "=")):
                break
        out.append(char)
    return "".join(out).strip()


def _declaration_equals(text: str, start: int) -> int:
    """El ``=`` de la declaración, no el del valor por defecto de un genérico."""
    depth = 0
    for index in range(start, len(text)):
        char = text[index]
        if char == "<":
            depth += 1
        elif char == ">":
            depth -= 1
        elif char == "=" and depth == 0:
            return index
    raise ValueError("declaración sin =")


def _top_level_object(body: str) -> str:
    """El interior del primer literal de objeto de primer nivel, sin sus niveles internos."""
    depth, inside, kept = 0, False, []
    for char in body:
        if char in OPENERS:
            depth += 1
            if char == "{" and depth == 1:
                inside = True
                continue
        elif char in CLOSERS:
            depth -= 1
            if inside and depth == 0:
                break
        if inside and depth == 1:
            kept.append(char)
    return "".join(kept)


def shape_of(body: str, kind: str) -> Shape | None:
    """None si la declaración es un alias a otro tipo: no es una copia."""
    if kind == "type" and STUB.match(body):
        return Shape("stub", "", None, frozenset())
    if kind == "type" and ALIAS.match(body):
        return None
    lines = _top_level_object(body).splitlines()
    fields = frozenset(match.group(1) for line in lines if (match := FIELD.match(line)))
    discriminant = next((match.group(1) for line in lines if (match := DISCRIMINANT.match(line))), None)
    if kind == "interface" or body.startswith("{"):
        return Shape("object", "", discriminant, fields)
    if body.startswith(("(", "<")) and "=>" in body:
        return Shape("function", "", discriminant, fields)
    head = re.match(r"[\w.$]+", body)
    return Shape("other", head.group(0) if head else body[:1], discriminant, fields)


def same_type(left: Shape, right: Shape) -> bool:
    if left.discriminant and right.discriminant and left.discriminant != right.discriminant:
        return False
    if left.kind == right.kind == "function":
        return True
    if left.kind == right.kind == "other" and left.head == right.head:
        return True
    if "function" in (left.kind, right.kind):
        return False
    shared = len(left.fields & right.fields)
    smaller = min(len(left.fields), len(right.fields))
    if smaller == 0:
        return False
    if left.fields == right.fields or (shared == smaller and smaller >= MIN_SHARED_FIELDS):
        return True
    return shared >= MIN_SHARED_FIELDS and shared >= MIN_SHARED_FRACTION * smaller


def _largest_cluster(copies: list[tuple[str, Shape, bool]]) -> list[str]:
    """El mayor grupo conexo de copias de la misma forma que incluya una
    exportada. Los marcadores no unen grupos entre sí: se suman al mayor
    grupo concreto, porque cada uno ocupa el sitio de ese contrato."""
    stubs = [c for c in copies if c[1].kind == "stub"]
    copies = [c for c in copies if c[1].kind != "stub"]
    parent = list(range(len(copies)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    for i in range(len(copies)):
        for j in range(i + 1, len(copies)):
            if same_type(copies[i][1], copies[j][1]):
                parent[find(i)] = find(j)
    groups: dict[int, list[int]] = defaultdict(list)
    for index in range(len(copies)):
        groups[find(index)].append(index)
    if len(groups) > MAX_DISTINCT_SHAPES:
        return []
    best: list[str] = []
    for members in groups.values():
        chosen = [copies[m] for m in members] + stubs
        files = sorted({copy[0] for copy in chosen})
        if len(files) > 1 and any(copy[2] for copy in chosen) and len(files) > len(best):
            best = files
    if not best and len({s[0] for s in stubs}) > 1 and any(s[2] for s in stubs):
        best = sorted({s[0] for s in stubs})
    return best


def duplicated_types(root: Path) -> dict[str, list[str]]:
    """Nombres declarados como `type`/`interface` en más de un archivo, si al
    menos uno lo exporta y las copias tienen la misma forma. Un nombre sólo
    local en varios archivos (`Props`, `State`) no cuenta; tampoco dos
    declaraciones exportadas cuyo discriminante, cabeza o campos no coinciden,
    ni un alias ``= import(...)`` que ya apunta a la canónica."""
    copies: dict[str, list[tuple[str, Shape, bool]]] = defaultdict(list)
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
            for match in DECLARATION.finditer(text):
                declared, is_exported = match["name"], bool(match["export"])
                if is_exported:
                    exported.add(declared)
                where[declared].add(relative)
                try:
                    shape = shape_of(_body(text, match.end(), match["kind"]), match["kind"])
                except ValueError:
                    shape = Shape("other", "", None, frozenset())
                if shape is not None:
                    copies[declared].append((relative, shape, is_exported))
    if not GROUP_BY_SHAPE:
        return {name: sorted(files) for name, files in sorted(where.items())
                if len(files) > 1 and name in exported}
    found = {}
    for name in sorted(copies):
        if name in exported and (cluster := _largest_cluster(copies[name])):
            found[name] = cluster
    return found


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
