"""Pruebas de ``hooks.stop_pending_work`` — el punto de entrada del gate.

Compone dos piezas que no se conocen entre sí: ``repo.pending_work`` (la
consulta a git) y ``hooks.stop_gate`` (la traducción a veredicto). Vive en
``hooks/`` y no en ``repo/`` a propósito: es lo que hace de él un hook, y
``repo/`` no tiene por qué saber que existe un ``Stop``.

Es la superficie que consume el stub de kaupamex, así que lo que se prueba es
el CLI: las raíces, las etiquetas y la prosa entran por argumento porque son
del consumidor (DEC-04).
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from hooks import stop_pending_work as spw  # noqa: E402

OK = 0
FAILED = 0
MODULE = str(Path(spw.__file__).resolve())


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], capture_output=True)


def new_repo(parent: Path, name: str) -> Path:
    repo = parent / name
    repo.mkdir()
    git(repo, "init", "-q")
    git(repo, "config", "user.email", "t@t")
    git(repo, "config", "user.name", "t")
    (repo / "semilla.txt").write_text("semilla\n")
    git(repo, "add", "semilla.txt")
    git(repo, "commit", "-q", "-m", "Seed")
    return repo


def run(args: list[str], payload: str = "{}") -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, MODULE, *args],
                          input=payload, capture_output=True, text=True)


ETIQUETAS = ["dirty=sin commitear", "staged=en stage",
             "untracked=sin añadir",
             "ahead=commit(s) sin pushear"]

print("== 1. CLI: un árbol limpio emite {} y SIEMPRE sale 0 ==")
with tempfile.TemporaryDirectory() as tmp:
    limpio = new_repo(Path(tmp), "limpio")
    proc = run(["--root", str(limpio), *sum((["--label", e] for e in ETIQUETAS), []),
                "--reason", "Sin publicar:\n{output}"])
    check("sale 0", 0, proc.returncode)
    check("emite el objeto vacío", "{}", proc.stdout.strip())

print("== 2. CLI: con trabajo bloquea, con la prosa del consumidor ==")
with tempfile.TemporaryDirectory() as tmp:
    sucio = new_repo(Path(tmp), "sucio")
    (sucio / "semilla.txt").write_text("cambiado\n")
    proc = run(["--root", str(sucio), *sum((["--label", e] for e in ETIQUETAS), []),
                "--reason", "Queda sin publicar:\n{output}\nCerrá el ciclo."])
    check("sale 0 igual", 0, proc.returncode)
    datos = json.loads(proc.stdout)
    check("bloquea", "block", datos.get("decision"))
    check("nombra el repo", True, "sucio" in datos["reason"])
    check("con la etiqueta inyectada", True, "1 sin commitear" in datos["reason"])
    check("y la prosa del consumidor", True, "Cerrá el ciclo." in datos["reason"])

print("== 3. DISCRIMINA: una reentrada NO barre nada ==")
with tempfile.TemporaryDirectory() as tmp:
    sucio = new_repo(Path(tmp), "sucio")
    (sucio / "semilla.txt").write_text("cambiado\n")
    proc = run(["--root", str(sucio), *sum((["--label", e] for e in ETIQUETAS), []),
                "--reason", "x {output}"], payload='{"stop_hook_active": true}')
    check("el mismo repo sucio emite {}", "{}", proc.stdout.strip())

print("== 4. CONTROL: sin raíces NO publica un verde ==")
# Cero raíces y cero repos con trabajo dan la misma lista vacía. El gate lo
# traduce a `{}` —no bloquear es correcto— pero lo NOMBRA: callarlo sería el
# verde que no discrimina.
proc = run([*sum((["--label", e] for e in ETIQUETAS), []), "--reason", "x {output}"])
check("sale 0", 0, proc.returncode)
check("emite {}", "{}", proc.stdout.strip())
check("y lo nombra en stderr", True, "raíz" in proc.stderr or "raiz" in proc.stderr)

print("== 5. CONTROL: una etiqueta ausente NO se rellena sola ==")
with tempfile.TemporaryDirectory() as tmp:
    sucio = new_repo(Path(tmp), "sucio")
    (sucio / "semilla.txt").write_text("cambiado\n")
    proc = run(["--root", str(sucio), "--label", "dirty=x", "--reason", "x {output}"])
    check("emite {}, no un motivo a medias", "{}", proc.stdout.strip())
    check("y nombra las etiquetas que faltan", True, "staged" in proc.stderr)

print("== 6. CONTROL: una etiqueta mal formada rehúsa SIN stdout ==")
# Un `{}` aquí se leería como «no hay nada pendiente», y lo que hay es una
# declaración mal escrita. Salir sin stdout obliga al consumidor a mirar.
proc = run(["--root", "/tmp", "--label", "sin-igual", "--reason", "x"])
check("no sale 0", True, proc.returncode != 0)
check("y NO publica stdout", "", proc.stdout.strip())

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
