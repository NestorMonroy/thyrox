"""Pruebas de ``session.job_ledger`` — el registro de trabajos y su barrera.

Adaptación del ledger, ``verdict()`` y ``cmd_wait`` de ``kaupamex-docs:
.claude/scripts/session/wait-jobs.sh`` (ver el docstring de ``job_ledger``
para la referencia completa y el reparto que decide qué viaja). Viaja el
registro + la barrera; NO viaja el control de proceso ni el archivado — otro
eje, fuera de este pase.

Los casos que DISCRIMINAN, y por qué:

- **7** — la re-comprobación de la carrera (hecho 2): un ``alive`` con efecto
  de lado que escribe el marcador justo antes de responder que ya no vive.
  Sin la segunda mirada (``_recheck_after_death``) el veredicto sería
  ``bailed``; con ella, ``collected``. Se verificó manualmente anulando
  ``_recheck_after_death`` (forzándola a devolver ``False``) y confirmando
  que ESTE caso —y sólo éste— cae; restaurado, ``git diff`` queda limpio
  (ver el resumen final de la sesión que produjo este archivo).
- **10** — ``settle()`` sola NO retira nada del registro (hecho 3): un
  veredicto ``collected`` no implica que el ``.job`` desaparezca. Sólo
  ``wait()`` y ``forget()`` retiran.
- **3** — ``forget`` sobre una etiqueta ausente REHÚSA (hecho 4): un
  ``UnknownJobError``, no un no-op silencioso.
- **13** — el timeout de ``wait()`` NO se traga a los que ya asentaron: con
  tres trabajos y uno que nunca asienta, el veredicto de los otros dos viaja
  en el diccionario de retorno igual, y el tercero sigue registrado.
- **15** — la escritura atómica (hecho 1): un fallo simulado entre escribir
  el temporal y renombrarlo deja el ``.job`` anterior intacto y no deja
  temporales huérfanos.
- **16** — control de vocabulario: todo veredicto que ``settle``/``wait``
  puedan emitir está en ``SETTLEMENTS``.

Los ledgers son de mentira y se construyen en un ``tempfile`` por caso: medir
contra un ledger real de sesión haría el resultado dependiente de qué otra
cosa esté corriendo.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session import job_ledger as jl  # noqa: E402

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


def always(value: bool):
    """Un ``alive`` fake: siempre devuelve ``value``, sin efecto de lado."""
    def _alive(job: jl.Job) -> bool:
        return value
    return _alive


def fake_clock(start: float = 0.0):
    """Un ``(now, sleep)`` de mentira: ``sleep`` avanza el reloj sin dormir
    de verdad, así el timeout de ``wait()`` se prueba sin esperar segundos.
    """
    state = {"t": start}

    def now() -> float:
        return state["t"]

    def sleep(seconds: float) -> None:
        state["t"] += seconds

    return now, sleep


PATTERN = r"^EXIT=[0-9]+"


print("== 1. register() + jobs() — un trabajo anotado se lista con sus datos ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log = Path(tmp) / "uno.log"
    job = ledger.register("uno", log, pid=123, proc_start="456", command="sleep 5")
    listados = ledger.jobs()
    check("un solo trabajo listado", 1, len(listados))
    check("con la etiqueta correcta", "uno", listados[0].label)
    check("con el log correcto", log, listados[0].log)
    check("con el pid correcto", 123, listados[0].pid)
    check("con el proc_start correcto", "456", listados[0].proc_start)
    check("con el command correcto", "sleep 5", listados[0].command)
    check("register() devuelve el mismo Job", job, listados[0])

print("== 2. register('') — una etiqueta vacía no nombra un trabajo ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    try:
        ledger.register("", Path(tmp) / "x.log")
        check("lanza EmptyLabelError", "EmptyLabelError", "no lanzó")
    except jl.EmptyLabelError:
        check("lanza EmptyLabelError", True, True)

print("== 3. DISCRIMINA (hecho 4): forget() sobre una etiqueta ausente REHÚSA ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    try:
        ledger.forget("nunca-existio")
        check("lanza UnknownJobError", "UnknownJobError", "no lanzó")
    except jl.UnknownJobError:
        check("lanza UnknownJobError", True, True)

print("== 4. forget() sobre un trabajo real lo retira y devuelve sus datos ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    ledger.register("efimero", Path(tmp) / "e.log", pid=9, command="c")
    soltado = ledger.forget("efimero")
    check("devuelve el Job soltado", "efimero", soltado.label)
    check("ya no aparece en jobs()", [], ledger.jobs())

print("== 5. settle(): marcador presente -> collected, sin importar 'alive' ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log = Path(tmp) / "listo.log"
    log.write_text("algo\nEXIT=0\n")
    job = ledger.register("listo", log, pid=1)
    # 'alive' dice que SIGUE vivo — y aun así el marcador manda: terminado es
    # terminado, no importa lo que 'alive' opine.
    check("collected pese a 'alive=True'", "collected",
          ledger.settle(job, marker_pattern=PATTERN, alive=always(True)))

print("== 6. settle(): sin marcador y con vida -> waiting ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log = Path(tmp) / "vivo.log"
    log.write_text("todavia trabajando\n")
    job = ledger.register("vivo", log, pid=1)
    check("waiting", "waiting",
          ledger.settle(job, marker_pattern=PATTERN, alive=always(True)))

print("== 7. DISCRIMINA (hecho 2): la carrera — el proceso escribe el marcador "
      "justo antes de que 'alive' diga que ya murió ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log = Path(tmp) / "carrera.log"
    log.write_text("")  # sin marcador todavía
    job = ledger.register("carrera", log, pid=1)

    def alive_que_escribe_y_muere(j: jl.Job) -> bool:
        # Efecto de lado: el proceso deja su marcador justo antes de que
        # 'alive' confirme que ya no vive — la carrera exacta del hecho 2.
        Path(j.log).write_text("EXIT=0\n")
        return False

    veredicto = ledger.settle(job, marker_pattern=PATTERN,
                               alive=alive_que_escribe_y_muere)
    check("con la segunda mirada: collected, NO bailed", "collected", veredicto)

print("== 8. sin la carrera: no vive y sin marcador -> bailed ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log = Path(tmp) / "muerto.log"
    log.write_text("se cortó a media frase")
    job = ledger.register("muerto", log, pid=1)
    check("bailed", "bailed",
          ledger.settle(job, marker_pattern=PATTERN, alive=always(False)))

print("== 9. settle(): el .job desapareció entre la instantánea y la pregunta "
      "-> forgotten ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    job = ledger.register("volatil", Path(tmp) / "v.log", pid=1)
    ledger.forget("volatil")  # alguien más lo soltó mientras tanto
    check("forgotten", "forgotten",
          ledger.settle(job, marker_pattern=PATTERN, alive=always(True)))

print("== 10. DISCRIMINA (hecho 3): settle() sola NO retira nada del registro ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log = Path(tmp) / "terminado.log"
    log.write_text("EXIT=0\n")
    job = ledger.register("terminado", log, pid=1)
    veredicto = ledger.settle(job, marker_pattern=PATTERN, alive=always(True))
    check("el veredicto es collected", "collected", veredicto)
    check("y AUN ASÍ sigue registrado — sólo wait()/forget() retiran",
          1, len(ledger.jobs()))

print("== 11. wait(): sin trabajos registrados -> {} de inmediato ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    now, sleep = fake_clock()
    check("diccionario vacío", {},
          ledger.wait(marker_pattern=PATTERN, alive=always(True),
                      timeout=10, interval=1, now=now, sleep=sleep))

print("== 12. wait(): todos asientan antes del plazo -> veredicto + retiro del "
      "registro ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log_a = Path(tmp) / "a.log"; log_a.write_text("EXIT=0\n")
    log_b = Path(tmp) / "b.log"; log_b.write_text("cortado")
    ledger.register("a", log_a, pid=1)
    ledger.register("b", log_b, pid=2)
    now, sleep = fake_clock()
    resultado = ledger.wait(marker_pattern=PATTERN, alive=always(False),
                             timeout=10, interval=1, now=now, sleep=sleep)
    check("a: collected", "collected", resultado["a"])
    check("b: bailed (sin marcador, sin vida)", "bailed", resultado["b"])
    check("los dos se retiraron del registro", [], ledger.jobs())

print("== 13. DISCRIMINA: el timeout NO se traga a los que ya asentaron ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log_a = Path(tmp) / "a.log"; log_a.write_text("EXIT=0\n")   # asienta ya
    log_b = Path(tmp) / "b.log"; log_b.write_text("cortado")     # asienta ya
    log_c = Path(tmp) / "c.log"; log_c.write_text("")            # nunca asienta
    ledger.register("a", log_a, pid=1)
    ledger.register("b", log_b, pid=2)
    ledger.register("c", log_c, pid=3)
    now, sleep = fake_clock()

    def alive_de_c_para_siempre(j: jl.Job) -> bool:
        return j.label == "c"  # "c" nunca deja de vivir; "b" ya no vive

    resultado = ledger.wait(marker_pattern=PATTERN,
                             alive=alive_de_c_para_siempre,
                             timeout=5, interval=1, now=now, sleep=sleep)
    check("a: collected pese al timeout", "collected", resultado["a"])
    check("b: bailed pese al timeout", "bailed", resultado["b"])
    check("c: waiting — es el que nunca asentó", "waiting", resultado["c"])
    check("los TRES siguen registrados — nada se retira sin el lote completo",
          {"a", "b", "c"}, {j.label for j in ledger.jobs()})

print("== 14. is-registered: un trabajo con vida ilimitada agota el plazo, no "
      "el número de vueltas ==")
# Control de que el fake_clock realmente maneja el paso del tiempo — si
# 'sleep' no avanzara el reloj, este 'wait' no terminaría nunca (bucle real).
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    ledger.register("eterno", Path(tmp) / "eterno.log", pid=1)
    now, sleep = fake_clock()
    resultado = ledger.wait(marker_pattern=PATTERN, alive=always(True),
                             timeout=3, interval=1, now=now, sleep=sleep)
    check("agota el plazo con waiting", {"eterno": "waiting"}, resultado)

print("== 15. DISCRIMINA (hecho 1): escritura atómica — un fallo simulado "
      "entre escribir el temporal y renombrarlo deja el .job anterior "
      "intacto y sin temporales huérfanos ==")
with tempfile.TemporaryDirectory() as tmp:
    directorio = Path(tmp) / "ledger"
    ledger = jl.JobLedger(directorio)
    log = Path(tmp) / "persistente.log"
    ledger.register("persistente", log, pid=1, proc_start="1", command="orig")
    ruta = directorio / "persistente.job"
    antes = ruta.read_text()

    reemplazo_original = jl.os.replace

    def reemplazo_que_falla(*_args, **_kwargs):
        raise OSError("simulado: falla entre escribir el temporal y renombrarlo")

    jl.os.replace = reemplazo_que_falla
    try:
        try:
            ledger.register("persistente", log, pid=2, proc_start="2",
                             command="nuevo")
            lanzo_error = False
        except OSError:
            lanzo_error = True
    finally:
        jl.os.replace = reemplazo_original

    despues = ruta.read_text()
    temporales_huerfanos = list(directorio.glob(".tmp-*"))
    check("el registro propagó el OSError simulado", True, lanzo_error)
    check("el .job anterior sigue byte a byte igual tras el fallo",
          antes, despues)
    check("ningún temporal quedó huérfano", [], temporales_huerfanos)
    # Y que el fallo simulado no se coló en jobs(): sigue habiendo UN solo
    # trabajo, con los datos de ANTES del intento fallido.
    listados = ledger.jobs()
    check("jobs() sigue viendo un solo trabajo, el de antes", 1, len(listados))
    check("con el pid de antes, no el del intento fallido", 1, listados[0].pid)

print("== 16. CONTROL: todo veredicto que settle()/wait() emiten está en "
      "SETTLEMENTS ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    log_ok = Path(tmp) / "ok.log"; log_ok.write_text("EXIT=0\n")
    log_no = Path(tmp) / "no.log"; log_no.write_text("")
    j_ok = ledger.register("ok", log_ok, pid=1)
    j_no = ledger.register("no", log_no, pid=2)
    j_volatil = ledger.register("volatil2", Path(tmp) / "vv.log", pid=3)
    ledger.forget("volatil2")
    veredictos = {
        ledger.settle(j_ok, marker_pattern=PATTERN, alive=always(True)),
        ledger.settle(j_no, marker_pattern=PATTERN, alive=always(True)),
        ledger.settle(j_no, marker_pattern=PATTERN, alive=always(False)),
        ledger.settle(j_volatil, marker_pattern=PATTERN, alive=always(True)),
    }
    check("los cuatro veredictos posibles, todos dentro de SETTLEMENTS",
          True, veredictos <= set(jl.SETTLEMENTS))
    check("y se vieron los cuatro", set(jl.SETTLEMENTS), veredictos)

print("== 17. DISCRIMINA: el log se ANCLA al cwd del registro, no al del lector ==")
# Episodio medido 2026-09-06: un trabajo lanzado con `cd /home/user/thyrox && …`
# escribió su salida en una ruta RELATIVA; el lector la buscó con la misma ruta
# relativa desde `/home/user/kaupamex-docs` y no halló nada. Se leyó ese nada
# como «el comando no produjo salida» —el archivo tenía 141 559 bytes— y de ahí
# salió un diagnóstico falso (`AP-5`, el `| tail`). El defecto no está en el
# pipe: una ruta relativa se resuelve contra el cwd de QUIEN LA USA, y aquí el
# escritor y el lector tienen cwd distintos.
#
# El ledger es el punto donde la ambigüedad se puede cerrar de una vez: si
# `register` ancla la ruta al cwd del registro, todo lector posterior —barrera,
# `pending`, el Stop gate, una persona— recibe una ruta que no depende de dónde
# esté parado.
with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)
    (raiz / "escritor").mkdir()
    (raiz / "lector").mkdir()
    log_real = raiz / "escritor" / "salida.log"
    log_real.write_text("EXIT=0\n")

    previo = os.getcwd()
    try:
        os.chdir(raiz / "escritor")
        ledger = jl.JobLedger(raiz / "ledger")
        job = ledger.register("relativo", Path("salida.log"), pid=1)
        check("register() devuelve una ruta absoluta", True, job.log.is_absolute())

        # El lector cambia de directorio: es el caso real, no uno fabricado.
        os.chdir(raiz / "lector")
        recuperado = ledger.jobs()[0]
        check("y el ledger la sigue dando absoluta tras releerla",
              True, recuperado.log.is_absolute())
        check("apunta al archivo que el escritor creó",
              log_real.read_text(), recuperado.log.read_text())
        check("por eso el marcador se ve desde el otro cwd (control de anulación: "
              "con la ruta relativa, esto daría 'bailed')",
              "collected",
              ledger.settle(recuperado, marker_pattern=PATTERN,
                            alive=always(False)))
    finally:
        os.chdir(previo)

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
