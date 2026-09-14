"""Pruebas de ``roster.descriptor_liveness`` — el roster sin PID Y sin ledger.

Adaptación de ``Ft(n)`` del cliente Claude Code (ver el docstring del módulo
para la cita verbatim). Los casos que DISCRIMINAN, y por qué:

- **3** — ``/proc`` ilegible sale ``unavailable``, NUNCA ``unheld``. Es el caso
  central: un cero que no distingue «nadie lo sostiene» de «no pude mirar» es
  el sub-patrón D de ``metrica-decide-la-conclusion.md``, y es exactamente el
  defecto que :ref:`h-docs-1258` registró en los otros tres instrumentos.
- **4** — un PID cuyo ``fd/`` no se puede listar NO aborta el barrido: aporta
  cero descriptores y el resto se sigue midiendo. Es la conducta declarada de
  la fuente (``.catch(()=>[])``), y cubre la carrera real de un proceso que
  muere entre los dos ``readdir``.
- **6** — el sufijo ``" (deleted)"`` se reconoce y NO se colapsa: el tenedor
  se reporta con ``deleted=True`` para que quien llama decida, en vez de
  publicarlo como si sostuviera el archivo vivo.
- **8** — dos tenedores salen los DOS. La fuente devuelve sólo el primero
  (``indexOf``) porque su objetivo es un socket, que tiene un dueño; un
  ``.output`` admite al escritor y a un ``tail`` a la vez, y el orden numérico
  de PID no pone al escritor primero.
- **10-11** — el par de control contra ``/proc`` REAL, que es lo único que
  puede fallar de verdad: este proceso abre un archivo y el detector tiene que
  encontrar su propio PID; un archivo que nadie sostiene tiene que salir
  ``unheld``. Un control que sólo mirara el caso positivo pasaría igual con el
  detector roto.
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from roster import descriptor_liveness as dl  # noqa: E402

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


def fake_procfs(tree: dict, links: dict, unlistable=()):
    """Construye el par ``list_dir``/``read_link`` de un ``/proc`` simulado.

    ``tree`` mapea ``"/proc"`` y ``"/proc/<pid>/fd"`` a su listado; ``links``
    mapea ``"/proc/<pid>/fd/<fd>"`` al destino que ``readlink`` devolvería;
    ``unlistable`` son las rutas cuyo ``list_dir`` lanza.
    """
    def list_dir(path: str) -> list[str]:
        if path in unlistable:
            raise OSError(13, "Permission denied", path)
        return tree[path]

    def read_link(path: str) -> str:
        if path not in links:
            raise OSError(2, "No such file or directory", path)
        return links[path]

    return list_dir, read_link


print("== 1. un tenedor: veredicto held y el PID nombrado ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["1", "42", "cpuinfo"], "/proc/1/fd": [], "/proc/42/fd": ["3"]},
    links={"/proc/42/fd/3": "/tmp/tasks/b33qlw183.output"},
)
d = dl.diagnose("/tmp/tasks/b33qlw183.output", list_dir=list_dir, read_link=read_link)
check("verdict", "held", d.verdict)
check("un solo tenedor", 1, len(d.holders))
check("el PID", 42, d.holders[0].pid)
check("is_alive", True, dl.is_alive(d))

print("== 2. nadie lo sostiene: unheld, y NO es lo mismo que no poder mirar ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["42"], "/proc/42/fd": ["3"]},
    links={"/proc/42/fd/3": "/tmp/otra/cosa.log"},
)
d = dl.diagnose("/tmp/tasks/b33qlw183.output", list_dir=list_dir, read_link=read_link)
check("verdict", "unheld", d.verdict)
check("sin tenedores", 0, len(d.holders))
check("is_alive", False, dl.is_alive(d))

print("== 3. /proc ilegible -> unavailable, NUNCA unheld ==")
list_dir, read_link = fake_procfs(tree={}, links={}, unlistable=("/proc",))
d = dl.diagnose("/tmp/tasks/x.output", list_dir=list_dir, read_link=read_link)
check("verdict", "unavailable", d.verdict)
check("is_alive", False, dl.is_alive(d))
check("unavailable no se lee como unheld", False, d.verdict == "unheld")

print("== 4. un fd/ ilegible no aborta el barrido: el resto se sigue midiendo ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["7", "42"], "/proc/42/fd": ["3"]},
    links={"/proc/42/fd/3": "/tmp/tasks/x.output"},
    unlistable=("/proc/7/fd",),
)
d = dl.diagnose("/tmp/tasks/x.output", list_dir=list_dir, read_link=read_link)
check("verdict", "held", d.verdict)
check("el PID legible sí aparece", [42], [h.pid for h in d.holders])

print("== 5. un readlink que falla aporta cero, no rompe ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["42"], "/proc/42/fd": ["3", "4"]},
    links={"/proc/42/fd/4": "/tmp/tasks/x.output"},
)
d = dl.diagnose("/tmp/tasks/x.output", list_dir=list_dir, read_link=read_link)
check("verdict", "held", d.verdict)
check("el fd legible sí aparece", ["4"], [h.fd for h in d.holders])

print("== 6. sufijo ' (deleted)': se reconoce y se marca, no se colapsa ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["42"], "/proc/42/fd": ["3"]},
    links={"/proc/42/fd/3": "/tmp/tasks/x.output (deleted)"},
)
d = dl.diagnose("/tmp/tasks/x.output", list_dir=list_dir, read_link=read_link)
check("verdict", "held", d.verdict)
check("marcado como borrado", True, d.holders[0].deleted)

print("== 7. entradas no numéricas de /proc se descartan ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["cpuinfo", "self", "meminfo"]},
    links={},
)
d = dl.diagnose("/tmp/tasks/x.output", list_dir=list_dir, read_link=read_link)
check("verdict", "unheld", d.verdict)

print("== 8. dos tenedores salen los DOS (divergencia declarada) ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["42", "99"], "/proc/42/fd": ["3"], "/proc/99/fd": ["7"]},
    links={"/proc/42/fd/3": "/tmp/tasks/x.output",
           "/proc/99/fd/7": "/tmp/tasks/x.output"},
)
d = dl.diagnose("/tmp/tasks/x.output", list_dir=list_dir, read_link=read_link)
check("los dos PIDs", [42, 99], sorted(h.pid for h in d.holders))

print("== 9. sweep: cada entrada con su diagnóstico ==")
list_dir, read_link = fake_procfs(
    tree={"/proc": ["42"], "/proc/42/fd": ["3"]},
    links={"/proc/42/fd/3": "/tmp/tasks/vivo.output"},
)
result = dl.sweep([Path("/tmp/tasks/vivo.output"), Path("/tmp/tasks/muerto.output")],
                  list_dir=list_dir, read_link=read_link)
check("el vivo", "held", result["/tmp/tasks/vivo.output"].verdict)
check("el muerto", "unheld", result["/tmp/tasks/muerto.output"].verdict)

print("== 10. CONTROL contra /proc real: este proceso sostiene su archivo ==")
with tempfile.NamedTemporaryFile(suffix=".output", delete=False) as handle:
    sostenido = handle.name
    handle.write(b"contenido, para que el archivo NO este vacio\n")
    handle.flush()
    d = dl.diagnose(sostenido)
    check("verdict", "held", d.verdict)
    check("mi propio PID entre los tenedores", True,
          os.getpid() in [h.pid for h in d.holders])

print("== 11. CONTROL contra /proc real: el mismo archivo ya sin tenedor ==")
# El archivo sigue existiendo Y con contenido — que es justo lo que los otros
# tres instrumentos leen como "terminado". Aquí el descriptor ya se cerró.
d = dl.diagnose(sostenido)
check("verdict", "unheld", d.verdict)
check("con contenido en disco", True, os.path.getsize(sostenido) > 0)
os.unlink(sostenido)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
