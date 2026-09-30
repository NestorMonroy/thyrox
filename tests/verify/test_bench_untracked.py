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
- contar como banco una ruta fuera de las raíces de banco;
- no mirar un banco CITADO por el contenido staged, o leer la cita del árbol
  de trabajo en vez del índice. Anulado, medido: sin la cita caen los dos
  casos que la usan; leyendo del árbol de trabajo cae sólo el del índice.
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

# Un banco también se toca CITÁNDOLO. Medido en 82417e3d: el commit llevaba
# cuatro pruebas cuyo encabezado nombra `napi-contracts-20260927T073211`, y
# ninguno de sus archivos nuevos del banco; como nada del banco estaba staged,
# el gate publicó «0 banco(s) tocado(s)» y la evidencia citada no viajó.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "sonda.txt").write_text("evidencia\n")
    (base / "src/x.py").write_text('"""Medido en el banco `bench-a`."""\nx = 2\n')
    git(base, "add", "src/x.py")
    assert_equal("un banco citado por un archivo staged se mira aunque nada suyo esté staged",
                 {".claude/workbench/bench-a": [".claude/workbench/bench-a/sonda.txt"]},
                 gate.untracked_in_benches(base, ["src/x.py"]))
    (base / ".claude/workbench/bench-b/a-medio.txt").write_text("otro escritor\n")
    assert_equal("un banco que nadie cita sigue sin mirarse",
                 [".claude/workbench/bench-a"],
                 sorted(gate.untracked_in_benches(base, ["src/x.py"])))
    git(base, "add", "-N", str(bench / "sonda.txt"))
    assert_equal("citado y con su archivo en el índice, no queda nada fuera", {},
                 gate.untracked_in_benches(base, ["src/x.py"]))

with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "sonda.txt").write_text("evidencia\n")
    (base / "src/x.py").write_text('"""Medido en el banco `bench-a`."""\nx = 3\n')
    # El índice manda: el contenido staged no cita el banco aunque el disco sí.
    assert_equal("la cita se lee del índice, no del árbol de trabajo", {},
                 gate.untracked_in_benches(base, ["src/x.py"]))


# La cita es un TOKEN, no una subcadena: `bench-a` no se toca porque el
# contenido nombre `bench-ab`. Con la búsqueda por subcadena un banco cuyo
# nombre es prefijo de otro quedaba citado por la cita del otro.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "sonda.txt").write_text("evidencia\n")
    (base / "src/x.py").write_text('"""Medido en el banco `bench-ab`."""\nx = 4\n')
    git(base, "add", "src/x.py")
    assert_equal("un nombre que sólo es prefijo del citado no toca el banco", {},
                 gate.untracked_in_benches(base, ["src/x.py"]))
    (base / "src/x.py").write_text('"""Evidencia: .claude/workbench/bench-a/sonda.txt"""\nx = 5\n')
    git(base, "add", "src/x.py")
    assert_equal("citado dentro de una ruta, el banco se toca",
                 {".claude/workbench/bench-a": [".claude/workbench/bench-a/sonda.txt"]},
                 gate.untracked_in_benches(base, ["src/x.py"]))

# Muchos archivos staged se leen del índice con UNA sola lectura: los
# bancos citados son los mismos que dan las lecturas una a una.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "sonda.txt").write_text("evidencia\n")
    staged = []
    for n in range(40):
        path = base / f"src/m{n}.py"
        path.write_text(f'"""pieza {n}{" — ver bench-a" if n == 37 else ""}"""\n')
        staged.append(f"src/m{n}.py")
    git(base, "add", "src")
    assert_equal("la cita del archivo 38 de 40 se ve en la lectura por lotes",
                 {".claude/workbench/bench-a"},
                 gate.cited_benches(base, staged))
    assert_equal("un archivo staged que ya no existe en el índice no rompe la lectura",
                 {".claude/workbench/bench-a"},
                 gate.cited_benches(base, [*staged, "src/borrado.py"]))

# La cita al final de una oración lleva el punto pegado: `bench-a.` sigue
# siendo una cita de `bench-a`. Y un banco cuyo nombre lleva puntos (una
# versión, `2.1.266`) se cita entero, no por sus pedazos.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    (bench / "sonda.txt").write_text("evidencia\n")
    (base / "src/x.py").write_text('"""Medido en bench-a."""\nx = 6\n')
    git(base, "add", "src/x.py")
    assert_equal("una cita seguida de punto toca el banco",
                 {".claude/workbench/bench-a": [".claude/workbench/bench-a/sonda.txt"]},
                 gate.untracked_in_benches(base, ["src/x.py"]))
    dotted = base / ".claude/workbench/barrer-2.1.266-x"
    dotted.mkdir(parents=True)
    (dotted / "nota.txt").write_text("evidencia\n")
    (base / "src/x.py").write_text('"""Ver barrer-2.1.266-x/nota.txt"""\nx = 7\n')
    git(base, "add", "src/x.py")
    assert_equal("un banco con puntos en el nombre se ve citado",
                 {".claude/workbench/barrer-2.1.266-x"},
                 gate.cited_benches(base, ["src/x.py"]))
    (base / "src/x.py").write_text('"""Versión 2.1.266 sin más"""\nx = 8\n')
    git(base, "add", "src/x.py")
    assert_equal("un pedazo del nombre con puntos no toca el banco", set(),
                 gate.cited_benches(base, ["src/x.py"]))

# Muchos bancos tocados se consultan con UNA lectura de archivos sin
# seguimiento y se reparten por banco: cada uno recibe sólo los suyos.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    fixture(base)
    for name in ("bench-a", "bench-b", "bench-c"):
        (base / f".claude/workbench/{name}").mkdir(parents=True, exist_ok=True)
        (base / f".claude/workbench/{name}/nuevo-{name}.txt").write_text("evidencia\n")
    (base / ".claude/jobs/job-z").mkdir(parents=True)
    (base / ".claude/jobs/job-z/salida.log").write_text("log\n")
    (base / "src/x.py").write_text('"""bench-a bench-b job-z"""\nx = 9\n')
    git(base, "add", "src/x.py")
    assert_equal("cada banco tocado recibe sólo sus archivos, y el no citado queda fuera",
                 {".claude/workbench/bench-a": [".claude/workbench/bench-a/nuevo-bench-a.txt"],
                  ".claude/workbench/bench-b": [".claude/workbench/bench-b/nuevo-bench-b.txt"],
                  ".claude/jobs/job-z": [".claude/jobs/job-z/salida.log"]},
                 gate.untracked_in_benches(base, ["src/x.py"]))
# Una salida del pool dentro de un banco se commitea sólo con su sello: un
# artefacto `<n>.*` preparado sin `<n>.closed` en el índice es un ítem que la
# publicación no terminó, y ningún lector debe tomarlo como cerrado.
with tempfile.TemporaryDirectory() as directory:
    base = Path(directory)
    bench = fixture(base)
    out = bench / "outputs" / "pool"
    out.mkdir()
    (out / "1.stream.jsonl").write_text("{}\n")
    (out / "1.verdict").write_text("verificado\n")
    (out / "notas.txt").write_text("prosa\n")
    git(base, "add", str(out / "1.stream.jsonl"), str(out / "1.verdict"), str(out / "notas.txt"))
    staged = [".claude/workbench/bench-a/outputs/pool/1.stream.jsonl",
              ".claude/workbench/bench-a/outputs/pool/1.verdict",
              ".claude/workbench/bench-a/outputs/pool/notas.txt"]
    assert_equal("un ítem del pool preparado sin su .closed se nombra",
                 [".claude/workbench/bench-a/outputs/pool/1.stream.jsonl",
                  ".claude/workbench/bench-a/outputs/pool/1.verdict"],
                 gate.unsealed_pool_artifacts(base, staged))
    assert_equal("el commit que lo lleva se rehúsa", 1,
                 gate.main(["--repo", str(base), *staged]))
    (out / "1.closed").write_text('{"generation": 1, "artifacts": {}}\n')
    git(base, "add", str(out / "1.closed"))
    assert_equal("con su .closed en el índice, el ítem pasa", [],
                 gate.unsealed_pool_artifacts(base, staged))
    (out / "2.txt").write_text("no es un artefacto del pool\n")
    git(base, "add", str(out / "2.txt"))
    assert_equal("control: un archivo numerado que no es artefacto del pool no cuenta", [],
                 gate.unsealed_pool_artifacts(base, [".claude/workbench/bench-a/outputs/pool/2.txt"]))
    (base / "src" / "3.json").write_text("{}\n")
    git(base, "add", "src/3.json")
    assert_equal("control: fuera de un banco no se mira", [],
                 gate.unsealed_pool_artifacts(base, ["src/3.json"]))
print(f"test_bench_untracked: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
