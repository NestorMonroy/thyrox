#!/usr/bin/env python3
"""Contrato: THYROX no emite evidencia dentro de su propio arbol.

El defecto que cierra es de esta sesion y es mio: escribi el banco de un
episodio en `thyrox/.claude/eventos/`, cuando `workbench/paths.py` ya declara
que *«un banco vive en el arbol del CONSUMIDOR y lo producen sus sesiones»*.
THYROX es el proveedor. La prosa estaba escrita y no lo impidio — solo un
control ejecutable lo hace.

El caso que DISCRIMINA es el 3: un gate que solo mirara la existencia del
directorio aprobaria un arbol donde el proveedor emite y el consumidor no.
"""
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve()
while ROOT != ROOT.parent and not (ROOT / "src/paths/reach.py").is_file():
    ROOT = ROOT.parent
GATE = ROOT / "src/verify/check_provider_evidence.py"

ok = ko = 0


def passed(msg: str) -> None:
    global ok
    print(f"  OK   {msg}"); ok += 1


def failed(msg: str) -> None:
    global ko
    print(f"  FAIL {msg}"); ko += 1


def run(*args: str, root: pathlib.Path | None = None):
    cmd = [sys.executable, str(GATE), *args]
    if root:
        cmd += ["--root", str(root)]
    return subprocess.run(cmd, capture_output=True, text=True)


print("=== Caso 1: el gate existe y run ===")
if GATE.is_file() and run().returncode in (0, 1):
    passed("existe y devuelve un veredicto")
else:
    failed("ausente o no devuelve veredicto")

print("=== Caso 2: publica su denominador ===")
r = run()
if "alcance medido" in (r.stdout + r.stderr):
    passed("declara el alcance")
else:
    failed(f"sin denominador: {r.stdout.strip()[:90]}")

print("=== Caso 3 (EL QUE DISCRIMINA): un banco del proveedor se marca ===")
import tempfile
with tempfile.TemporaryDirectory() as tmp:
    fake = pathlib.Path(tmp)
    (fake / "src/paths").mkdir(parents=True)
    (fake / "src/paths/reach.py").touch()
    (fake / ".claude/eventos/episodio-x").mkdir(parents=True)
    (fake / ".claude/eventos/episodio-x/hallazgo.md").write_text("x")
    r = run("--strict", root=fake)
    if r.returncode == 1 and "episodio-x" in r.stdout:
        passed("marca el banco emitido en el proveedor y lo nombra")
    else:
        failed(f"no lo marca: rc={r.returncode} {r.stdout.strip()[:90]}")

print("=== Caso 4: un arbol sin evidencia propia pasa ===")
with tempfile.TemporaryDirectory() as tmp:
    clean = pathlib.Path(tmp)
    (clean / "src/paths").mkdir(parents=True)
    (clean / "src/paths/reach.py").touch()
    (clean / ".claude").mkdir()
    r = run("--strict", root=clean)
    if r.returncode == 0:
        passed("sin evidencia propia, verde")
    else:
        failed(f"fake positivo: rc={r.returncode} {r.stdout.strip()[:90]}")

print("=== Caso 5: rehusa si no puede medir, en vez de publicar un cero ===")
with tempfile.TemporaryDirectory() as tmp:
    r = run("--strict", root=pathlib.Path(tmp) / "no-existe")
    if r.returncode == 2 and "0" not in r.stdout:
        passed("rehusa con 2 y sin cifra")
    else:
        failed(f"publica un cero o no rehusa: rc={r.returncode}")

print("=== Caso 6 (EL QUE DISCRIMINA LA SEGUNDA MEDICION): con la raiz REAL")
# Control positivo del propio repo, no fabricado: corriendo sobre el arbol de
# thyrox, `workbench_dir` asciende y aterriza en el PROVEEDOR, asi que
# `reach.consumer_root` rehusa desde TASK-DOCS-0286. Ese rehuse NO decide el
# veredicto — es una segunda medicion, informativa — pero antes escapaba al
# manejador amplio del modulo y convertia el gate entero en exit 2. Con eso el
# `pre-commit` de este arbol quedo bloqueado.
#
# Las DOS aserciones son necesarias y ninguna sobra:
#   - `rc == 0` es la que discrimina. Anulando la rama el gate sale 2.
#   - que el rehuse aparezca es lo que impide un verde VACIO: si el entorno
#     declarase el consumidor o el hogar, no habria rehuse que capturar y un
#     `rc == 0` a secas pasaria sin haber ejercitado nada.
env = {k: v for k, v in os.environ.items()
       if k not in ("THYROX_CONSUMER", "THYROX_WORKBENCH_DIR")}
r = subprocess.run([sys.executable, str(GATE)], capture_output=True, text=True,
                   env=env, cwd=str(ROOT))
if r.returncode == 0 and "aterriza en el PROVEEDOR" in r.stdout:
    passed("publica el rehuse del consumidor y NO degrada el veredicto")
elif r.returncode != 0:
    failed(f"el rehuse degrada el veredicto: rc={r.returncode}")
else:
    failed("no hubo rehuse que capturar — el caso no midio nada")

print()
print(f"{ok} ok, {ko} fallos (alcance medido: {ok + ko} aserciones sobre {GATE})")
raise SystemExit(1 if ko else 0)
