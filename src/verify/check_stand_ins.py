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


@dataclass(frozen=True)
class Shadowed:
    stand_in: Path
    symbol: str
    specifier: str


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


def stand_ins(src: Path) -> list[Path]:
    return sorted(p for p in _walk(src) if p.name == STAND_IN_NAME)


def shadowed(src: Path) -> list[Shadowed]:
    """Los símbolos de cada sustituto que otro paquete ya exporta."""
    src = Path(src).resolve()
    packages = source_packages(src.parent)
    offered: dict[str, list[tuple[Path, str]]] = {}
    for package_dir in packages:
        for path, specifier in public_modules(package_dir).items():
            for symbol in exported_names(path.read_text(encoding="utf-8", errors="replace")):
                offered.setdefault(symbol, []).append((package_dir, specifier))
    found: list[Shadowed] = []
    for stand_in in stand_ins(src):
        owner = next((p for p in packages if stand_in.is_relative_to(p)), None)
        for symbol in sorted(exported_names(stand_in.read_text(encoding="utf-8"))):
            for package_dir, specifier in offered.get(symbol, []):
                if package_dir != owner:
                    found.append(Shadowed(stand_in, symbol, specifier))
                    break
    return found


def run(argv: list[str]) -> tuple[int, str]:
    src = Path(argv[0] if argv else "src").resolve()
    files = stand_ins(src) if src.is_dir() else []
    if not files:
        return 2, f"check_stand_ins: ningún {STAND_IN_NAME} bajo {src}; no se mide"
    symbols = sum(len(exported_names(f.read_text(encoding="utf-8"))) for f in files)
    found = shadowed(src)
    lines = [f"  {s.stand_in.relative_to(src.parent)}: {s.symbol} -> {s.specifier}" for s in found]
    lines.append(f"check_stand_ins: {len(found)} símbolo(s) con original exportado "
                 f"(alcance medido: {symbols} símbolo(s) en {len(files)} archivo(s))")
    return (1 if found else 0), "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    code, out = run(list(sys.argv[1:] if argv is None else argv))
    print(out, file=sys.stderr if code == 2 else sys.stdout)
    return code


if __name__ == "__main__":
    sys.exit(main())
