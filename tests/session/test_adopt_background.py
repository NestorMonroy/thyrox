#!/usr/bin/env python3
"""Suite de `src/session/adopt_background.py`.

Su control positivo es el episodio real de esta sesion: un comando excedio su
plazo, el corredor anfitrion lo mando a segundo plano con un identificador, y su
salida se recogio a mano porque el ledger no lo tenia anotado.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session.adopt_background import (  # noqa: E402
    DEFAULT_MARKER, MARKER_VAR, OUTPUT_ROOT_VAR, OUTPUT_SESSION_VAR,
    adopt, derived_output, parse_notice,
)
from session.job_ledger import JobLedger  # noqa: E402

MODULE = str(Path(__file__).resolve().parents[2] / "src" / "session"
             / "adopt_background.py")
OK = FAILED = 0


def check(name: str, expected: object, got: object) -> None:
    global OK, FAILED
    if expected == got:
        OK += 1
        print(f"  ok    {name}")
    else:
        FAILED += 1
        print(f"  FALLO {name} — esperado {expected!r} obtenido {got!r}")


# El anuncio VERBATIM del episodio, con su identificador y su ruta reales.
NOTICE = (
    "Command did not complete within its 120s timeout and was moved to the "
    "background (ID: bmdqwv5l7). Output is being written to: "
    "/tmp/claude-0/-home-user/168b0fdf/tasks/bmdqwv5l7.output. You will be "
    "notified when it completes."
)

print("== 1. el anuncio se lee por sus dos hechos, no por su prosa ==")
leido = parse_notice(NOTICE)
check("1.1 saca el identificador", "bmdqwv5l7", leido[0])
check("1.2 y la ruta de salida",
      "/tmp/claude-0/-home-user/168b0fdf/tasks/bmdqwv5l7.output", str(leido[1]))
check("1.3 sin ID no adivina", None, parse_notice("se fue a segundo plano"))
check("1.4 sin salida NI convencion, no adivina", None,
      parse_notice("(ID: abc123) y nada mas"))
# La prosa cambia entre versiones; los dos hechos no.
check("1.5 otra prosa, mismos hechos", ("z9",),
      (parse_notice("backgrounded (ID: z9) -> /var/t/z9.output")[0],))

print("== 2. adoptar deja el trabajo esperable por la barrera ==")
with tempfile.TemporaryDirectory() as d:
    base = Path(d)
    ledger = JobLedger(base / "ledger")
    log = base / "trabajo.output"
    log.write_text("trabajando\n")
    job = adopt(ledger, "bmdqwv5l7", log)
    check("2.1 queda anotado", ["bmdqwv5l7"], [j.label for j in ledger.jobs()])
    check("2.2 sin pid: no lo lanzamos nosotros", None, job.pid)
    check("2.3 con el marcador del anfitrion", DEFAULT_MARKER, job.marker)

    vivo = {"corriendo": True}
    def alive(_job): return vivo["corriendo"]

    check("2.4 sin marcador -> esperando", "waiting",
          ledger.settle(job, marker_pattern="EXIT=", alive=alive))
    log.write_text("trabajando\n[exited with code 0]\n")
    check("2.5 con el marcador del anfitrion -> recogido", "collected",
          ledger.settle(job, marker_pattern="EXIT=", alive=alive))

print("== 2-bis. CONTROL DE ANULACION: se retira el marcador POR TRABAJO ==")
# Si `Job.marker` no gobernara, la barrera leeria el trabajo adoptado con el
# patron del llamador (`EXIT=`), que su salida nunca lleva. Debe caer 2.5 y SOLO
# 2.5: 2.4 sobrevive porque un log sin ningun marcador espera con las dos
# medidas, asi que su verde no distingue una de otra.
with tempfile.TemporaryDirectory() as d:
    base = Path(d)
    ledger = JobLedger(base / "ledger")
    log = base / "anulado.output"
    log.write_text("trabajando\n")
    anulado = ledger.register("anulado", log)      # sin marker: la forma vieja
    def alive2(_job): return True
    antes = ledger.settle(anulado, marker_pattern="EXIT=", alive=alive2)
    log.write_text("trabajando\n[exited with code 0]\n")
    despues = ledger.settle(anulado, marker_pattern="EXIT=", alive=alive2)
check("2-bis.1 anulado, 2.5 cae: sigue esperando", "waiting", despues)
check("2-bis.2 y 2.4 SOBREVIVE a la anulacion", "waiting", antes)

print("== 3. el marcador es PARAMETRO del consumidor, no del mecanismo ==")
with tempfile.TemporaryDirectory() as d:
    base = Path(d)
    ledger = JobLedger(base / "ledger")
    log = base / "otro.output"
    log.write_text("fin: [[done 7]]\n")
    job = adopt(ledger, "otro", log, marker=r"\[\[done ")
    check("3.1 el declarado gana al respaldo", r"\[\[done ", job.marker)
    check("3.2 y con el se recoge", "collected",
          ledger.settle(job, marker_pattern="EXIT=", alive=lambda _j: True))

print("== 4. CLI: rehusa antes que adoptar a medias ==")
with tempfile.TemporaryDirectory() as d:
    proc = subprocess.run(
        [sys.executable, MODULE, "--ledger", d, "--from-notice"],
        input="un anuncio sin sus dos hechos", capture_output=True, text=True)
    check("4.1 sale 2", 2, proc.returncode)
    check("4.2 y NO deja nada anotado", [], sorted(Path(d).glob("*.job")))
    check("4.3 nombrando lo que falta", True, "*.output" in proc.stderr)

    proc = subprocess.run(
        [sys.executable, MODULE, "--ledger", d, "--from-notice"],
        input=NOTICE, capture_output=True, text=True)
    check("4.4 con el anuncio real, sale 0", 0, proc.returncode)
    check("4.5 y lo anota", 1, len(sorted(Path(d).glob("*.job"))))

    # La variable declarada por el consumidor gobierna al respaldo.
    import os as _os
    entorno = dict(_os.environ, **{MARKER_VAR: "FIN-PROPIO"})
    proc = subprocess.run(
        [sys.executable, MODULE, "--ledger", d, "--id", "v", "--log",
         str(Path(d) / "v.output")],
        capture_output=True, text=True, env=entorno)
    check("4.6 la variable declarada gobierna", True, "FIN-PROPIO" in proc.stdout)


print("== 5. la ruta se DERIVA de la convencion: es como lo hace la referencia ==")
# `adoptShellOutputRoot` de 2.1.266 adopta la RAIZ y compone
# `join(raiz, sesion, "tasks")`. Con la convencion el identificador basta, y el
# identificador es lo unico que un anuncio garantiza. Control: la ruta real de
# esta sesion cumple la convencion.
import os as _os2
check("5.1 compone <raiz>/<sesion>/tasks/<id>.output",
      "/r/s7/tasks/j1.output", str(derived_output("j1", "/r", "s7")))
check("5.2 sin raiz declarada, None", None, derived_output("j1", None, "s7"))
check("5.3 sin sesion declarada, None", None, derived_output("j1", "/r", None))

_previo = {k: _os2.environ.get(k) for k in (OUTPUT_ROOT_VAR, OUTPUT_SESSION_VAR)}
try:
    _os2.environ[OUTPUT_ROOT_VAR] = "/raiz-adoptada"
    _os2.environ[OUTPUT_SESSION_VAR] = "ses-9"
    check("5.4 con la convencion declarada, el ID SOLO alcanza",
          "/raiz-adoptada/ses-9/tasks/abc123.output",
          str(parse_notice("(ID: abc123) y nada mas")[1]))
    # La ruta NOMBRADA sigue ganando: es el hecho, no una derivacion.
    check("5.5 y la ruta nombrada gana sobre la derivada",
          "/tmp/claude-0/-home-user/168b0fdf/tasks/bmdqwv5l7.output",
          str(parse_notice(NOTICE)[1]))
finally:
    for k, v in _previo.items():
        if v is None:
            _os2.environ.pop(k, None)
        else:
            _os2.environ[k] = v

# CONTROL DE ANULACION: retirada la convencion, 5.4 cae y SOLO 5.4.
check("5-bis.1 anulada la convencion, 5.4 cae", None,
      parse_notice("(ID: abc123) y nada mas"))
check("5-bis.2 y 5.5 SOBREVIVE, porque su ruta va nombrada",
      "/tmp/claude-0/-home-user/168b0fdf/tasks/bmdqwv5l7.output",
      str(parse_notice(NOTICE)[1]))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
