"""Pruebas de ``roster.orphan_task`` — la tarjeta viva sin nadie que la cierre.

Cierra el hueco medido en ``kaupamex-docs: …/hallazgos/
hallazgo-H-DOCS-1111-el-proceso-colgado-sobrevive-al-turno.rst``: un ``cat``
sin argumento sobrevivió al turno 3h22 manteniendo viva una tarjeta del
harness, y los dos módulos hermanos pasaron sin verlo — ``job_liveness`` mide
la FORMA del ``.output`` (0 bytes es indistinguible de recién arrancado) y
``process_liveness`` necesita un ``pid=`` que el roster del harness NO anota.

Los casos que DISCRIMINAN, y por qué:

- **2 contra 3** — el mismo proceso de 3 horas da ``progressing`` si su
  ``.output`` creció y ``blocked_no_writer`` si sigue en cero. Sin ese par, el
  veredicto sería "lleva mucho tiempo", que marca como colgado a cualquier
  trabajo largo legítimo. Es el control que puede fallar.
- **4** — 0 bytes y viejo, pero el fd 0 es un archivo real: ``live_unclassified``.
  La ausencia de evidencia no es evidencia, misma frontera que
  ``stalled_evident``/``stalled_unknown`` en ``job_liveness``.
- **5** — dentro de la ventana no se juzga: ``recent``. Un trabajo que arrancó
  hace un instante todavía no ha tenido ocasión de escribir.
- **7** — la cadena de padres es TRANSITIVA (7243 ← 7241 ← 516): sin eso, el
  proceso colgado no se ata a la tarjeta, que es exactamente lo que obligó a
  reconstruirlo a mano en el episodio.
- **8** — un ciclo en la tabla de padres no cuelga el barrido. El instrumento
  que diagnostica cuelgues no puede colgarse.

La tabla de procesos es de mentira y se construye aquí: medir contra los
procesos reales de la máquina haría el resultado dependiente de qué corría
cuando se lanzó la suite.
"""
from __future__ import annotations

import sys
from pathlib import Path

# El arranque asciende buscando el MARCADOR, no una profundidad fija: mover
# este archivo un nivel no puede apuntar en silencio a otro sitio, que es el
# defecto que H-DOCS-1103 midió (`parents[3]/'tools'` → un directorio que nunca
# existió). Es el mismo criterio que `reach.thyrox_root`, que no se puede usar
# aquí porque hay que localizar `src` ANTES de poder importarlo.
_MARKER = Path("src") / "paths" / "reach.py"
_HERE = Path(__file__).resolve()
for _level in _HERE.parents:
    if (_level / _MARKER).is_file():
        sys.path.insert(0, str(_level / "src"))
        break
else:  # pragma: no cover - sin marcador no hay nada que probar
    raise SystemExit(f"no se halló {_MARKER} ascendiendo desde {_HERE}")

from roster import orphan_task as ot  # noqa: E402

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


def proc(pid: int, ppid: int, elapsed: float, stdin_target: str | None,
         command: str = "cat") -> ot.ProcessFacts:
    return ot.ProcessFacts(pid=pid, ppid=ppid, elapsed_seconds=elapsed,
                           stdin_target=stdin_target, command=command)


def entry(task_id: str, output_bytes: int, age: float) -> ot.TaskEntry:
    return ot.TaskEntry(task_id=task_id, output_bytes=output_bytes,
                        output_age_seconds=age)


print("== 1. el vocabulario de veredictos está declarado y es cerrado ==")
check("cinco veredictos nombrados por su causa",
      ("unpaired", "recent", "progressing", "blocked_no_writer", "live_unclassified"),
      ot.VERDICTS)

print("== 2. el episodio real: 0 bytes, viejo, fd 0 en un socket ==")
d = ot.diagnose(entry("bvrutsr53", 0, 12159), proc(7243, 7241, 12159, "socket:[376790]"))
check("veredicto", "blocked_no_writer", d.verdict)
check("la procedencia dice que decidió el fd 0", True, d.from_stdin)
check("el pid viaja con el veredicto", 7243, d.pid)

print("== 3. MISMO proceso de 3 horas, pero su .output creció → no se marca ==")
d = ot.diagnose(entry("otro", 27687652, 12159), proc(7243, 7241, 12159, "socket:[376790]"))
check("un trabajo largo que avanza es progressing", "progressing", d.verdict)
check("no lo decidió el fd 0", False, d.from_stdin)

print("== 4. 0 bytes y viejo, pero el fd 0 es un archivo real ==")
d = ot.diagnose(entry("z", 0, 12159), proc(99, 7241, 12159, "/home/user/entrada.txt"))
check("ausencia de evidencia ≠ evidencia", "live_unclassified", d.verdict)

print("== 5. dentro de la ventana no se juzga ==")
d = ot.diagnose(entry("nuevo", 0, 30), proc(100, 7241, 30, "socket:[1]"))
check("recién arrancado es recent", "recent", d.verdict)

print("== 6. la holgura de reloj es una constante propia, sumada al umbral ==")
d = ot.diagnose(entry("borde", 0, 930), proc(101, 7241, 930, "socket:[1]"),
                stale_after=900, clock_skew=60)
check("930s con umbral 900 + holgura 60 sigue siendo recent", "recent", d.verdict)

print("== 7. la cadena de padres es transitiva ==")
tabla = (proc(7243, 7241, 12159, "socket:[376790]"),
         proc(7241, 516, 12167, None, "bash -c …"),
         proc(516, 489, 28800, None, "claude --output-format=stream-json"),
         proc(999, 1, 5, None, "otra cosa"))
pids = tuple(sorted(p.pid for p in ot.descendants_of(516, tabla)))
check("7243 y 7241 descienden de 516; 999 no", (7241, 7243), pids)

print("== 8. un ciclo en la tabla de padres no cuelga el barrido ==")
ciclo = (proc(1, 2, 1, None), proc(2, 1, 1, None))
check("el recorrido termina", (), tuple(ot.descendants_of(3, ciclo)))

print("== 9. una entrada sin proceso emparejable es unpaired, no un vacío ==")
result = ot.sweep([entry("huerfana", 0, 12159)], (), client_pid=516)
check("veredicto", "unpaired", result.diagnoses["huerfana"].verdict)
check("sin pid que citar", None, result.diagnoses["huerfana"].pid)

print("== 10. el barrido empareja por cadena de padres, no por orden ==")
result = ot.sweep([entry("bvrutsr53", 0, 12159), entry("viva", 4096, 10)],
                  tabla, client_pid=516, pid_by_task={"bvrutsr53": 7243})
check("la colgada", "blocked_no_writer", result.diagnoses["bvrutsr53"].verdict)
check("la que avanza", "unpaired", result.diagnoses["viva"].verdict)

print("== 11. sweep([]) no rehúsa — un roster sin trabajo es normal ==")
check("vacío legítimo", 0, len(ot.sweep([], (), client_pid=516).diagnoses))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
