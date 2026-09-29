"""Pruebas de ``verify.check_staged_live_writers`` con procesos y repositorios reales.

Caso central (prueba 12 de TASK-THYROX-0601): un proceso escribe directamente
la salida de un banco versionado, alguien la prepara para commit, y el gate lo
atrapa nombrando el pid.

Controles de anulación — las dos mitades de juicio del gate:
- el modo de acceso: el mismo archivo abierto sólo para lectura no bloquea;
- el alcance del commit: un escritor de un archivo NO preparado no bloquea.
Si alguna de las dos mitades faltara, uno de estos controles caería.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "src/verify/check_staged_live_writers.py"

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def hold(path: Path, mode: str) -> subprocess.Popen:
    """Un proceso que abre ``path`` en ``mode`` y lo retiene hasta que se le cierre la entrada."""
    script = ("import sys\nf = open(sys.argv[1], sys.argv[2])\nprint('ready', flush=True)\n"
              "sys.stdin.read()\nf.close()\n")
    proc = subprocess.Popen([sys.executable, "-c", script, str(path), mode],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    assert proc.stdout is not None
    proc.stdout.readline()
    return proc


def release(proc: subprocess.Popen) -> None:
    assert proc.stdin is not None
    proc.stdin.close()
    proc.wait(timeout=10)


def run_gate(repo: Path) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(GATE), "--repo", str(repo)], capture_output=True, text=True,
                          env={**os.environ, "PYTHONPATH": str(ROOT / "src")})


with tempfile.TemporaryDirectory() as scratch:
    repo = Path(scratch).resolve() / "repo"
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    git(repo, "config", "user.name", "t")
    git(repo, "config", "user.email", "t@t")
    bench = repo / ".claude/workbench/b/outputs"
    bench.mkdir(parents=True)
    (repo / "README.md").write_text("x\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "seed")

    print("caso 1: sin nada preparado, no hay nada que medir")
    result = run_gate(repo)
    check("sale 0 y declara alcance 0", (0, True), (result.returncode, "alcance medido: 0" in result.stdout))

    print("caso 2: la salida del banco, preparada mientras un proceso la escribe (prueba 12)")
    stream = bench / "1.stream.jsonl"
    stream.write_text('{"type":"system"}\n')
    git(repo, "add", str(stream))
    writer = hold(stream, "a")
    result = run_gate(repo)
    check("el gate rehúsa con 1", 1, result.returncode)
    check("nombra la ruta preparada", True, ".claude/workbench/b/outputs/1.stream.jsonl" in result.stdout)
    check("nombra el pid del escritor", True, f"pid {writer.pid}" in result.stdout)
    release(writer)
    check("sin el escritor, el mismo commit pasa", 0, run_gate(repo).returncode)

    print("caso 2c: control — un lector del mismo archivo no bloquea")
    reader = hold(stream, "r")
    check("control: con un lector, sale 0", 0, run_gate(repo).returncode)
    release(reader)

    print("caso 2d: control — un escritor de un archivo NO preparado no bloquea")
    other = bench / "2.stream.jsonl"
    other.write_text("")
    writer = hold(other, "a")
    check("control: el escritor ajeno al commit no cuenta", 0, run_gate(repo).returncode)
    release(writer)

print("caso 3: el pre-commit del árbol invoca el gate")
hook = (ROOT / ".githooks/pre-commit").read_text()
check("el hook llama a check_staged_live_writers", True, "check_staged_live_writers.py" in hook)

print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
