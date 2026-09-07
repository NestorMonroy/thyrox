"""Pruebas de ``reconcile_store._retention_level`` — el nivel que un barrido
de disco PUEDE afirmar, y el que no.

El defecto que cierran
----------------------
``niveles-de-retencion.md`` da al 4 un significado terminal: «murió sin
entregar». ``_verdict`` ya protege el desenlace de un agente vivo — un
transcript que sigue creciendo devuelve ``("running", None)`` y su docstring
lo llama «lo honesto» — pero ``_retention_level`` era
``3 if status == "completed" else 4``, así que ese mismo agente vivo recibía
un 4.

Las dos columnas salían de la MISMA ejecución y no coincidían: ``status``
decía «no sé» y ``retention_level`` decía «murió». Medido el 2026-09-07 sobre
el store del consumidor: 2 filas ``status='running'`` con nivel 4 y 2 filas
del mismo pase, también ``running``, con nivel ``NULL`` — dos respuestas para
un solo estado, escritas con minutos de diferencia.

El par que discrimina
---------------------
Los casos A/B contra C. Un test que sólo midiera ``completed`` y ``failed``
pasa con el código viejo y con el nuevo: no distingue. Sólo C cae al retirar
la guarda, y por eso es el que la mide.
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from agents import reconcile_store  # noqa: E402

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


print("== A. Un desenlace terminal SÍ tiene nivel ==")
check("completed entrega algo recuperable, sin verificar -> 3",
      3, reconcile_store._retention_level(Path("/dev/null"), "completed"))
check("failed murió sin entregar -> 4",
      4, reconcile_store._retention_level(Path("/dev/null"), "failed"))

print("== B. Un estado NO terminal no tiene nivel que afirmar ==")
check("running -> None, no 4: el agente sigue vivo",
      None, reconcile_store._retention_level(Path("/dev/null"), "running"))
check("un estado desconocido tampoco se cierra",
      None, reconcile_store._retention_level(Path("/dev/null"), "queued"))

print("== C. La línea que escribe respeta el veredicto ==")
with tempfile.TemporaryDirectory() as tmp:
    transcript = Path(tmp) / "agent-aprueba.jsonl"
    transcript.write_text(
        json.dumps({"type": "assistant", "message": {"content": [{"type": "text", "text": "x"}]}}) + "\n",
        encoding="utf-8")
    running = reconcile_store._cierre(transcript, "aprueba", "running")
    terminal = reconcile_store._cierre(transcript, "aprueba", "completed")
    check("running no emite --retention-level",
          False, "--retention-level" in running)
    check("completed sí lo emite, con su valor",
          ["--retention-level", "3"],
          terminal[terminal.index("--retention-level"):
                   terminal.index("--retention-level") + 2])
    check("el status viaja igual en los dos casos",
          ("running", "completed"),
          (running[running.index("--status") + 1],
           terminal[terminal.index("--status") + 1]))

print(f"\nRESULTADO: {OK} ok, {FAILED} fallo(s)")
sys.exit(1 if FAILED else 0)
