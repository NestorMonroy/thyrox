#!/usr/bin/env python3
"""Control de `src/verify/check_cache_layout.py`.

`.claude/cache/` es el material reconstruible que existe para no rehacer
trabajo (`cache/paths.py`): sondas, listas de símbolos, logs de antes y
después. Se versiona para que cualquier `claude -p`, con el modelo que sea,
retome sin rehacerlo —la caché de prompt es por modelo y no sobrevive a un
cambio—. Para que se pueda reutilizar tiene que decir qué es, igual que
`jobs/`: una carpeta por unidad, con su `README.md`.

La primera versión de este gate hizo lo contrario —declaró ajeno todo lo que
no fuera `.work-index.json` y vació el cache— y usaba el literal
`.claude/cache` en vez de las constantes del hogar.

Qué haría fallar a este control:
- aceptar un archivo suelto en la raíz del cache;
- aceptar una carpeta sin `README.md`;
- rechazar lo que los mecanismos escriben por su cuenta: el índice de
  `work_cache` y las copias de `annul_parallel.sh`;
- ignorar `THYROX_CACHE_DIR` y medir el literal;
- bloquear un commit por deuda que el commit no toca.
"""
from __future__ import annotations

import contextlib
import io
import os
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


def git(cwd: Path, *args: str) -> None:
    subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=cwd, check=True,
                   capture_output=True)


def run(argv: list[str]) -> tuple[int, str]:
    out = io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
        code = ccl.main(argv)
    return code, out.getvalue()


print("test_check_cache_layout:")
readme = {"perm/README.md", "perm/lista.txt"}
assert_equal("un archivo suelto en la raíz no tiene carpeta", [("suelto.txt", ccl.LOOSE)],
             ccl.problems({"suelto.txt"}))
assert_equal("una carpeta con README cumple", [], ccl.problems(readme))
assert_equal("una carpeta sin README no dice qué es", [("probe", ccl.NO_README)],
             ccl.problems({"probe/sym.ts", "probe/codes.ts"}))
assert_equal("el índice de work_cache lo escribe su mecanismo", [], ccl.problems({".work-index.json"}))
assert_equal("las copias de annul_parallel también", [],
             ccl.problems({"tsc_cycle/annul/20260925T010203-99/0/src/x.py"}))
assert_equal("el README de otra carpeta no cubre ésta", [("b", ccl.NO_README)],
             ccl.problems({"a/README.md", "b/x.txt"}))

with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    home = root / "otro-cache"
    (home / "perm").mkdir(parents=True)
    (home / "perm/README.md").write_text("qué es\n")
    (home / "perm/lista.txt").write_text("x\n")
    (home / "viejo.txt").write_text("deuda heredada\n")
    (root / ".claude/cache").mkdir(parents=True)
    (root / ".claude/cache/literal.txt").write_text("no es el hogar declarado\n")
    git(root, "init", "-q")
    git(root, "add", ".")
    git(root, "commit", "-qm", "base")
    os.environ["THYROX_CACHE_DIR"] = str(home)
    try:
        code, text = run(["--root", str(root)])
        assert_equal("el hogar sale de THYROX_CACHE_DIR, no del literal", (True, False),
                     ("viejo.txt" in text, "literal.txt" in text))
        assert_equal("reporta la deuda con su denominador y sale 0 sin --strict", (0, True),
                     (code, "de 3 versionado(s)" in text))

        code, _ = run(["--root", str(root), "--staged", "--strict"])
        assert_equal("con --staged, un commit que no toca el cache no se bloquea", 0, code)
        (home / "nuevo.txt").write_text("borrador\n")
        git(root, "add", str(home / "nuevo.txt"))
        code, text = run(["--root", str(root), "--staged", "--strict"])
        assert_equal("con --staged, un archivo suelto nuevo se bloquea y se nombra", (1, True, False),
                     (code, "nuevo.txt" in text, "viejo.txt" in text))
        git(root, "rm", "-q", "--cached", str(home / "nuevo.txt"))
        (home / "perm/otra.txt").write_text("x\n")
        git(root, "add", str(home / "perm/otra.txt"))
        code, _ = run(["--root", str(root), "--staged", "--strict"])
        assert_equal("con --staged, lo nuevo dentro de una carpeta con README pasa", 0, code)
    finally:
        del os.environ["THYROX_CACHE_DIR"]

    code, _ = run(["--root", str(root / "no-existe")])
    assert_equal("un árbol que no es repositorio rehúsa, sin cifra", 2, code)

print(f"test_check_cache_layout: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
