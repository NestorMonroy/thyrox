#!/usr/bin/env python3
"""Suite de `check_stand_ins.py`: un sustituto local no sobrevive a su original.

Catorce paquetes llevan un `src/internal/pendingCrossPackageDeps.ts` con
reimplementaciones de símbolos de OTRO paquete, escritas cuando ese paquete no
los exportaba o no era miembro del workspace. Cada uno declara su condición de
retiro —«cuando el hermano exporte el símbolo»— y nadie la medía: el de
`mcp-runtime` seguía vivo con los dos símbolos ya exportados por
`@thyrox/config/env/utils`.

El gate nombra cada símbolo del sustituto que otro paquete ya ofrece por su
`exports`. Los casos que discriminan: el símbolo exportado por un archivo que
el mapa de `exports` NO cubre (existe, pero no es frontera pública) no cuenta,
y el del propio paquete tampoco.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from verify import check_stand_ins  # noqa: E402

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def package(src: Path, rel: str, name: str, exports: dict) -> Path:
    pkg = src / rel
    write(pkg / "package.json", json.dumps({"name": name, "exports": exports}))
    return pkg


def tree() -> Path:
    src = Path(tempfile.mkdtemp(prefix="stand-ins-")) / "src"
    config = package(src, "packages/config", "@t/config",
                     {"./env/utils": {"@thyrox/source": "./env/utils.ts", "default": "./env/utils.ts"}})
    write(config / "env" / "utils.ts",
          "export function isEnvDefinedFalsy(v) { return !v }\n"
          "export const getHome = () => '/h'\n")
    write(config / "hidden" / "secret.ts", "export function secretThing() {}\n")
    package(src, "packages/other", "@t/other", {".": "./index.ts"})
    write(src / "packages" / "other" / "index.ts", "export type Shape = { a: 1 }\n")
    mcp = package(src, "packages/mcp", "@t/mcp", {".": "./src/index.ts"})
    write(mcp / "src" / "internal" / "pendingCrossPackageDeps.ts",
          "export function isEnvDefinedFalsy(v) { return !v }\n"
          "export const getHome = () => '/h'\n"
          "export function secretThing() {}\n"
          "export function onlyHere() {}\n"
          "export type Shape = { a: 1 }\n")
    write(mcp / "src" / "own.ts", "export function onlyHere() {}\n")
    return src


print("\n1. Nombra lo que un hermano ya exporta, con su especificador")
src = tree()
found = {(s.symbol, s.specifier) for s in check_stand_ins.shadowed(src)}
check("la función exportada por ./env/utils", True, ("isEnvDefinedFalsy", "@t/config/env/utils") in found)
check("la constante también", True, ("getHome", "@t/config/env/utils") in found)
check("el tipo exportado por la raíz del hermano", True, ("Shape", "@t/other") in found)
check("no lo que sólo existe en un archivo fuera de exports", False,
      any(s == "secretThing" for s, _ in found))
check("ni lo que exporta el propio paquete", False, any(s == "onlyHere" for s, _ in found))

print("\n2. El conteo publica su denominador y la CLI discrimina")
rc, out = check_stand_ins.run([str(src)])
check("con sustitutos obsoletos sale 1", 1, rc)
check("y publica cuántos símbolos midió en cuántos archivos", True,
      "5 símbolo(s)" in out and "1 archivo(s)" in out)
(src / "packages" / "mcp" / "src" / "internal" / "pendingCrossPackageDeps.ts").write_text(
    "export function onlyHere() {}\n", encoding="utf-8")
rc, out = check_stand_ins.run([str(src)])
check("sin obsoletos sale 0", 0, rc)

print("\n4. Marca el ciclo: importar el original desde un paquete que ya depende del dueño")
# Retirar un sustituto es importar el original. Si el paquete del original ya
# depende —directa o transitivamente— del dueño del sustituto, ese import
# cierra un ciclo, y el sustituto no se retira por import sino bajando el
# símbolo a un paquete común. El gate tiene que distinguir los dos casos.
# El ciclo que rompe en ejecución es de MÓDULOS, no de paquetes: dos paquetes
# que se usan en las dos direcciones por módulos distintos no se encierran.
# Medido sobre el árbol real, la vara de paquete marcaba 243 de 244 símbolos.
src = tree()
write(src / "packages" / "mcp" / "src" / "index.ts", "export const y = 1\n")
loop = package(src, "packages/loop", "@t/loop", {".": "./index.ts", "./free": "./free.ts"})
write(loop / "index.ts", "import { x } from '@t/mid'\nexport function loopThing() {}\n")
write(loop / "free.ts", "export function loopFree() {}\n")
mid = package(src, "packages/mid", "@t/mid", {".": "./index.ts"})
write(mid / "index.ts", "import { y } from '@t/mcp'\nexport const x = 1\n")
write(src / "packages" / "mcp" / "src" / "internal" / "pendingCrossPackageDeps.ts",
      "export function isEnvDefinedFalsy(v) { return !v }\n"
      "export function loopThing() {}\nexport function loopFree() {}\n")
by_symbol = {s.symbol: s for s in check_stand_ins.shadowed(src)}
check("sin ciclo: config no depende de mcp", (), by_symbol["isEnvDefinedFalsy"].cycle)
check("con ciclo transitivo de módulos: loop -> mid -> mcp",
      ("packages/loop/index.ts", "packages/mid/index.ts", "packages/mcp/src/index.ts"),
      by_symbol["loopThing"].cycle)
check("ciclo de paquetes sin ciclo de módulos: se puede importar",
      (), by_symbol["loopFree"].cycle)
rc, out = check_stand_ins.run([str(src)])
check("la salida nombra el ciclo",
      True, "ciclo: packages/loop/index.ts -> packages/mid/index.ts -> packages/mcp/src/index.ts" in out)

print("\n3. Rehúsa sin publicar un cero cuando no hay nada que medir")
empty = Path(tempfile.mkdtemp(prefix="stand-ins-empty-")) / "src"
empty.mkdir(parents=True)
rc, out = check_stand_ins.run([str(empty)])
check("sin sustitutos rehúsa con 2", 2, rc)
check("y sin conteo", False, "símbolo(s)" in out)

print(f"\ntest_check_stand_ins: {PASS} ok, {FAIL} falla(s)")
sys.exit(1 if FAIL else 0)
