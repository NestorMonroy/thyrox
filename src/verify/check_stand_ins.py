#!/usr/bin/env python3
"""Gate: un sustituto local no sobrevive a su original.

Catorce paquetes llevan un `src/internal/pendingCrossPackageDeps.ts` con
reimplementaciones de símbolos de OTRO paquete, escritas cuando ese paquete no
los exportaba o no era miembro del workspace. Cada uno declara su condición de
retiro —«cuando el hermano exporte el símbolo»— y nadie la medía: el de
`mcp-runtime` seguía vivo con sus dos símbolos ya exportados por
`@thyrox/config/env/utils`. Mantener la copia es tener dos implementaciones de
lo mismo, y la del hermano es la que se corrige.

Este gate nombra cada símbolo de un sustituto que otro paquete ya ofrece por su
frontera pública, con el especificador por el que importarlo. Un paquete es
todo `package.json` bajo `src/` que declara `exports` (`source_packages`); un
archivo es público si algún destino de su `exports` lo cubre.

Salida: 0 ningún sustituto obsoleto · 1 los hay · 2 no hay sustitutos que
medir, y entonces no publica conteo.

Uso:
    check_stand_ins [src]

*Métrica:* coincidencia de NOMBRE entre lo que el sustituto exporta y lo que
exporta un archivo público de otro paquete.
*Ciega a:* que los dos cuerpos hagan lo mismo —un homónimo con otra firma
cuenta igual, y retirarlo exige compararlos—, y a un original que exista con
otro nombre.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from typescript.emit_declarations import source_packages

STAND_IN_NAME = "pendingCrossPackageDeps.ts"
SKIPPED_DIRS = frozenset({"node_modules", "dist", ".git", "__tests__"})
CODE_SUFFIXES = (".ts", ".tsx", ".mts")
TARGET_CONDITIONS = ("@thyrox/source", "import", "default")

_DECLARED = re.compile(
    r"^export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?"
    r"(?:function\*?|const|let|var|class|type|interface|enum|abstract\s+class)\s+"
    r"([A-Za-z_$][\w$]*)",
    re.MULTILINE,
)
_LISTED = re.compile(r"^export\s+(?:type\s+)?\{([^}]*)\}", re.MULTILINE)


_SPECIFIERS = re.compile(r"""(?:from|import)\s*\(?\s*['"]([^'"]+)['"]""")


@dataclass(frozen=True)
class Shadowed:
    stand_in: Path
    symbol: str
    specifier: str
    # La cadena de módulos desde el original hasta el paquete dueño del
    # sustituto, si existe: importar el original cerraría ese ciclo. Vacía
    # si no lo hay.
    cycle: tuple[str, ...] = ()


def exported_names(text: str) -> set[str]:
    """Los nombres que un módulo exporta, declarados o listados."""
    names = set(_DECLARED.findall(text))
    for block in _LISTED.findall(text):
        for part in block.split(","):
            part = part.strip().removeprefix("type ").strip()
            if part:
                names.add(part.split(" as ")[-1].strip())
    return names


def _target(value) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for condition in TARGET_CONDITIONS:
            if isinstance(value.get(condition), str):
                return value[condition]
    return None


def _walk(root: Path):
    """Los archivos bajo `root`, podando antes de bajar: `node_modules` no se
    recorre para descartarlo después."""
    for directory, subdirs, files in os.walk(root):
        subdirs[:] = [d for d in subdirs if d not in SKIPPED_DIRS]
        for name in files:
            yield Path(directory) / name


def _code_files(package_dir: Path) -> list[Path]:
    return [p for p in _walk(package_dir)
            if p.suffix in CODE_SUFFIXES and not p.name.endswith((".test.ts", ".d.ts"))]


def public_modules(package_dir: Path) -> dict[Path, str]:
    """Cada archivo que el `exports` del paquete cubre, con su especificador."""
    manifest = json.loads((package_dir / "package.json").read_text(encoding="utf-8"))
    name = manifest.get("name") or package_dir.name
    exports = manifest.get("exports")
    if isinstance(exports, str):
        exports = {".": exports}
    if not isinstance(exports, dict):
        return {}
    files = _code_files(package_dir)
    public: dict[Path, str] = {}
    for key, value in exports.items():
        target = _target(value)
        if not target:
            continue
        pattern = re.escape(target.removeprefix("./")).replace(r"\*", "(.+)")
        matcher = re.compile(f"^{pattern}$")
        for path in files:
            found = matcher.match(path.relative_to(package_dir).as_posix())
            if not found:
                continue
            subpath = key.replace("*", found.group(1)) if found.groups() else key
            public.setdefault(path, name if subpath == "." else f"{name}/{subpath.removeprefix('./')}")
    return public


def _package_name(package_dir: Path) -> str:
    manifest = json.loads((package_dir / "package.json").read_text(encoding="utf-8"))
    return manifest.get("name") or package_dir.name


_RELATIVE_SUFFIXES = ("", ".ts", ".tsx", "/index.ts", "/index.tsx")


def _resolve_relative(origin: Path, specifier: str) -> Path | None:
    """El archivo al que apunta un import relativo, con la equivalencia
    `.js` -> `.ts` que TypeScript aplica al resolver."""
    base = (origin.parent / specifier).resolve()
    candidates = [base.with_suffix(".ts"), base.with_suffix(".tsx")] if base.suffix == ".js" else []
    candidates += [Path(f"{base}{suffix}") for suffix in _RELATIVE_SUFFIXES]
    return next((c for c in candidates if c.is_file()), None)


def module_graph(packages: list[Path]) -> dict[Path, set[Path]]:
    """Qué módulos importa cada módulo del árbol: por nombre de paquete,
    resuelto con el mapa de `exports`, y por ruta relativa. El ciclo que rompe
    en ejecución es de módulos; uno de paquetes puede no encerrar a ninguno."""
    by_specifier: dict[str, Path] = {}
    for package_dir in packages:
        for path, specifier in public_modules(package_dir).items():
            by_specifier.setdefault(specifier, path)
    graph: dict[Path, set[Path]] = {}
    for package_dir in packages:
        for path in _code_files(package_dir):
            text = path.read_text(encoding="utf-8", errors="replace")
            targets: set[Path] = set()
            for specifier in _SPECIFIERS.findall(text):
                target = (_resolve_relative(path, specifier) if specifier.startswith(".")
                          else by_specifier.get(specifier))
                if target is not None:
                    targets.add(target.resolve())
            graph[path.resolve()] = targets
    return graph


def cycle_into(graph: dict[Path, set[Path]], start: Path, owner: Path) -> tuple[Path, ...]:
    """La cadena más corta de imports desde `start` hasta un módulo del
    paquete `owner`, o vacía: importar `start` desde `owner` la cerraría."""
    start = start.resolve()
    owner = owner.resolve()
    previous: dict[Path, Path | None] = {start: None}
    frontier = [start]
    while frontier:
        following: list[Path] = []
        for node in frontier:
            for neighbour in sorted(graph.get(node, ())):
                if neighbour in previous:
                    continue
                previous[neighbour] = node
                if neighbour.is_relative_to(owner):
                    chain = [neighbour]
                    while (before := previous[chain[-1]]) is not None:
                        chain.append(before)
                    return tuple(reversed(chain))
                following.append(neighbour)
        frontier = following
    return ()


def stand_ins(src: Path) -> list[Path]:
    return sorted(p for p in _walk(src) if p.name == STAND_IN_NAME)


def shadowed(src: Path) -> list[Shadowed]:
    """Los símbolos de cada sustituto que otro paquete ya exporta."""
    src = Path(src).resolve()
    packages = source_packages(src.parent)
    offered: dict[str, list[tuple[Path, Path, str]]] = {}
    for package_dir in packages:
        for path, specifier in public_modules(package_dir).items():
            for symbol in exported_names(path.read_text(encoding="utf-8", errors="replace")):
                offered.setdefault(symbol, []).append((package_dir, path, specifier))
    graph = module_graph(packages)
    found: list[Shadowed] = []
    for stand_in in stand_ins(src):
        owners = [p for p in packages if stand_in.is_relative_to(p)]
        owner = max(owners, key=lambda p: len(p.parts)) if owners else None
        for symbol in sorted(exported_names(stand_in.read_text(encoding="utf-8"))):
            candidates = [
                Shadowed(stand_in, symbol, specifier, tuple(
                    m.relative_to(src).as_posix()
                    for m in cycle_into(graph, module, owner)) if owner else ())
                for package_dir, module, specifier in offered.get(symbol, [])
                if package_dir != owner
            ]
            if candidates:
                # Se prefiere el original que se puede importar sin ciclo.
                found.append(min(candidates, key=lambda s: (bool(s.cycle), s.specifier)))
    return found


def run(argv: list[str]) -> tuple[int, str]:
    src = Path(argv[0] if argv else "src").resolve()
    files = stand_ins(src) if src.is_dir() else []
    if not files:
        return 2, f"check_stand_ins: ningún {STAND_IN_NAME} bajo {src}; no se mide"
    symbols = sum(len(exported_names(f.read_text(encoding="utf-8"))) for f in files)
    found = shadowed(src)
    lines = [f"  {s.stand_in.relative_to(src.parent)}: {s.symbol} -> {s.specifier}"
             + (f"  (ciclo: {' -> '.join(s.cycle)})" if s.cycle else "")
             for s in found]
    lines.append(f"check_stand_ins: {len(found)} símbolo(s) con original exportado "
                 f"(alcance medido: {symbols} símbolo(s) en {len(files)} archivo(s))")
    return (1 if found else 0), "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    code, out = run(list(sys.argv[1:] if argv is None else argv))
    print(out, file=sys.stderr if code == 2 else sys.stdout)
    return code


if __name__ == "__main__":
    sys.exit(main())
