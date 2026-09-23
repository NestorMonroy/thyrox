#!/usr/bin/env python3
"""Control de `src/verify/check_bench_untracked.py`.

El defecto: `git commit -- <banco>` commitea sólo lo que git ya sigue, y un
archivo nuevo del banco sin `git add -N` se queda fuera EN SILENCIO. Ocurrió
en varios commits de este lazo; el último, en el mismo turno que construyó
este gate.

Qué haría fallar a este control:
- no mirar dentro de subdirectorios del banco (`outputs/`, `step-*/`);
- mirar bancos que el commit no toca: un banco ajeno a medio escribir
  bloquearía a cualquier escritor;
- contar como banco una ruta fuera de las raíces de banco.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from verify import check_bench_untracked as gate

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


def fixture(base: Path) -> Path:
    git(base, "init", "-q")
    bench = base / ".claude/workbench/bench-a"
    (bench / "outputs").mkdir(parents=True)
    (bench / "README.md").write_text("banco\n")
    other = base / ".claude/workbench/bench-b"
    other.mkdir(parents=True)
    (other / "README.md").write_text("otro\n")
    (base / "src").mkdir()
    (base / "src/x.py").write_text("x = 1\n")
    git(base, "add", ".")
    git(base, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "seed")
    return bench


print("test_bench_untracked:")

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "README.md").write_text("banco editado\n")
    (bench / "nuevo.txt").write_text("evidencia\n")
    (bench / "outputs" / "log.txt").write_text("log\n")
    found = gate.untracked_in_benches(base, [".claude/workbench/bench-a/README.md"])
    assert_equal("el banco del commit con archivos sin seguimiento se nombra",
                 {".claude/workbench/bench-a": [".claude/workbench/bench-a/nuevo.txt",
                                                ".claude/workbench/bench-a/outputs/log.txt"]},
                 found)
    git(base, "add", "-N", str(bench / "nuevo.txt"), str(bench / "outputs" / "log.txt"))
    assert_equal("con `add -N` no queda nada fuera", {},
                 gate.untracked_in_benches(base, [".claude/workbench/bench-a/README.md"]))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    fixture(base)
    (base / ".claude/workbench/bench-b/a-medio.txt").write_text("otro escritor\n")
    assert_equal("un banco que el commit no toca no se mira", {},
                 gate.untracked_in_benches(base, [".claude/workbench/bench-a/README.md"]))
    (base / "src/nuevo.py").write_text("y = 2\n")
    assert_equal("una ruta fuera de las raíces de banco no es banco", {},
                 gate.untracked_in_benches(base, ["src/x.py"]))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "nuevo.txt").write_text("evidencia\n")
    code = gate.main(["--repo", str(base), ".claude/workbench/bench-a/README.md"])
    assert_equal("el CLI sale 1 si algo queda fuera", 1, code)
    code = gate.main(["--repo", str(base), "src/x.py"])
    assert_equal("el CLI sale 0 si nada queda fuera", 0, code)

print(f"test_bench_untracked: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
