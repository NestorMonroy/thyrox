#!/usr/bin/env python3
"""Control de `check_unsized_writer_pipe.py` — el escritor EXTERNO finito.

El gate hermano, `check_unbounded_pipe.py`, marca sólo al escritor que no
termina (`yes`, `tail -f`) y declara ciego al acotado pero grande, «umbral no
medido». Medido el 2026-09-27 (banco `sigpipe-finite-writer-*`, 20 ejecuciones
por caso, marca al principio de la entrada, bajo pipefail):

    python3 1 KB · 20 KB           0/20      python3 200 KB        20/20
    gawk 22 KB                     11/20     gawk 220 KB           20/20
    printf + tr, 200 KB            20/20     (el que invierte es `tr`)
    printf builtin 200 KB          0/20      echo builtin 200 KB   0/20

Y el 0/20 del builtin NO se sostuvo: esa medida exportaba la variable de
200 KB, que excede MAX_ARG_STRLEN, así que `seq` no se ejecutaba y el bucle no
medía nada. Medido sin exportar: `echo` y `printf` invierten 20/20 desde 107 KB,
y `echo` de 5 MB también, 20/20 — lo contrario de lo que el gate hermano cita.

El discriminador, entonces, no es «builtin o proceso» —eso era el significante—
sino «¿se conoce el tamaño de lo escrito?». Sólo un builtin con argumentos
LITERALES lo tiene a la vista, y cabe en el búfer del pipe. Todo lo demás
(expansión, proceso, función) tiene tamaño desconocido y se marca.

El control positivo se EJECUTA (sección 1), no se cree.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

ROOT = reach.thyrox_root()
GATE = ROOT / "src" / "verify" / "check_unsized_writer_pipe.py"

from verify import check_unsized_writer_pipe as gate  # noqa: E402

PASSED = FAILED = 0


def check(label: str, expected, actual) -> None:
    global PASSED, FAILED
    if expected == actual:
        PASSED += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}: esperaba {expected!r}, obtuve {actual!r}")


def shell(body: str) -> str:
    return "#!/usr/bin/env bash\nset -uo pipefail\n" + body + "\n"


def flagged(text: str) -> list[str]:
    return [finding.writer for finding in gate.review(text)[0]]


def unflagged(text: str) -> bool:
    return flagged(text) == []


def run_pipeline(script: str) -> int:
    return subprocess.run(["timeout", "20", "bash", "-c", script],
                          capture_output=True, text=True).returncode


print("== 1. control positivo — la conducta medida, ejecutada ==")
BIG_GAWK = "gawk 'BEGIN{print \"MARK\"; for(i=0;i<40000;i++) print \"xxxxxxxxxx\"}'"
check("un proceso externo que escribe tras el corte invierte `grep -q`",
      True, run_pipeline(f"set -o pipefail; {BIG_GAWK} | grep -q MARK") != 0)
check("el MISMO texto por el builtin printf también invierte (sin exportar)",
      True, run_pipeline(f"set -o pipefail; V=$({BIG_GAWK}); printf '%s\\n' \"$V\" | grep -q MARK") != 0)
check("un literal corto por printf no invierte",
      0, run_pipeline("set -o pipefail; printf 'MARK\\nresto' | grep -q MARK"))
check("y la forma del arreglo —capturar antes— sale 0",
      0, run_pipeline(f"set -o pipefail; grep -q MARK <<<\"$({BIG_GAWK})\""))

print("\n== 2. escritores externos: se marcan ==")
for label, body, writer in (
        ("python3", 'python3 x.py | grep -q M', "python3"),
        ("gawk", "gawk '{print}' f | grep -q M", "gawk"),
        ("cat de archivo", 'cat "$F" | grep -q M', "cat"),
        ("find", 'find . -name "*.py" | grep -q algo', "find"),
        ("una función del guion", 'comandos "$VIVA" | grep -qv M', "comandos"),
        ("un binario por variable", '"$BIN" --x | grep -q M', '"$BIN"'),
        ("timeout no cambia quién escribe", 'timeout 900 bun test x | grep -q M', "bun"),
        ("una etapa intermedia externa tras un builtin", "printf x | tr x y | grep -q y", "tr"),
        ("dentro de un if", 'if python3 x.py | grep -q M; then :; fi', "python3"),
        ("grep -m también corta", 'python3 x.py | grep -m 1 M', "python3"),
        ("grep -l también corta", 'python3 x.py | grep -l M', "python3"),
        ("continuación con barra", 'python3 x.py \\\n  | grep -q M', "python3"),
        ("echo de una variable: tamaño desconocido", 'echo "$V" | grep -q M', "echo"),
        ("printf de una variable", "printf '%s' \"$V\" | grep -q M", "printf"),
        ("printf de una sustitución", 'printf "%s" "$(cmd)" | grep -q M', "printf"),
        ("dentro de una función de una línea: escribe printf, no la función",
         'has_text() { printf "%s\\n" "$1" | grep -q -- "$2"; }', "printf")):
    check(label, [writer], flagged(shell(body)))

print("\n== 3. fuera de alcance ==")
LITERAL_WRITERS = {
    "echo de un literal": shell('echo "MARCA y resto" | grep -q M'),
    "printf de un literal": shell("printf 'MARCA\\n' | grep -q M"),
    "printf literal en un if": shell("if printf 'x y' | grep -q x; then :; fi"),
}
for label, text in LITERAL_WRITERS.items():
    check(label, True, unflagged(text))
for label, text in (
        ("sin pipefail", "#!/bin/bash\npython3 x.py | grep -q M\n"),
        ("`|| true` neutraliza", shell('python3 x.py | grep -q M || true')),
        ("comentario", shell('# python3 x.py | grep -q M')),
        ("`|` entre comillas", shell('echo "python3 x | grep -q M"')),
        ("consumidor que lee hasta EOF (grep -c)", shell('python3 x.py | grep -c M')),
        ("wc -l", shell('python3 x.py | wc -l')),
        ("la forma del arreglo", shell('grep -q M <<<"$(python3 x.py)"')),
        ("el escritor sin fin es del gate hermano", shell('yes | grep -q y'))):
    check(label, True, unflagged(text))

print("\n== 4. controles de anulación ==")


def failures(results) -> int:
    return sum(1 for ok in results if not ok)


check("íntegro: las 3 de literal pasan", 0,
      failures(unflagged(t) for t in LITERAL_WRITERS.values()))
original_literal = gate.writes_known_literal
gate.writes_known_literal = lambda words: False
try:
    check("ANULADA la exención del literal: caen EXACTAMENTE esas 3", 3,
          failures(unflagged(t) for t in LITERAL_WRITERS.values()))
    check("y el positivo externo no depende de ella", ["python3"],
          flagged(shell('python3 x.py | grep -q M')))
finally:
    gate.writes_known_literal = original_literal
check("restaurada, vuelven a pasar", 0,
      failures(unflagged(t) for t in LITERAL_WRITERS.values()))

PIPEFAIL_DEPENDENT = ("#!/bin/bash\npython3 x.py | grep -q M\n",
                      "#!/bin/bash\nfind . | grep -q M\n")
original_pipefail = gate.declares_pipefail
gate.declares_pipefail = lambda text: True
try:
    check("ANULADA la precondición pipefail: caen EXACTAMENTE esas 2", 2,
          failures(unflagged(t) for t in PIPEFAIL_DEPENDENT))
finally:
    gate.declares_pipefail = original_pipefail
check("restaurada, vuelven a pasar", 0, failures(unflagged(t) for t in PIPEFAIL_DEPENDENT))

print("\n== 5. CLI ==")


def cli(*args: str) -> tuple[int, str]:
    done = subprocess.run([sys.executable, str(GATE), *args], capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


with tempfile.TemporaryDirectory() as tmp:
    code, out = cli("--root", str(pathlib.Path(tmp) / "no-existe"))
    check("raíz ausente: exit 2", 2, code)
    check("y NO emite conteo", False, "incumplidor" in out)

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    (root / "malo.sh").write_text(shell('python3 x.py | grep -q M'))
    (root / "bueno.sh").write_text(shell("printf 'MARCA' | grep -q M"))
    (root / "node_modules").mkdir()
    (root / "node_modules" / "ajeno.sh").write_text(shell('python3 x.py | grep -q M'))
    baseline = root / "baseline.txt"
    code, out = cli("--root", str(root), "--baseline", str(baseline))
    check("1 incumplidor nuevo", True, "1 incumplidor(es) nuevo(s)" in out)
    check("exit 1", 1, code)
    check("node_modules queda fuera", False, "ajeno.sh" in out)
    check("publica el denominador", True, "tubería(s) en" in out)
    check("declara qué mide", True, "Métrica:" in out)
    check("y a qué es ciega", True, "Ciega a:" in out)
    code, _ = cli("--root", str(root), "--baseline", str(baseline), "--write-baseline")
    check("--write-baseline congela y sale 0", 0, code)
    code, out = cli("--root", str(root), "--baseline", str(baseline))
    check("congelado: 0 nuevos y exit 0", (0, True), (code, "0 incumplidor(es) nuevo(s)" in out))
    code, out = cli("--root", str(root), "--baseline", str(baseline), "--quiet")
    check("--quiet emite un entero pelado", "0", out.strip())

print(f"\ntest_unsized_writer_pipe: {PASSED} ok, {FAILED} fallo(s)")
sys.exit(1 if FAILED else 0)
