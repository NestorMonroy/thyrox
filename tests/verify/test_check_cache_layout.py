#!/usr/bin/env python3
"""Control de `src/verify/check_cache_layout.py`.

`.claude/cache/` es el hogar del ÍNDICE reconstruible (`cache/paths.py`),
hermano de `jobs/` —la salida de un proceso— y de `workbench/` —la evidencia
de un episodio—, no el mismo. Medido al escribir el gate: 0 de sus 97
archivos versionados eran índice; eran logs de antes y después, sondas,
respaldos y una herramienta, sueltos y sin procedencia.

Qué haría fallar a este control:
- aceptar un log o una sonda suelta como si fuera índice;
- rechazar el índice de `work_cache` o las copias de `annul_parallel.sh`,
  que son lo único que el contrato declara;
- publicar un cero sobre un árbol que no pudo medir.
"""
from __future__ import annotations

import contextlib
import io
import subprocess
import sys
import tempfile
from pathlib import Path

from verify import check_cache_layout as ccl

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_check_cache_layout:")
assert_equal("el índice de work_cache pertenece", True, ccl.belongs(".work-index.json"))
assert_equal("también dentro de una carpeta por gate", True, ccl.belongs("check_rst/.work-index.json"))
assert_equal("las copias de annul_parallel pertenecen", True,
             ccl.belongs("tsc_cycle/annul/20260925T010203-99/0/src/x.py"))
assert_equal("un log suelto no pertenece", False, ccl.belongs("after.txt"))
assert_equal("una sonda en carpeta no pertenece", False, ccl.belongs("probe/sym.ts"))
assert_equal("una herramienta suelta no pertenece", False, ccl.belongs("cmp.py"))
assert_equal("'annul' fuera de su forma no pertenece", False, ccl.belongs("annul/x.txt"))
assert_equal("el hogar sugerido de lo ajeno es workbench o jobs", True,
             "workbench" in ccl.HOME_HINT and "jobs" in ccl.HOME_HINT)


def git(cwd: Path, *args: str) -> None:
    subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=cwd, check=True,
                   capture_output=True)


with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    cache = root / ".claude/cache"
    (cache / "gate").mkdir(parents=True)
    (cache / "gate/.work-index.json").write_text("{}")
    (cache / "after.txt").write_text("x")
    (cache / "probe").mkdir()
    (cache / "probe/sym.ts").write_text("x")
    (root / "src.txt").write_text("x")
    git(root, "init", "-q")
    git(root, "add", ".")
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = ccl.main(["--root", str(root), "--cache", str(cache), "--strict"])
    text = out.getvalue()
    assert_equal("con archivos ajenos versionados, --strict sale 1", 1, code)
    assert_equal("nombra los ajenos y no el índice", (True, True, False),
                 (".claude/cache/after.txt" in text, ".claude/cache/probe/sym.ts" in text,
                  "work-index" in text.split("alcance")[0]))
    assert_equal("publica su denominador", True, "de 3 versionado(s)" in text)
    with contextlib.redirect_stdout(io.StringIO()):
        report = ccl.main(["--root", str(root), "--cache", str(cache)])
    assert_equal("sin --strict reporta y sale 0", 0, report)

    with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
        refused = ccl.main(["--root", str(root / "no-existe"), "--cache", str(cache)])
    assert_equal("un árbol que no es repositorio rehúsa, sin cifra", 2, refused)

print(f"test_check_cache_layout: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
