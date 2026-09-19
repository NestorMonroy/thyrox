#!/usr/bin/env python3
"""Clasifica cada subpath sin resolver por el ARREGLO que necesita, no por su forma.

El censo hermano (`census_unresolved_subpaths.py`) publica QUE no resuelve. Esto
publica POR QUE, y son clases con arreglos distintos:

  MANIFIESTO  el modulo EXISTE en disco; lo que falta es la entrada que lo
              alcanza. Arreglo: declarar el subpath (o el comodin con la
              extension literal correcta).
  PUERTO      el modulo NO existe en ninguna forma. Arreglo: portarlo, o
              retirar el import. No es un defecto de manifiesto.
  DESCONOCIDO ninguna de las dos se puede decidir con este instrumento.

Metrica: para cada specifier sin resolver, se buscan en disco los candidatos
que un manifiesto razonable podria alcanzar — el mismo camino con `.ts`/`.tsx`,
con y sin el prefijo `src/`, y su `index`.
Ciega a: un modulo que exista con OTRO nombre (un renombre en el puerto); a si
el import deberia existir siquiera — el instrumento supone que el importador
tiene razon, que es justo lo que TASK-THYROX-0226 midio decisivamente para
`config` y no esta medido para los demas; y a un specifier que llegue por una
forma de resolucion que el ancla no enumera, como `Bun.resolveSync('@thyrox/x')`
en codigo vivo. Medido al escribir el ancla: 0 casos de esa forma en el arbol,
asi que hoy no hay falso negativo — pero es ausencia medida, no imposibilidad.
"""
import json
import os
import pathlib
import re
import sys

SPECIFIER = re.compile(r"['\"]@thyrox/([a-z0-9-]+)/([A-Za-z0-9_./-]+)['\"]")

#: Lo que hace de un literal entrecomillado un SPECIFIER y no un dato: que
#: ocupe posicion de import. Sin este ancla, un `expect(truncar('@thyrox/...'))`
#: de un test de truncado de rutas entra al universo como si fuera un import.
IMPORT_POSITION = re.compile(r"\b(?:import|require|from|mock\.module)\b")

#: Cuantos caracteres ANTES del literal se miran para hallar el ancla. Solo
#: hacia atras, y basta: las cuatro formas del ancla PRECEDEN al literal en
#: todas sus variantes — `import x from '...'`, `} from '...'` al cerrar una
#: lista multilinea, `require('...')`, `await import('...')`,
#: `mock.module('...')`. Ninguna lo sigue.
WINDOW = 60

#: Interruptor del control de anulacion: con el ancla retirada tienen que
#: reaparecer EXACTAMENTE los literales que son dato, ni uno mas.
ANCHOR_ENABLED = os.environ.get("CLASSIFY_NO_ANCHOR") != "1"


def in_import_position(text: str, start: int) -> bool:
    """El literal que empieza en `start` ocupa posicion de import."""
    if not ANCHOR_ENABLED:
        return True
    return bool(IMPORT_POSITION.search(text[max(0, start - WINDOW):start]))
SUFFIXES = (".ts", ".tsx", ".js")


def export_map(manifest: pathlib.Path) -> dict[str, str]:
    raw = json.loads(manifest.read_text()).get("exports", {})
    flat: dict[str, str] = {}
    for key, value in raw.items():
        if isinstance(value, str):
            flat[key] = value
        elif isinstance(value, dict):
            target = value.get("default") or value.get("import") or value.get("require")
            if isinstance(target, str):
                flat[key] = target
    return flat


def resolve(subpath: str, exports: dict[str, str]) -> str | None:
    key = f"./{subpath}"
    if key in exports:
        return exports[key]
    best: tuple[int, int, str] | None = None
    for pattern, target in exports.items():
        if "*" not in pattern:
            continue
        head, _, tail = pattern.partition("*")
        if key.startswith(head) and key.endswith(tail) and len(key) >= len(head) + len(tail):
            middle = key[len(head): len(key) - len(tail) or None]
            rank = (len(head), len(tail))
            if best is None or rank > best[:2]:
                best = (*rank, target.replace("*", middle))
    return best[2] if best else None


def candidates(package_dir: pathlib.Path, subpath: str) -> list[str]:
    """Rutas reales que un manifiesto razonable podria alcanzar para este subpath."""
    stem = subpath
    for suffix in SUFFIXES:
        if stem.endswith(suffix):
            stem = stem[: -len(suffix)]
            break
    found: list[str] = []
    for prefix in ("", "src/"):
        for suffix in (".ts", ".tsx"):
            for tail in (f"{stem}{suffix}", f"{stem}/index{suffix}"):
                path = package_dir / f"{prefix}{tail}"
                if path.is_file():
                    found.append(f"{prefix}{tail}")
    return found


def main() -> int:
    root = pathlib.Path.cwd()
    packages = root / "src" / "packages"

    seen: dict[tuple[str, str], int] = {}
    for source in list(root.glob("src/**/*.ts")) + list(root.glob("src/**/*.tsx")) \
            + list(root.glob("tests/**/*.ts")):
        if "node_modules" in source.parts:
            continue
        text = source.read_text(errors="ignore")
        for match in SPECIFIER.finditer(text):
            if not in_import_position(text, match.start()):
                continue
            package, subpath = match.group(1), match.group(2)
            seen[(package, subpath)] = seen.get((package, subpath), 0) + 1

    buckets: dict[str, list[str]] = {"MANIFIESTO": [], "PUERTO": [], "DESCONOCIDO": []}
    for (package, subpath), hits in sorted(seen.items()):
        manifest = packages / package / "package.json"
        if not manifest.exists():
            buckets["DESCONOCIDO"].append(f"@thyrox/{package}/{subpath} ({hits}) — el paquete no existe")
            continue
        target = resolve(subpath, export_map(manifest))
        if target is not None and (packages / package / target).exists():
            continue  # resuelve; no es sujeto
        found = candidates(packages / package, subpath)
        line = f"@thyrox/{package}/{subpath} ({hits} import(s))"
        if found:
            buckets["MANIFIESTO"].append(f"{line} -> EXISTE en {', '.join(found)}")
        else:
            buckets["PUERTO"].append(f"{line} -> ningun candidato en disco")

    total = sum(len(v) for v in buckets.values())
    print(f"specifiers distintos medidos: {len(seen)}")
    print(f"sin resolver: {total}")
    for name in ("MANIFIESTO", "PUERTO", "DESCONOCIDO"):
        print(f"\n== {name}: {len(buckets[name])}")
        for line in buckets[name]:
            print(f"  {line}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
