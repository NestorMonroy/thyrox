#!/usr/bin/env python3
"""Control de `src/verify/measure_worktree.py`: el árbol de medición aparte.

Qué haría fallar a este control:
- recrear el enlace de un paquete del workspace resolviéndolo a ruta absoluta:
  el tsc del worktree leería los archivos del principal;
- sincronizar sin los cambios sin commitear: el worktree mediría otro árbol
  que el del log previo (la línea base desfasada del paso 098);
- copiar node_modules en vez de reflejarlo.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from verify import measure_worktree as mw

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


print("test_measure_worktree:")
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    main = base / "main"
    (main / "src/packages/x").mkdir(parents=True)
    (main / "src/packages/x/index.ts").write_text("export const x = 1\n")
    (main / "src/a.ts").write_text("export const a = 1\n")
    (main / ".gitignore").write_text("node_modules\n")
    git(main, "init", "-q")
    git(main, "add", ".")
    git(main, "commit", "-qm", "base")
    (main / "node_modules/@s").mkdir(parents=True)
    os.symlink("../../src/packages/x", main / "node_modules/@s/x")
    (main / "node_modules/third").mkdir()
    (main / "node_modules/third/index.js").write_text("module.exports = 1\n")
    (main / "src/packages/x/node_modules/dep").mkdir(parents=True)
    (main / "src/a.ts").write_text("export const a = 2\n")
    (main / "src/new.ts").write_text("export const n = 1\n")

    wt = base / "wt"
    mw.prepare(main, wt)
    assert_equal("el paquete del workspace resuelve al src/ del worktree",
                 (wt / "src/packages/x").resolve(), (wt / "node_modules/@s/x").resolve())
    assert_equal("el paquete de terceros se enlaza al principal, no se copia",
                 (True, (main / "node_modules/third").resolve()),
                 ((wt / "node_modules/third").is_symlink(), (wt / "node_modules/third").resolve()))
    assert_equal("el node_modules anidado se enlaza entero",
                 (main / "src/packages/x/node_modules").resolve(),
                 (wt / "src/packages/x/node_modules").resolve())
    assert_equal("el worktree trae los cambios sin commitear del principal",
                 "export const a = 2\n", (wt / "src/a.ts").read_text())
    assert_equal("y sus archivos nuevos sin seguir", "export const n = 1\n", (wt / "src/new.ts").read_text())

    (wt / "src/a.ts").write_text("export const a = 3\n")
    mw.export(wt, main, ["src/a.ts"])
    assert_equal("export copia lo aceptado al principal", "export const a = 3\n", (main / "src/a.ts").read_text())

    (wt / "src/a.ts").write_text("roto\n")
    mw.sync(main, wt)
    assert_equal("sync deja el worktree igual al principal otra vez", "export const a = 3\n",
                 (wt / "src/a.ts").read_text())

    # Episodio del 2026-09-25: el alcance `@types` se reflejó con 13 paquetes;
    # luego se instalaron 7 más en el principal y la siguiente preparación los
    # saltó porque el directorio de alcance ya existía. El worktree medía un
    # programa distinto: TS7016 en `semver`, `qrcode` y `stack-utils`, que en
    # el principal sí tenían sus tipos.
    (main / "node_modules/@types/old").mkdir(parents=True)
    mw.prepare(main, wt)
    (main / "node_modules/@types/new").mkdir(parents=True)
    (main / "node_modules/@types/new/index.d.ts").write_text("export {}\n")
    mw.prepare(main, wt)
    assert_equal("un paquete nuevo en un alcance ya reflejado también se refleja",
                 True, (wt / "node_modules/@types/new/index.d.ts").exists())
    assert_equal("y el que ya estaba sigue", True, (wt / "node_modules/@types/old").exists())

print(f"test_measure_worktree: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
