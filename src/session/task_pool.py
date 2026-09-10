"""N trabajos en segundo plano con anchura acotada — sin agentes.

Adaptación de ``run-task-pool.sh`` (``kaupamex-docs:
.claude/scripts/session/run-task-pool.sh``, 139 líneas). Ese guion existe
porque ``bg.sh`` lanza uno y ``wait-jobs.sh`` (adaptado aquí como
``job_ledger``) es la barrera de N — faltaba la pieza que reparte N comandos
entre un número acotado de huecos, sin despachar un agente por cada uno.

Viaja el MECANISMO —parsear, admitir con anchura acotada, lanzar, registrar
en el ``JobLedger`` y esperar su barrera hasta un veredicto—; NO viaja
ninguna política del consumidor: el envoltorio de bash concreto que lanza el
proceso, el patrón del marcador, la anchura misma, el directorio de logs. Ver
"Qué es PARÁMETRO" más abajo (DEC-04).

Los cinco hechos que gobiernan esta forma, y no se pueden inventar
--------------------------------------------------------------------

1. **La lista de comandos se filtra por LÍNEA, no se sanea.**
   (``run-task-pool.sh:88-94``, ``case "$c" in ''|'#'*) continue ;; esac``).
   Sólo la cadena EXACTAMENTE vacía y una línea que empieza con ``#`` se
   saltan; una línea de puros espacios no es la cadena vacía y por tanto NO
   se filtra — reproducido tal cual en ``parse_commands``, sin ``strip()``
   añadido que la fuente no tiene.

2. **Anchura ``< 1`` se rechaza ANTES de admitir nada**
   (``:82-84``, *"un 0 o un negativo colgaría el bucle de asignación sin
   decir por qué, que es peor que fallar"*). Con anchura 0, el bucle de
   admisión de la fuente (``while [ "${#VIVOS[@]}" -ge "$WIDTH" ]``) nunca
   ve una lista con MENOS de cero elementos: gira para siempre. La
   validación ANTES de admitir es la única forma de que ese defecto no se
   reproduzca aquí — no hay guardia adicional dentro del bucle porque ya no
   hace falta si nunca se entra con una anchura inválida.

3. **Cero comandos (tras filtrar) es un error de USO, no éxito silencioso**
   (``:96``, ``echo "0 comandos que lanzar — nada que medir"``). Un pool sin
   nada que lanzar no tiene barrera que esperar ni veredicto que discriminar;
   diferenciarlo de "se lanzó y todo asentó" evita que un filtrado vacío por
   error (un archivo sólo de comentarios) se lea como éxito.

4. **La admisión SONDEA — no hay ``wait -n`` (o equivalente bloqueante)**
   (``:100-114``, esp. ``:102-104``). Los trabajos se lanzan desprendidos
   (``spawn`` inyectado los ``disown``) para sobrevivir al fin del turno, y
   un proceso desprendido deja de ser hijo esperable del pool. La única vía
   es cosechar los pids que ya no responden y, si no alcanza, esperar un
   intervalo y volver a mirar — ``_wait_for_free_slot`` abajo.

5. **El marcador de cierre se escribe en un shell EXTERIOR al comando —
   y eso es responsabilidad del ``spawn`` inyectado, no de este módulo**
   (``:122-130``). La fuente construye
   ``nohup bash -c 'bash -c "$1"; echo EXIT=$?' _ "$cmd"``: si el comando
   mismo llama ``exit``, sólo muere el shell INTERIOR; el exterior sigue
   vivo y sí llega a escribir ``EXIT=``. Un ``spawn`` que concatenara
   ``f"{cmd}; echo EXIT=$?"`` en un solo shell perdería el marcador
   exactamente cuando el comando llama ``exit`` — el defecto medido en la
   fuente ("el log quedaba vacío y la barrera lo daba por muerto callado").
   Este módulo no construye NINGÚN envoltorio de shell: recibe el comando y
   la ruta del log y delega en ``spawn`` la forma de lanzarlo. La suite
   de este módulo trae un caso con un ``spawn`` real de las dos formas
   (correcta e incorrecta) para dejar la diferencia medida, no supuesta.

Qué es PARÁMETRO y no se codifica aquí dentro (DEC-04)
--------------------------------------------------------

- ``spawn`` — cómo lanzar UN comando dado su log y qué pid devuelve. El
  envoltorio de shell (el ``nohup bash -c '...'`` del hecho 5, el
  ``disown``) es enteramente del consumidor.
- ``is_alive`` — la sonda de vivacidad por pid (allá, ``kill -0``). Se
  reutiliza para la admisión Y se adapta para la barrera del ``JobLedger``
  (que espera ``Callable[[Job], bool]``, no ``Callable[[int], bool]``).
- ``ledger`` — el ``JobLedger`` sobre el que se registra y se espera; este
  módulo no crea ni posee ninguno.
- ``width``, ``timeout``, ``interval``, ``log_dir``, ``label_prefix``,
  ``marker_pattern`` — política pura del consumidor. Ninguno tiene un
  valor por defecto propio de este módulo: igual que ``JobLedger.wait``
  exige ``timeout``/``interval`` explícitos, aquí ``width`` y ``timeout``
  se exigen explícitos. La fuente resuelve su propia anchura con ``nproc``
  (``run-task-pool.sh:62``) — ESO es una decisión del script consumidor,
  no de este módulo: inventar aquí un default con ``os.cpu_count()``
  repetiría la forma sin repetir la razón (la fuente lo declara y lo puede
  sobreescribir con ``--width``; un default silencioso aquí no se vería).
- ``now``/``sleep`` — igual que en ``job_ledger.JobLedger.wait``, con el
  mismo valor por defecto (``time.monotonic``/``time.sleep``) para que la
  suite pruebe la admisión y el timeout sin dormir de verdad.

Dos divergencias deliberadas frente a la fuente, nombradas
------------------------------------------------------------

- **Un solo ``interval`` para admisión Y barrera.** La fuente hardcodea
  ``sleep 1`` dentro de ``libre_un_hueco`` (``:112``), un valor DISTINTO del
  que ``wait-jobs.sh`` usa para su propio sondeo. Aquí un solo ``interval``
  inyectado gobierna las dos esperas: no hay razón medida en la fuente para
  que difieran, y duplicar el parámetro sólo para preservar un hardcode
  fabricaría una distinción sin sustento.
- **``command=`` viaja al registrar.** La llamada de la fuente
  (``:134``, ``register "$ETIQUETA" "$LOG" "$PID"``) no pasa el comando: el
  ``Job`` ya ported admite un campo ``command`` opcional (``job_ledger.Job``)
  y guardarlo aquí es información adicional gratuita para quien lea el
  ``PoolResult`` — no contradice nada de la forma original, sólo la
  completa con un dato que el propio modelo de datos ya sostenía.
"""
from __future__ import annotations

import time
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

from session.job_ledger import Job, JobLedger

#: Los tres veredictos del pool — nunca un booleano, y nunca el exit code
#: crudo de la fuente (0/2/3): se nombran por causa, como ``SETTLEMENTS`` de
#: ``job_ledger`` y ``VERDICTS`` de ``job_liveness``.
#:
#: - ``settled``    — todos asentaron con marcador (``collected``) o fueron
#:   soltados a propósito (``forgotten``); ninguno quedó ``waiting`` ni
#:   ``bailed``. Análogo al exit 0 de la fuente.
#: - ``bailed``      — todos dejaron de esperar (nadie ``waiting``), pero al
#:   menos uno murió sin escribir su marcador. Análogo al exit 2.
#: - ``timed_out``   — venció el plazo con al menos uno todavía ``waiting``.
#:   Análogo al exit 3. Tiene prioridad sobre ``bailed``: si el plazo venció,
#:   la corrida quedó incompleta aunque OTRO trabajo ya hubiera muerto sin
#:   marcador — lo urgente para quien llama es que no terminó, no la causa
#:   adicional de uno de los pendientes.
POOL_VERDICTS = ("settled", "bailed", "timed_out")


class EmptyCommandListError(ValueError):
    """Cero comandos tras filtrar vacíos y comentarios no es éxito silencioso."""


class InvalidWidthError(ValueError):
    """Una anchura menor a 1 colgaría el bucle de admisión sin decir por qué."""


def parse_commands(lines: Sequence[str]) -> list[str]:
    """Filtra líneas vacías (cadena EXACTAMENTE vacía) y comentarios (``#``).

    Reproduce ``case "$c" in ''|'#'*) continue ;; esac``
    (``run-task-pool.sh:92``) tal cual: una línea de sólo espacios no es la
    cadena vacía y por tanto sobrevive al filtro, igual que en la fuente.
    """
    return [line for line in lines if line and not line.startswith("#")]


def _wait_for_free_slot(
    active: list[int],
    *,
    width: int,
    is_alive: Callable[[int], bool],
    sleep: Callable[[float], None],
    interval: float,
) -> list[int]:
    """Cosecha los pids que ya no responden hasta que quede un hueco.

    Sondea en vez de bloquear (hecho 4 del docstring del módulo): los
    trabajos se lanzan desprendidos y no son hijos esperables. Reproduce
    ``libre_un_hueco`` de la fuente (``run-task-pool.sh:105-114``): en cada
    vuelta se recalcula la lista de vivos ANTES de decidir si sobra hueco o
    hay que esperar otro intervalo.
    """
    while len(active) >= width:
        active = [pid for pid in active if is_alive(pid)]
        if len(active) >= width:
            sleep(interval)
    return active


@dataclass(frozen=True)
class PoolResult:
    """El resultado de una corrida completa: veredicto + la evidencia detrás.

    ``settlements`` es EXACTAMENTE lo que devolvió ``JobLedger.wait()`` — el
    veredicto por etiqueta que sustenta ``verdict``. ``jobs`` es la lista de
    trabajos registrados en el orden en que se lanzaron (uno por comando
    filtrado), para que quien llama pueda correlacionar etiqueta ↔ comando
    ↔ log sin reconstruir nada.
    """

    verdict: str
    settlements: Mapping[str, str]
    jobs: list[Job]


def run(
    commands: Sequence[str],
    *,
    ledger: JobLedger,
    spawn: Callable[[str, Path], int],
    is_alive: Callable[[int], bool],
    log_dir: Path,
    marker_pattern: str,
    width: int,
    timeout: float,
    interval: float,
    label_prefix: str = "job",
    now: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> PoolResult:
    """Lanza los comandos filtrados con anchura acotada y espera la barrera.

    Reproduce, en este orden, los cinco pasos declarados en el mensaje que
    encargó este porte:

    1. Filtrar ``commands`` con ``parse_commands`` (hecho 1). Si no queda
       ninguno, ``EmptyCommandListError`` (hecho 3).
    2. Validar ``width >= 1`` ANTES de admitir nada (hecho 2).
    3. Por cada comando filtrado, en orden: esperar un hueco
       (``_wait_for_free_slot``, hecho 4), calcular su etiqueta
       (``f"{label_prefix}-{índice:03d}"``, 1-based sobre la lista YA
       filtrada — igual que la fuente, que sólo incrementa ``i`` dentro del
       ``for`` sobre ``COMANDOS`` ya filtrado) y su log
       (``log_dir/etiqueta.log``), lanzarlo con ``spawn`` (hecho 5) y
       registrarlo en ``ledger``.
    4. Esperar la barrera del ``ledger`` — el ``alive`` que se le pasa
       adapta ``is_alive`` (por pid) al ``Callable[[Job], bool]`` que
       ``JobLedger.wait`` exige.
    5. Traducir el diccionario de asentamientos en UNO de ``POOL_VERDICTS``.
    """
    filtered = parse_commands(commands)
    if not filtered:
        raise EmptyCommandListError(
            "0 comandos que lanzar tras filtrar vacíos y comentarios — "
            "nada que medir")
    if width < 1:
        raise InvalidWidthError(
            f"width debe ser un entero >= 1 (dado: {width!r})")

    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    active: list[int] = []
    jobs: list[Job] = []
    for index, command in enumerate(filtered, start=1):
        active = _wait_for_free_slot(
            active, width=width, is_alive=is_alive,
            sleep=sleep, interval=interval)
        label = f"{label_prefix}-{index:03d}"
        log_path = log_dir / f"{label}.log"
        pid = spawn(command, log_path)
        job = ledger.register(label, log_path, pid=pid, command=command)
        jobs.append(job)
        active.append(pid)

    def job_alive(job: Job) -> bool:
        # task_pool SIEMPRE registra con pid (línea de arriba, `pid=pid`),
        # así que la barrera nunca ve un Job de este pool sin pid propio.
        assert job.pid is not None, "task_pool siempre registra con pid"
        return is_alive(job.pid)

    settlements = ledger.wait(
        marker_pattern=marker_pattern, alive=job_alive,
        timeout=timeout, interval=interval, now=now, sleep=sleep)

    if any(v == "waiting" for v in settlements.values()):
        verdict = "timed_out"
    elif any(v == "bailed" for v in settlements.values()):
        verdict = "bailed"
    else:
        verdict = "settled"

    return PoolResult(verdict=verdict, settlements=settlements, jobs=jobs)
