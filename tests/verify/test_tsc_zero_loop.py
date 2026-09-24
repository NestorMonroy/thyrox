#!/usr/bin/env python3
"""Control de `src/verify/tsc_zero_loop.py`: el lazo tsc cero entero.

Repite candidatos → paso → commit por pathspec de lo que el paso conservó,
hasta `done` o `stalled`. Aquí el proponente y `tsc` son falsos y
deterministas, sobre un repositorio git temporal.

Qué haría fallar a este control:
- no volver a pedir candidatos tras cada paso: las bases de la ronda
  anterior ya no valen y todo saldría `infrastructure`;
- commitear lo que el paso revirtió, o no commitear lo que conservó;
- seguir tras `stalled`: sin ninguna aceptada, otra vuelta repite el lote;
- no detenerse al tope de iteraciones.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from verify import tsc_zero_loop as loop
from paths import reach  # noqa: E402

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


FAKE_TSC = '''import pathlib, re, sys
lines = []
for path in sorted(pathlib.Path(".").glob("*.ts")):
    for number, text in enumerate(path.read_text().splitlines(), 1):
        for match in re.finditer(r"BAD(\\d+)", text):
            lines.append(f"{path.name}({number},1): error TS9001: bad {match.group(1)}.")
        if "WORSE" in text:
            lines.append(f"{path.name}({number},1): error TS9002: worse.")
print("\\n".join(lines))
sys.exit(2 if lines else 0)
'''

# Propone arreglar el PRIMER `BAD<n>` de cada archivo: un archivo con dos
# necesita dos vueltas, y la segunda sólo vale con bases nuevas.
FAKE_PROPOSER = '''import hashlib, json, pathlib, re, sys
mode = sys.argv[1]
for path in sorted(pathlib.Path(".").glob("*.ts")):
    text = path.read_text()
    match = re.search(r"BAD(\\d+)", text)
    if not match:
        continue
    new = "WORSE" if mode == "worse" else match.group(1)
    print(json.dumps({"proposal_id": f"fix:{path.name}", "proposer": mode,
        "targets": [f"{path.name}: TS9001: bad {match.group(1)}."], "files": [path.name],
        "edits": [{"file": path.name, "start": match.start(), "length": len(match.group(0)), "newText": new}],
        "bases": {path.name: hashlib.sha256(text.encode()).hexdigest()}}))
'''


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True).stdout


def fixture(base: Path) -> None:
    git(base, "init", "-q")
    git(base, "config", "user.email", "t@t")
    git(base, "config", "user.name", "t")
    (base / "a.ts").write_text("const a = BAD1 + BAD2\n")
    (base / "b.ts").write_text("const b = BAD3\n")
    (base / "fake_tsc.py").write_text(FAKE_TSC)
    (base / "fake_proposer.py").write_text(FAKE_PROPOSER)
    git(base, "add", ".")
    git(base, "commit", "-q", "-m", "seed")


print("test_tsc_zero_loop:")

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    fixture(base)
    result = loop.run_loop(base, [sys.executable, "fake_proposer.py", "good"],
                           [sys.executable, "fake_tsc.py"], base / "loop", max_steps=10, seed=1)
    assert_equal("el lazo llega a tsc cero", "done", result.status)
    assert_equal("a.ts necesitó dos vueltas, con bases nuevas en la segunda",
                 "const a = 1 + 2\n", (base / "a.ts").read_text())
    subjects = git(base, "log", "--format=%s").splitlines()
    assert_equal("un commit por paso con progreso", 2, sum(s.startswith("Apply tsc-zero step") for s in subjects))
    assert_equal("el árbol queda limpio: todo lo conservado se commiteó", "",
                 git(base, "status", "--porcelain", "--", "a.ts", "b.ts"))
    assert_equal("el total baja por pasos hasta cero", [3, 1, 0], result.totals)

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    fixture(base)
    result = loop.run_loop(base, [sys.executable, "fake_proposer.py", "worse"],
                           [sys.executable, "fake_tsc.py"], base / "loop", max_steps=10, seed=1)
    assert_equal("sin ninguna aceptada el lazo se detiene en la primera vuelta",
                 ("stalled", 1), (result.status, result.steps))
    assert_equal("y no commitea nada", 1, len(git(base, "log", "--format=%s").splitlines()))
    assert_equal("ni deja el árbol tocado", "", git(base, "status", "--porcelain", "--", "a.ts", "b.ts"))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    fixture(base)
    result = loop.run_loop(base, [sys.executable, "fake_proposer.py", "good"],
                           [sys.executable, "fake_tsc.py"], base / "loop", max_steps=1, seed=1)
    assert_equal("el tope de iteraciones detiene el lazo", ("max-steps", 1), (result.status, result.steps))

with tempfile.TemporaryDirectory() as directory:
    # El run del lazo vive en un banco, y el `pre-commit` real bloquea un
    # commit que deja fuera archivos nuevos del banco. Quien lanza el lazo
    # escribe en el run (`seed`, `result.json`); el paso escribe
    # `residual.jsonl`. Medido: el lazo real murió en su primer commit por eso.
    base = Path(directory)
    fixture(base)
    hook = base / ".git" / "hooks" / "pre-commit"
    hook.write_text(f"#!/bin/sh\nPYTHONPATH={(reach.thyrox_root() / 'src')} "
                    f"exec {sys.executable} -m verify.check_bench_untracked --repo .\n")
    hook.chmod(0o755)
    run_dir = base / ".claude" / "workbench" / "loop" / "run-1"
    run_dir.mkdir(parents=True)
    (run_dir / "seed").write_text("1\n")
    try:
        result = loop.run_loop(base, [sys.executable, "fake_proposer.py", "good"],
                               [sys.executable, "fake_tsc.py"], run_dir, max_steps=10, seed=1)
        status = result.status
    except subprocess.CalledProcessError:
        status = "commit bloqueado"
    assert_equal("el commit del lazo lleva el run entero y el gate del banco no lo bloquea",
                 "done", status)

print(f"test_tsc_zero_loop: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
