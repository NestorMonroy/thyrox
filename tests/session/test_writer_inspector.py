"""Pruebas de ``session.writer_inspector`` contra procesos reales.

Lo que el inspector aporta es distinguir tres respuestas sobre una ruta: nadie
la tiene abierta en escritura, alguien sí (y quién), o no se pudo demostrar la
ausencia. Se prueba frente a procesos de verdad, porque esa distinción sólo
existe en ``/proc``.

Controles de anulación
----------------------
- ``access_mode_filter=False`` trata toda apertura como escritura: tiene que
  caer exactamente el caso del lector, que deja de ser «ningún escritor».
- ``proc_root`` hacia un árbol donde el fd existe pero su ``fdinfo`` no se lee:
  el resultado tiene que ser «no demostrable», nunca «ningún escritor».
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.writer_inspector import (  # noqa: E402
    LiveWriterError,
    UnprovableAbsenceError,
    assert_no_live_writers,
    find_open_writers,
    has_live_writer,
)

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


def hold(path: Path, mode: str) -> subprocess.Popen:
    """Un proceso que abre ``path`` en ``mode`` y lo retiene hasta que se le
    cierre la entrada. Anuncia por su salida que ya lo tiene abierto."""
    script = (
        "import sys\n"
        f"f = open({str(path)!r}, {mode!r})\n"
        "print('open', flush=True)\n"
        "sys.stdin.read()\n"
    )
    proc = subprocess.Popen([sys.executable, "-c", script], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    assert proc.stdout is not None
    assert proc.stdout.readline().strip() == "open"
    return proc


def release(proc: subprocess.Popen) -> None:
    assert proc.stdin is not None
    proc.stdin.close()
    proc.wait(timeout=10)


with tempfile.TemporaryDirectory() as scratch:
    root = Path(scratch)
    target = root / "1.stream.jsonl"
    target.write_text("")

    print("caso 1: nadie la tiene abierta")
    check("sin escritores", [], find_open_writers([target]).writers)
    check("has_live_writer es falso", False, has_live_writer([target]))
    assert_no_live_writers([target])
    check("assert_no_live_writers no rehúsa", True, True)

    print("caso 2: un proceso la tiene abierta en escritura (append)")
    writer = hold(target, "a")
    found = find_open_writers([target]).writers
    check("encuentra un escritor", 1, len(found))
    check("es el pid del proceso", writer.pid, found[0].pid if found else None)
    check("has_live_writer es verdadero", True, has_live_writer([target]))
    try:
        assert_no_live_writers([target])
        check("assert_no_live_writers rehúsa", "LiveWriterError", "no rehusó")
    except LiveWriterError as error:
        check("assert_no_live_writers rehúsa nombrando el pid", True, str(writer.pid) in str(error))
    release(writer)
    check("al cerrarse, ya no hay escritor", False, has_live_writer([target]))

    print("caso 3: un lector no es escritor")
    reader = hold(target, "r")
    check("sólo lectura no cuenta", False, has_live_writer([target]))
    check("anulado el filtro de modo, el lector se cuenta (control)", True,
          len(find_open_writers([target], access_mode_filter=False).writers) >= 1)
    release(reader)

    print("caso 4: un directorio cubre los archivos de dentro")
    inner = root / "outputs"
    inner.mkdir()
    (inner / "joblog.tsv").write_text("")
    writer = hold(inner / "joblog.tsv", "w")
    check("un escritor bajo el directorio se ve desde el directorio", True, has_live_writer([inner]))
    check("un hermano de fuera no se confunde con el directorio", False, has_live_writer([root / "out"]))
    release(writer)

    print("caso 5: un archivo borrado mientras se escribe sigue contando")
    doomed = root / "doomed.log"
    writer = hold(doomed, "w")
    doomed.unlink()
    check("el escritor de un archivo borrado se ve por su ruta", True, has_live_writer([doomed]))
    release(writer)

    print("caso 6: sin poder leer fdinfo, la ausencia no se demuestra (control)")
    fake = root / "proc"
    (fake / "4242" / "fd").mkdir(parents=True)
    os.symlink(str(target), fake / "4242" / "fd" / "7")
    scan = find_open_writers([target], proc_root=fake)
    check("el pid ilegible queda declarado", [4242], scan.unreadable_pids)
    check("has_live_writer no inventa un escritor", False, scan.writers != [])
    try:
        assert_no_live_writers([target], proc_root=fake)
        check("assert_no_live_writers rehúsa sin prueba", "UnprovableAbsenceError", "no rehusó")
    except UnprovableAbsenceError:
        check("assert_no_live_writers rehúsa sin prueba", True, True)

print(f"resultado: {OK} de {OK + FAILED} aserciones en verde")
sys.exit(1 if FAILED else 0)
