"""Pruebas de ``session.task_pool`` — N trabajos con anchura acotada.

Adaptación de ``run-task-pool.sh`` (ver el docstring de ``task_pool`` para la
referencia completa, los cinco hechos que gobiernan la forma y las dos
divergencias deliberadas). Viaja: parsear, admitir con anchura acotada,
lanzar, registrar y esperar la barrera hasta un veredicto. NO viaja: el
envoltorio de shell concreto (eso es del ``spawn`` inyectado por el
consumidor), la anchura, el timeout, el directorio de logs.

Los casos que DISCRIMINAN, y por qué:

- **10** — la razón de ser del hecho 5 (marcador en shell EXTERIOR): un
  ``spawn`` de un solo shell (``f"{cmd}; echo EXIT=$?"``) pierde el marcador
  cuando el comando llama ``exit``; el envoltorio de dos shells de la fuente
  no. Se mide con ``bash`` REAL — no es una hipótesis, es el comportamiento
  documentado del propio shell que ``run-task-pool.sh`` está evitando.
- **5** — la admisión SONDEA (hecho 4): con anchura 2 y tres comandos, el
  tercero no se lanza hasta que un ``sleep`` con efecto de lado libera un
  hueco. Sin ``_wait_for_free_slot`` el tercer ``spawn`` se llamaría de
  inmediato, violando la anchura.
- **8** — ``timed_out`` tiene prioridad sobre ``bailed`` cuando ambos ocurren
  en la misma corrida (ver ``POOL_VERDICTS`` en el módulo).

Los ledgers y los procesos son de mentira salvo en el caso 10, donde el
punto ES que el proceso sea real (bash real, exit real).

Verificación manual de la anulación (NO en esta suite, igual que el caso 7
de ``test_job_ledger.py``): se retiró a mano el ``if not filtered: raise
EmptyCommandListError(...)`` de ``task_pool.run`` y se corrió esta suite
completa. Cayeron EXACTAMENTE las dos aserciones "lanza
EmptyCommandListError" del caso 3 (una por cada entrada vacía) — ninguna
otra, incluida la de "ningún spawn se llamó" del mismo caso, que sigue en
verde porque una lista filtrada vacía nunca entra al ``for`` que llama
``spawn``, con o sin la validación. Restaurado el archivo, ``git diff
--stat`` quedó vacío. Se retiró ESTA causa y no la de ``width`` (el ejemplo
que sugirió el encargo) porque anular la validación de anchura reproduce el
mismo cuelgue infinito que la fuente tiene sin ella (``run-task-pool.sh``
sin su check en ``:82-84`` también gira para siempre con ``width=0``): no
hay forma segura de "correr la suite" con esa causa retirada — el caso 2 de
esta misma suite pasa ``width=0`` y colgaría el proceso de prueba para
siempre.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from session import job_ledger as jl  # noqa: E402
from session import task_pool as tp  # noqa: E402

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


def fake_clock(start: float = 0.0):
    """Igual que en ``test_job_ledger.py``: ``sleep`` avanza el reloj sin
    dormir de verdad, así se prueba admisión y timeout sin esperar segundos.
    """
    state = {"t": start}

    def now() -> float:
        return state["t"]

    def sleep(seconds: float) -> None:
        state["t"] += seconds

    return now, sleep


PATTERN = r"^EXIT=[0-9]+"


def make_fake_spawn(alive: dict):
    """Un ``spawn`` de mentira: asigna pids secuenciales, los marca vivos en
    ``alive`` y NO escribe nada al log — el test decide cuándo y qué escribir
    para simular que el trabajo terminó (o no).
    """
    counter = {"pid": 0}
    calls: list[tuple[str, Path]] = []

    def spawn(command: str, log: Path) -> int:
        counter["pid"] += 1
        pid = counter["pid"]
        alive[pid] = True
        calls.append((command, log))
        return pid

    return spawn, calls


def make_is_alive(alive: dict):
    def is_alive(pid: int) -> bool:
        return alive.get(pid, False)
    return is_alive


print("== 1. parse_commands — filtra vacías exactas y comentarios, "
      "NO espacios sueltos ==")
entrada = ["cmd uno", "", "# un comentario", "cmd dos", "   ", "#otro"]
check("dos comandos reales + la línea de espacios sobrevive",
      ["cmd uno", "cmd dos", "   "], tp.parse_commands(entrada))

print("== 2. width <= 0 — DISCRIMINA (hecho 2): rehúsa antes de admitir nada ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive: dict = {}
    spawn, calls = make_fake_spawn(alive)
    for anchura_mala in (0, -1):
        try:
            tp.run(["echo hola"], ledger=ledger, spawn=spawn,
                   is_alive=make_is_alive(alive), log_dir=Path(tmp) / "logs",
                   marker_pattern=PATTERN, width=anchura_mala, timeout=1,
                   interval=0.01)
            check(f"width={anchura_mala} lanza InvalidWidthError",
                  "InvalidWidthError", "no lanzó")
        except tp.InvalidWidthError:
            check(f"width={anchura_mala} lanza InvalidWidthError", True, True)
    check("ningún spawn se llamó (rehusó ANTES de admitir)", [], calls)

print("== 3. cero comandos tras filtrar — DISCRIMINA (hecho 3) ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    spawn, calls = make_fake_spawn(alive)
    for entrada_vacia in ([], ["", "# sólo comentarios", "#otro"]):
        try:
            tp.run(entrada_vacia, ledger=ledger, spawn=spawn,
                   is_alive=make_is_alive(alive), log_dir=Path(tmp) / "logs",
                   marker_pattern=PATTERN, width=2, timeout=1, interval=0.01)
            check(f"{entrada_vacia!r} lanza EmptyCommandListError",
                  "EmptyCommandListError", "no lanzó")
        except tp.EmptyCommandListError:
            check(f"{entrada_vacia!r} lanza EmptyCommandListError", True, True)
    check("ningún spawn se llamó", [], calls)

print("== 4. etiqueta, log y registro — un comando real, width amplia ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    spawn, calls = make_fake_spawn(alive)
    log_dir = Path(tmp) / "logs"
    now, sleep = fake_clock()
    resultado = tp.run(
        ["echo hola", "# se filtra", "echo mundo"],
        ledger=ledger, spawn=spawn, is_alive=make_is_alive(alive),
        log_dir=log_dir, marker_pattern=PATTERN, width=5, timeout=10,
        interval=0.01, label_prefix="probe", now=now, sleep=sleep)
    check("dos comandos filtrados llegaron a spawn (el comentario NO)",
          2, len(calls))
    check("el primero conserva su comando literal",
          "echo hola", calls[0][0])
    check("su log usa el prefijo y el índice 1-based con ceros",
          log_dir / "probe-001.log", calls[0][1])
    check("el segundo etiqueta 002 (índice sobre la lista YA filtrada)",
          log_dir / "probe-002.log", calls[1][1])
    check("dos Job registrados, en orden de lanzamiento",
          ["probe-001", "probe-002"], [j.label for j in resultado.jobs])
    check("el Job guarda el comando (divergencia declarada)",
          "echo mundo", resultado.jobs[1].command)
    check("el directorio de logs se creó", True, log_dir.is_dir())

print("== 5. anchura acotada — DISCRIMINA (hecho 4): sondea, no lanza de más ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    calls: list[tuple[str, Path]] = []

    def spawn_asienta_ya(command: str, log: Path) -> int:
        # Escribe el marcador AL LANZAR — la barrera final de `ledger.wait()`
        # resuelve los tres en su primer barrido, sin sleeps propios, así el
        # único sleep que puede aparecer es el de LA ADMISIÓN de este caso.
        pid = len(alive) + 1
        alive[pid] = True
        calls.append((command, log))
        log.write_text("EXIT=0\n")
        return pid

    now, sleep_real = fake_clock()
    sleeps: list[float] = []

    def sleep_que_libera(seconds: float) -> None:
        # Efecto de lado: al sleep, el pid MÁS ANTIGUO vivo deja de estarlo —
        # simula que ese trabajo terminó mientras se esperaba hueco.
        sleeps.append(seconds)
        sleep_real(seconds)
        pid_mas_viejo = min(p for p, v in alive.items() if v)
        alive[pid_mas_viejo] = False

    resultado = tp.run(
        ["cmd-1", "cmd-2", "cmd-3"], ledger=ledger, spawn=spawn_asienta_ya,
        is_alive=make_is_alive(alive), log_dir=Path(tmp) / "logs",
        marker_pattern=PATTERN, width=2, timeout=10, interval=0.5,
        now=now, sleep=sleep_que_libera)
    check("los tres se lanzaron (tras liberar hueco)", 3, len(calls))
    check("hubo exactamente UN sleep — el de la admisión del tercero "
          "(la barrera final no necesita ninguno: los tres ya asentaron)",
          1, len(sleeps))
    check("el sleep de admisión usó el interval inyectado", [0.5], sleeps)
    check("cmd-3 fue el tercero en lanzarse", "cmd-3", calls[2][0])
    check("y los tres verdict quedaron 'collected'", "settled", resultado.verdict)

print("== 6. verdict 'settled' — todos escriben su marcador ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    log_dir = Path(tmp) / "logs"
    log_dir.mkdir()

    def spawn_que_asienta(command: str, log: Path) -> int:
        pid = len(alive) + 1
        alive[pid] = True
        log.write_text("EXIT=0\n")
        return pid

    resultado = tp.run(
        ["ok-1", "ok-2"], ledger=ledger, spawn=spawn_que_asienta,
        is_alive=make_is_alive(alive), log_dir=log_dir,
        marker_pattern=PATTERN, width=5, timeout=10, interval=0.01)
    check("verdict == settled", "settled", resultado.verdict)
    check("los dos quedaron 'collected'",
          {"job-001": "collected", "job-002": "collected"},
          dict(resultado.settlements))

print("== 7. verdict 'bailed' — uno muere sin marcador ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    log_dir = Path(tmp) / "logs"
    log_dir.mkdir()
    logs: dict[str, Path] = {}

    def spawn_mixto(command: str, log: Path) -> int:
        pid = len(alive) + 1
        logs[command] = log
        if command == "ok":
            alive[pid] = True
            log.write_text("EXIT=0\n")
        else:
            # Ya no está vivo Y nunca escribió su marcador — el caso que
            # `bailed` existe para nombrar. Si quedara `alive=True` sin
            # marcador, `settle()` lo vería "waiting" para siempre y el
            # veredicto sería `timed_out`, no `bailed` — otro fenómeno.
            alive[pid] = False
        return pid

    now, sleep = fake_clock()
    resultado = tp.run(
        ["ok", "muere-sin-marcador"], ledger=ledger, spawn=spawn_mixto,
        is_alive=make_is_alive(alive), log_dir=log_dir,
        marker_pattern=PATTERN, width=5, timeout=10, interval=0.01,
        now=now, sleep=sleep)
    check("el que nunca escribió su marcador y no está vivo → verdict bailed",
          "bailed", resultado.verdict)

print("== 8. verdict 'timed_out' — DISCRIMINA: gana sobre 'bailed' ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    log_dir = Path(tmp) / "logs"
    log_dir.mkdir()

    def spawn_uno_se_cuelga(command: str, log: Path) -> int:
        pid = len(alive) + 1
        # 'bailed': vivo al principio, y NUNCA escribe su marcador.
        # 'cuelga': se queda vivo para siempre (nunca asienta) → timeout.
        alive[pid] = (command == "cuelga")
        return pid

    now, sleep = fake_clock()
    resultado = tp.run(
        ["bailed", "cuelga"], ledger=ledger, spawn=spawn_uno_se_cuelga,
        is_alive=make_is_alive(alive), log_dir=log_dir,
        marker_pattern=PATTERN, width=5, timeout=5, interval=1,
        now=now, sleep=sleep)
    check("con uno 'bailed' Y otro sin asentar, gana timed_out",
          "timed_out", resultado.verdict)
    check("el que se cuelga queda 'waiting' en el detalle",
          "waiting", resultado.settlements["job-002"])

print("== 9. adaptador Job→pid — el Job registrado SIEMPRE trae pid propio ==")
with tempfile.TemporaryDirectory() as tmp:
    ledger = jl.JobLedger(Path(tmp) / "ledger")
    alive = {}
    log_dir = Path(tmp) / "logs"
    log_dir.mkdir()

    def spawn_simple(command: str, log: Path) -> int:
        pid = len(alive) + 1
        alive[pid] = True
        log.write_text("EXIT=0\n")
        return pid

    resultado = tp.run(
        ["solo"], ledger=ledger, spawn=spawn_simple,
        is_alive=make_is_alive(alive), log_dir=log_dir,
        marker_pattern=PATTERN, width=1, timeout=5, interval=0.01)
    check("el único Job trae su pid", 1, resultado.jobs[0].pid)

print("== 10. DISCRIMINA (hecho 5): marcador en shell exterior, con bash REAL ==")


def spawn_un_solo_shell(command: str, log: Path) -> int:
    """MAL — un único shell. `exit N` en el comando mata TODO antes de
    llegar al `echo EXIT=$?` concatenado con `;`: el marcador se pierde.
    """
    with open(log, "w") as handle:
        proc = subprocess.Popen(
            ["bash", "-c", f"{command}; echo EXIT=$?"],
            stdout=handle, stderr=subprocess.STDOUT)
    proc.wait()
    return proc.pid


def spawn_shell_exterior(command: str, log: Path) -> int:
    """BIEN — reproduce `run-task-pool.sh:130`: el `echo EXIT=$?` vive en un
    shell EXTERIOR al que corre el comando, así que un `exit N` interno no
    se lo lleva por delante.
    """
    with open(log, "w") as handle:
        proc = subprocess.Popen(
            ["bash", "-c", 'bash -c "$1"; echo EXIT=$?', "_", command],
            stdout=handle, stderr=subprocess.STDOUT)
    proc.wait()
    return proc.pid


with tempfile.TemporaryDirectory() as tmp:
    log_roto = Path(tmp) / "roto.log"
    spawn_un_solo_shell("exit 7", log_roto)
    check("un solo shell: el comando que llama exit SE LLEVA el marcador",
          False, "EXIT=" in log_roto.read_text())

    log_bueno = Path(tmp) / "bueno.log"
    spawn_shell_exterior("exit 7", log_bueno)
    check("shell exterior: el marcador sobrevive al exit del comando",
          True, "EXIT=7" in log_bueno.read_text())

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
