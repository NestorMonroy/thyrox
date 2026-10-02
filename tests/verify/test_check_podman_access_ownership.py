"""Pruebas de PodmanAccessOwnershipGate (``check_podman_access_ownership``).

Cada caso arma un árbol mínimo con ``src/`` y mide con el guion real en un
proceso nuevo. La regresión del episodio real va literal: un ``podman run --rm``
de sondeo emitido por un consumidor (registrado como architecture_invalid en
POSTGRES-CORPUS-DISK-RECLAIM). La anulación es la misma observación por las dos
rutas: pedirla al dueño pasa, emitir el verbo falla.
"""
from __future__ import annotations

import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "src" / "verify" / "check_podman_access_ownership.py"
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


def tree(files: dict[str, str]) -> Path:
    base = Path(tempfile.mkdtemp(prefix="podman-ownership-"))
    (base / "src").mkdir()
    for relative, text in files.items():
        path = base / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    return base


def gate(base: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, str(GATE), "--root", str(base), "--strict", *extra],
                          capture_output=True, text=True)


CANONICAL = 'bash "$ROOT/bin/podman-execution-execute" observe volume thyrox-postgres-data\n'
DIRECT_SHELL = 'podman volume inspect thyrox-postgres-data\n'
DIRECT_PYTHON = 'import subprocess\nsubprocess.run(["podman", "inspect", "thyrox-postgres"])\n'

print("== RED / GREEN: el mismo probe por las dos rutas ==")
red = tree({"bench/probes/observe.sh": DIRECT_SHELL})
check("RED: podman volume inspect desde un consumidor falla", 1, gate(red, "--include", str(red / "bench/probes"), "--pending", "/dev/null").returncode)
green = tree({"bench/probes/observe.sh": CANONICAL})
check("GREEN: pedirlo a podman-execution observe pasa", 0, gate(green, "--include", str(green / "bench/probes"), "--pending", "/dev/null").returncode)

print("== anulación: subprocess -> podman inspect ==")
annulled = tree({"bench/probes/observe.py": DIRECT_PYTHON})
ran = gate(annulled, "--include", str(annulled / "bench/probes"), "--pending", "/dev/null")
check("la llamada directa por subprocess falla", 1, ran.returncode)
check("y nombra el archivo y la línea", True, "observe.py:2" in ran.stdout)

print("== regresión del episodio: podman run --rm de sondeo ==")
regression = tree({"src/lib/probe.sh": "podman run --rm --entrypoint sh docker.io/pgvector/pgvector:0.8.0-pg16 -c 'command -v gawk'\n"})
check("podman run --rm desde un consumidor falla", 1, gate(regression, "--pending", "/dev/null").returncode)

print("== lo que NO es acceso ==")
quiet = tree({"src/lib/msg.sh": 'echo "usa `podman system renumber` para reparar"\n# podman ps en un comentario\n',
              "src/packages/podman-execution/podmanObservation.ts": "await podman.run(['volume', 'inspect', name])\n",
              "src/packages/consumer/__tests__/fake.test.ts": "await podman.run(['ps', '--all'])\n"})
check("mensajes, comentarios, el dueño y las pruebas no cuentan", 0, gate(quiet, "--pending", "/dev/null").returncode)
consumer = tree({"src/packages/consumer/observe.ts": "await podman.run(['ps', '--all'])\n"})
check("un consumidor TS con .run(['ps'…]) falla", 1, gate(consumer, "--pending", "/dev/null").returncode)

print("== ceguera cerrada: el consumidor ejecuta argv del dueño con su executor ==")
borrowed = tree({"src/packages/consumer/unit.ts": "await this.options.podman.run(removeWorkerContainerArgv(name))\n"})
ran = gate(borrowed, "--pending", "/dev/null")
check("podman.run(<argv del dueño>) desde un consumidor falla", 1, ran.returncode)
check("y lo nombra podman-executor-run", True, "podman-executor-run" in ran.stdout)
indirect = tree({"src/packages/consumer/bin/publish.ts": "const value = await podman.run(args)\n"})
check("podman.run(args) con el verbo en una variable falla", 1, gate(indirect, "--pending", "/dev/null").returncode)
asked = tree({"src/packages/consumer/unit.ts": "await removeExecutionContainer(this.options.podman, name)\n"})
check("pedir la retirada al dueño pasa", 0, gate(asked, "--pending", "/dev/null").returncode)

print("== lista cerrada: la entrada vale mientras su tarea esté abierta ==")
listed = tree({"src/lib/legacy.sh": DIRECT_SHELL})
store = listed / "store.sqlite3"
with sqlite3.connect(store) as connection:
    connection.execute("create table tasks (citation_id text, layer_citation_id text, status text)")
    connection.execute("insert into tasks values ('TASK-THYROX-9001', 'TASK-THYROX-9001', 'pending')")
    connection.execute("insert into tasks values ('TASK-THYROX-9002', 'TASK-THYROX-9002', 'completed')")
pending = listed / "pending.txt"
pending.write_text("src/lib/legacy.sh\tTASK-THYROX-9001\tpor migrar\n")
check("con su tarea abierta, exime", 0, gate(listed, "--pending", str(pending), "--store", str(store)).returncode)
pending.write_text("src/lib/legacy.sh\tTASK-THYROX-9002\tpor migrar\n")
ran = gate(listed, "--pending", str(pending), "--store", str(store))
check("con su tarea cerrada, vence y falla", 1, ran.returncode)
check("y lo dice", True, "venció" in ran.stdout)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
