#!/usr/bin/env python3
"""Control de ``src/roster/stdin_probe.py``: la entrada estándar de un proceso,
una línea por PID, para correrlo con GNU Parallel.

Origen: el 2026-09-26 un ``rg`` sin ruta esperó 1 h 19 min leyendo un stdin
que era un socket (``/proc/<pid>/fd/0 -> socket:[…]``); se diagnosticó a mano.
``roster/orphan_task.py`` ya sabía leer ese destino, pero no tenía CLI.

Qué haría fallar a este control:
- clasificar un socket o una tubería como algo que no bloquea;
- tratar ``/dev/null`` como canal (una lectura de ahí termina sola);
- publicar un pid ilegible como si tuviera stdin: es ``unreadable``;
- salir con líneas desordenadas bajo ``parallel -k``.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from roster import stdin_probe as sp  # noqa: E402

OK = FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        OK += 1
        print(f"  ok    {label}")
    else:
        FAILED += 1
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")


def fake_process(proc: Path, pid: int, stdin: str, state: str = "S", ticks: tuple[int, int] = (7, 3)) -> None:
    (proc / str(pid) / "fd").mkdir(parents=True)
    os.symlink(stdin, proc / str(pid) / "fd" / "0")
    # /proc/<pid>/stat: el campo 3 es el estado; 14 y 15, utime y stime en ticks.
    fields = [str(pid), "(rg)", state] + ["0"] * 10 + [str(ticks[0]), str(ticks[1])] + ["0"] * 5
    (proc / str(pid) / "stat").write_text(" ".join(fields) + "\n")


with tempfile.TemporaryDirectory() as tmp:
    proc = Path(tmp)
    fake_process(proc, 101, "socket:[1452327]")
    fake_process(proc, 102, "pipe:[99]", state="R")
    fake_process(proc, 103, "/dev/null")
    fake_process(proc, 104, "/home/user/a.txt")
    fake_process(proc, 105, "/dev/pts/0")

    probe = lambda pid: sp.probe(pid, proc_root=str(proc), ticks_per_second=100)
    check("un socket es un canal: puede esperar para siempre", ("socket:[1452327]", "channel", "S", 0.1),
          (probe(101).stdin, probe(101).kind, probe(101).state, probe(101).cpu_seconds))
    check("una tubería también", "channel", probe(102).kind)
    check("/dev/null no es canal: la lectura termina sola", "devnull", probe(103).kind)
    check("un archivo regular tampoco", "file", probe(104).kind)
    check("una terminal se nombra aparte", "tty", probe(105).kind)
    check("un pid que no está: ilegible, no un stdin vacío", ("unreadable", None), (probe(999).kind, probe(999).stdin))
    check("la línea es TSV: pid, destino, clase, estado, cpu",
          "101\tsocket:[1452327]\tchannel\tS\t0.10", probe(101).tsv())

    code = sp.main(["--proc-root", str(proc), "abc"])
    check("un pid no numérico rehúsa con exit 2", 2, code)

    if shutil.which("parallel"):
        out = subprocess.run(
            ["parallel", "-j2", "-k", "bash", str(ROOT / "bin/stdin_probe"), "--proc-root", str(proc), "{}",
             ":::", "103", "101", "999"], capture_output=True, text=True, check=False).stdout.splitlines()
        check("con GNU Parallel -k: una línea por pid, en el orden de entrada",
              ["103\t/dev/null\tdevnull", "101\tsocket:[1452327]\tchannel", "999\t-\tunreadable"],
              ["\t".join(line.split("\t")[:3]) for line in out])
    else:
        check("GNU Parallel instalado para medir la composición", True, False)

print(f"\ntest_stdin_probe: {OK + FAILED} aserciones — {OK} ok, {FAILED} falla(s)")
sys.exit(1 if FAILED else 0)
