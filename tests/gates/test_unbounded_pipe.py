#!/usr/bin/env python3
"""Control de `check_unbounded_pipe.py` — el alcance es lo que se prueba.

El control positivo NO lo fabrica esta suite. Medido antes de escribir el
gate (2026-09-07), el árbol entero —los seis repos, 1934 tuberías en 410
guiones con pipefail— tiene **cero** escritores sin fin canalizados a un
consumidor que corta. Así que no hay incumplidor vivo que usar, y se dice con
la medición en vez de inventar uno: el positivo es el caso del banco
(`yes | grep -q`, que invirtió 10 de 10) y esta suite lo **ejecuta** en vez de
creérselo. Un gate cuyo patrón sólo case contra texto que su autor escribió
confirma su propio encuadre.

Los dos controles de anulación miden lo que de verdad decide si el gate
sirve: (1) la precondición `pipefail` y (2) el recorte del escritor. Al
anular el segundo el gate vuelve al alcance ingenuo, que sobre este árbol
marcaba 527 sitios —202 de ellos `echo`, medido en 0 de 20 inversiones—.
"""
from __future__ import annotations

import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
GATE = ROOT / "src" / "gates" / "check_unbounded_pipe.py"

from gates import check_unbounded_pipe as gate  # noqa: E402

PASSED = FAILED = 0


def check(label: str, expected, actual) -> None:
    global PASSED, FAILED
    if expected == actual:
        PASSED += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}: esperaba {expected!r}, obtuve {actual!r}")


PIPEFAIL_HEADER = "#!/usr/bin/env bash\nset -euo pipefail\n"


def shell(body: str) -> str:
    """Un guion con `pipefail` ya declarado — la precondición del gate."""
    return PIPEFAIL_HEADER + body + "\n"


def flagged(text: str) -> list[str]:
    """Los escritores que el gate nombra en un guion."""
    return [finding.writer for finding in gate.review(text)[0]]


def unflagged(text: str) -> bool:
    """Aserción reusada por el control de anulación del recorte."""
    return flagged(text) == []


# ── 1. El control POSITIVO: la conducta medida, ejecutada ────────────────────
print("== 1. control positivo — el caso del banco se REPRODUCE ==")


def run_pipeline(script: str) -> int:
    done = subprocess.run(["timeout", "10", "bash", "-c", script],
                          capture_output=True, text=True)
    return done.returncode


# El banco de #148 midió `yes | grep -q` invirtiendo 10 de 10 bajo pipefail.
# Si algún día dejara de invertir, este caso cae y avisa de que la premisa del
# gate cambió — que es para lo que existe.
check("`yes | grep -q y` bajo pipefail sale 141 (SIGPIPE al escritor)",
      141, run_pipeline("set -o pipefail; yes | grep -q y"))
check("el MISMO pipeline sin pipefail sale 0 — la precondición pesa",
      0, run_pipeline("set +o pipefail; yes | grep -q y"))
check("un escritor CORTO no invierte — el falso positivo a evitar",
      0, run_pipeline("set -o pipefail; printf MARCA | grep -q MARCA"))

# Y el gate marca exactamente ese pipeline.
check("el gate marca `yes | grep -q`", ["yes"],
      flagged(shell('if yes | grep -q y; then echo si; fi')))


# ── 2. Los escritores del alcance ───────────────────────────────────────────
print("\n== 2. escritores SIN FIN: se marcan ==")

check("yes", ["yes"], flagged(shell('yes | grep -q y')))
check("tail -f", ["tail --follow"],
      flagged(shell('tail -f "$LOG" | grep -q LISTO')))
check("tail --follow con -n", ["tail --follow"],
      flagged(shell('tail -f -n +1 "$LOG" | grep -q MARCA')))
check("journalctl --follow", ["journalctl --follow"],
      flagged(shell('journalctl -u kaupamex --follow | grep -q ERROR')))
check("docker logs -f", ["docker --follow"],
      flagged(shell('docker logs -f api | grep -q listening')))
check("/dev/urandom", ["/dev/urandom"],
      flagged(shell('cat /dev/urandom | grep -qa MARCA')))
check("el escritor puede estar dos etapas antes del consumidor", ["yes"],
      flagged(shell('yes | tr y x | grep -q x')))
check("dentro de una sustitución de comando", ["yes"],
      flagged(shell('V=$(yes | grep -q y)')))

print("\n== 2-bis. consumidores que CORTAN: los cuatro medidos ==")
for label, fragment in (("grep -q", "grep -q MARCA"),
                        ("grep -m N", "grep -m 1 MARCA"),
                        ("grep -l", "grep -l MARCA"),
                        ("head -n", "head -n 1"),
                        ("head -c", "head -c 20"),
                        ("grep -qi combinado", "grep -qi marca")):
    check(f"{label} se marca", ["yes"], flagged(shell(f"yes | {fragment}")))


# ── 3. Lo que queda FUERA, y por qué ────────────────────────────────────────
print("\n== 3. fuera de alcance: ni un falso positivo ==")

OUT_OF_SCOPE_WRITERS = {
    "echo de variable (medido 0/20 con 5 MB)": shell('echo "$V" | grep -q MARCA'),
    "printf corto (medido 0/20)": shell('printf MARCA | grep -q MARCA'),
    "cat de archivo — umbral sin medir, dos casos vivos de 2 bytes":
        shell('cat /sys/module/apparmor/parameters/enabled | grep -q Y'),
    "find sobre un árbol": shell('find . -name "*.py" | grep -q algo'),
    "timeout ACOTA al escritor sin fin":
        shell('timeout 5 tail -f "$LOG" | grep -q LISTO'),
}
for label, text in OUT_OF_SCOPE_WRITERS.items():
    check(label, True, unflagged(text))

check("consumidor que lee hasta EOF (grep -c): cuelga, no invierte — fuera",
      True, unflagged(shell('yes | grep -c y')))
check("consumidor wc -l: fuera por lo mismo",
      True, unflagged(shell('yes | wc -l')))
check("sin pipefail no se marca",
      True, unflagged("#!/bin/bash\nyes | grep -q y\n"))
check("`|| true` neutraliza el veredicto — fuera",
      True, unflagged(shell('yes | grep -q y || true')))
check("`|| :` también", True, unflagged(shell('yes | grep -q y || :')))
check("una línea de comentario no es código",
      True, unflagged(shell('# yes | grep -q y')))
check("un `|` dentro de comillas no es una tubería",
      True, unflagged(shell('echo "yes | grep -q y"')))
check("`||` no se lee como dos tuberías",
      True, unflagged(shell('foo || grep -q x archivo')))
check("una tubería de una sola etapa no existe",
      True, unflagged(shell('grep -q MARCA archivo')))


# ── 4. CONTROLES DE ANULACIÓN ───────────────────────────────────────────────
print("\n== 4. controles de anulación ==")


def failures(assertions) -> int:
    return sum(1 for result in assertions if not result)


# 4a. La precondición `pipefail`. Sin ella el gate mediría un fenómeno que no
# ocurre: medido, el mismo pipeline sale 0 cuando pipefail está apagado.
PIPEFAIL_DEPENDENT = (
    lambda: unflagged("#!/bin/bash\nyes | grep -q y\n"),
    lambda: unflagged("#!/bin/bash\ntail -f x | grep -q M\n"),
)
check("con el gate íntegro, las 2 aserciones de pipefail pasan",
      0, failures(assertion() for assertion in PIPEFAIL_DEPENDENT))

original_pipefail = gate.declares_pipefail
gate.declares_pipefail = lambda text: True
try:
    check("ANULADA la precondición: caen EXACTAMENTE esas 2",
          2, failures(assertion() for assertion in PIPEFAIL_DEPENDENT))
    # Y las del alcance del escritor NO dependen de ella: siguen en pie.
    check("y las de escritor acotado sobreviven a esa anulación",
          0, failures(unflagged(t) for t in OUT_OF_SCOPE_WRITERS.values()))
finally:
    gate.declares_pipefail = original_pipefail
check("restaurada, vuelven a pasar",
      0, failures(assertion() for assertion in PIPEFAIL_DEPENDENT))

# 4b. El RECORTE DEL ESCRITOR — la decisión que hace útil o inútil al gate.
# Anularlo es volver al alcance ingenuo («todo `| grep -q`»), que sobre este
# árbol marcaba 527 sitios y 202 de ellos eran `echo`.
check("con el gate íntegro, las 5 aserciones de escritor acotado pasan",
      0, failures(unflagged(t) for t in OUT_OF_SCOPE_WRITERS.values()))

original_writer = gate.unbounded_writer
gate.unbounded_writer = lambda stage: (gate.head_words(stage) or ["?"])[0]
try:
    check("ANULADO el recorte: caen EXACTAMENTE esas 5",
          5, failures(unflagged(t) for t in OUT_OF_SCOPE_WRITERS.values()))
    # El positivo NO discrimina bajo esta anulación —el alcance ingenuo también
    # marca `yes`—, y por eso se declara: un verde suyo no separa las dos.
    check("`yes` se sigue marcando (no discrimina esta anulación)",
          ["yes"], flagged(shell('yes | grep -q y')))
finally:
    gate.unbounded_writer = original_writer
check("restaurado, vuelven a pasar",
      0, failures(unflagged(t) for t in OUT_OF_SCOPE_WRITERS.values()))


# ── 5. El CLI: rehúse, denominador y baseline ───────────────────────────────
print("\n== 5. CLI ==")


def cli(*args: str) -> tuple[int, str]:
    done = subprocess.run([sys.executable, str(GATE), *args],
                          capture_output=True, text=True)
    return done.returncode, done.stdout + done.stderr


def seed(root: pathlib.Path, relative: str, text: str) -> None:
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


with tempfile.TemporaryDirectory() as tmp:
    code, out = cli("--root", str(pathlib.Path(tmp) / "no-existe"))
    check("raíz ausente: exit 2", 2, code)
    check("y NO emite conteo", False, "incumplidor" in out)

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    seed(root, "solo.txt", "no soy un guion\n")
    code, out = cli("--root", str(root))
    check("sin ningún guion de shell: exit 2", 2, code)
    check("y NO emite conteo", False, "incumplidor" in out)

with tempfile.TemporaryDirectory() as tmp:
    root = pathlib.Path(tmp)
    seed(root, "malo.sh", shell('if yes | grep -q y; then echo si; fi'))
    seed(root, "bueno.sh", shell('echo "$V" | grep -q MARCA'))
    seed(root, "sin_pipefail.sh", "#!/bin/bash\nyes | grep -q y\n")
    seed(root, "extensionless", "#!/usr/bin/env bash\nset -o pipefail\n"
                                "yes | head -n 1\n")
    seed(root, "node_modules/ajeno.sh", shell('yes | grep -q y'))
    baseline = root / "baseline.txt"

    code, out = cli("--root", str(root), "--baseline", str(baseline))
    check("2 incumplidores (el .sh y el extensionless por shebang)",
          True, "2 incumplidor(es) nuevo(s)" in out)
    check("exit 1", 1, code)
    check("node_modules queda fuera", False, "ajeno.sh" in out)
    check("publica el denominador de tuberías", True, "tubería(s) en" in out)
    check("publica el denominador de guiones con pipefail",
          True, "guion(es) con pipefail" in out)
    check("y el de guiones de shell medidos", True, "guion(es) de shell" in out)
    check("declara qué mide", True, "Métrica:" in out)
    check("y a qué es ciega", True, "Ciega a:" in out)

    code, out = cli("--root", str(root), "--baseline", str(baseline), "--quiet")
    check("--quiet emite un entero pelado", "2", out.strip())
    check("y conserva el código", 1, code)

    code, out = cli("--root", str(root), "--baseline", str(baseline),
                    "--write-baseline")
    check("--write-baseline sale 0", 0, code)
    code, out = cli("--root", str(root), "--baseline", str(baseline))
    check("congelada, la deuda heredada NO bloquea", 0, code)
    check("pero se declara en el conteo", True, "2 congelado(s)" in out)

    # El control que discrimina: uno NUEVO sí bloquea aunque haya baseline.
    seed(root, "nuevo.sh", shell('tail -f "$LOG" | grep -q LISTO'))
    code, out = cli("--root", str(root), "--baseline", str(baseline))
    check("un incumplidor NUEVO sí bloquea", 1, code)
    check("y sólo se nombra él", True, "nuevo.sh" in out and "malo.sh" not in out)

print()
# El denominador va junto al conteo: «0 fallos» sin decir sobre cuántas
# aserciones no distingue una suite sana de una suite que no pregunta.
print(f"{PASSED} ok, {FAILED} fallos "
      f"(alcance medido: {PASSED + FAILED} aserciones)")
raise SystemExit(1 if FAILED else 0)
