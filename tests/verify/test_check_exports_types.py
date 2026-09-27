#!/usr/bin/env python3
"""Suite de `check_exports_types.py`: cada `exports.types` resuelve en el disco.

TASK-THYROX-0256. Un `types` que apunta al vacio no falla en ningun lado:
tsc cae a la condicion siguiente y el repunte queda inerte sin emitir un byte.
El gate lo hace visible, y exige ademas que el paquete que declara `dist/`
tenga con que construirlo (`tsconfig.build.json`) y con que probarlo
(`tsconfig.test.json`).

Cada caso corre el gate como proceso sobre un arbol sintetico. Los que
discriminan: el comodin con UNA declaracion de dos (un `any()` lo daria
verde) y el arbol sin paquetes, donde un 0 no distinguiria «todo resuelve»
de «no medi nada».
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "src" / "verify" / "check_exports_types.py"
PASSED = 0
FAILED = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global PASSED, FAILED
    if condition:
        PASSED += 1
        print(f"  ok   {label}")
    else:
        FAILED += 1
        print(f"  FAIL {label}\n       {detail}")


def run(root: Path) -> subprocess.CompletedProcess:
    # El mismo entorno que el envoltorio de `bin/` le da: la fuente en el path.
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src")}
    return subprocess.run([sys.executable, str(GATE), "--root", str(root)],
                          capture_output=True, text=True, timeout=120, env=env)


def tree(workspaces: list[str]) -> Path:
    base = Path(tempfile.mkdtemp(prefix="exports-types-"))
    (base / "package.json").write_text(json.dumps({"name": "r", "workspaces": workspaces}))
    return base


def package(base: Path, rel: str, exports: dict, files: dict[str, str],
            projects: bool = True) -> Path:
    pkg = base / rel
    pkg.mkdir(parents=True)
    (pkg / "package.json").write_text(json.dumps({"name": f"@p/{pkg.name}", "exports": exports}))
    for name, text in files.items():
        (pkg / name).parent.mkdir(parents=True, exist_ok=True)
        (pkg / name).write_text(text)
    if projects:
        (pkg / "tsconfig.build.json").write_text("{}\n")
        (pkg / "tsconfig.test.json").write_text("{}\n")
    return pkg


def out(r: subprocess.CompletedProcess) -> str:
    return r.stdout + r.stderr


def case_resolved_passes() -> None:
    base = tree(["pk/*"])
    package(base, "pk/a", {".": {"types": "./dist/index.d.ts", "default": "./src/index.ts"}},
            {"src/index.ts": "", "dist/index.d.ts": ""})
    r = run(base)
    check("un types que existe sale 0", r.returncode == 0, out(r))
    check("y publica su denominador", "1 entrada" in out(r) and "1 paquete" in out(r), out(r))


def case_missing_declaration_fails() -> None:
    base = tree(["pk/*"])
    package(base, "pk/b", {"./x.js": {"types": "./dist/x.d.ts", "default": "./src/x.ts"}},
            {"src/x.ts": ""})
    r = run(base)
    check("un types al vacio sale 1", r.returncode == 1, out(r))
    check("y nombra paquete y subpath", "b" in out(r) and "./x.js" in out(r), out(r))


def case_wildcard_partial_fails() -> None:
    base = tree(["pk/*"])
    package(base, "pk/c", {"./*.js": {"types": "./dist/*.d.ts", "default": "./src/*.ts"}},
            {"src/uno.ts": "", "src/dos.ts": "", "dist/uno.d.ts": ""})
    r = run(base)
    check("un comodin con una declaracion de dos sale 1", r.returncode == 1, out(r))


def case_missing_build_project_fails() -> None:
    base = tree(["pk/*"])
    package(base, "pk/d", {".": {"types": "./dist/index.d.ts", "default": "./src/index.ts"}},
            {"src/index.ts": "", "dist/index.d.ts": ""}, projects=False)
    r = run(base)
    check("declarar dist/ sin tsconfig.build.json sale 1", r.returncode == 1, out(r))
    check("y nombra los dos proyectos que faltan",
          "tsconfig.build.json" in out(r) and "tsconfig.test.json" in out(r), out(r))


def case_source_only_needs_nothing() -> None:
    base = tree(["pk/*", "sueltos/e"])
    package(base, "sueltos/e", {"./*.ts": "./*.ts"}, {"reach.ts": ""}, projects=False)
    r = run(base)
    check("un paquete sin types (sólo fuente) no exige build", r.returncode == 0, out(r))
    check("pero SÍ cuenta como medido: la lista sale de workspaces",
          "1 paquete" in out(r), out(r))


def case_nothing_to_measure_refuses() -> None:
    base = tree(["pk/*"])
    r = run(base)
    check("sin paquetes rehúsa con 2", r.returncode == 2, out(r))
    check("y sin publicar un conteo", "0 destino" not in out(r), out(r))


if __name__ == "__main__":
    for case in (case_resolved_passes, case_missing_declaration_fails,
                 case_wildcard_partial_fails, case_missing_build_project_fails,
                 case_source_only_needs_nothing, case_nothing_to_measure_refuses):
        print(f"== {case.__name__}")
        case()
    print(f"\ntest_check_exports_types: {PASSED} ok, {FAILED} falla(s)")
    sys.exit(1 if FAILED else 0)
