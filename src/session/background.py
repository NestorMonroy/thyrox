"""El segundo plano, ensamblado — N comandos con anchura acotada y SIN agentes.

Por que existe
--------------
Los tres primitivos del paralelo estaban portados y en verde, y **ninguno tenia
consumidor**: medido por import —no por la palabra— ``parallel`` 0,
``task_pool`` 0, ``job_ledger`` 2 (su suite y el pool). ``task_pool.run`` exige
NUEVE piezas sin default y nadie las habia ensamblado nunca, asi que el
mecanismo solo se habia ejercido contra dobles. Es capacidad muerta: el defecto
que ``flow-selection-agile.md`` describe —registrada, nunca seleccionada—.

Este modulo es el ensamblaje. Aporta las tres piezas que ``task_pool`` declara
del CONSUMIDOR y que son riesgosas de escribir a mano —el envoltorio de shell,
la sonda de vivacidad y el patron del marcador, que van apareados— y deja como
parametro lo que de verdad es politica: donde van los logs y cuanto se espera.

El paralelo NO necesita agentes, y son dos ejes distintos
---------------------------------------------------------
Medido, no supuesto:

- **Anchura de trabajo en proceso** — ``parallel.parallel()``: cualquier
  callable sobre un ``ThreadPoolExecutor``. Ningun agente de por medio.
- **Anchura de trabajo en SEGUNDO PLANO** — este modulo sobre
  ``task_pool.run``: subprocesos desprendidos. Tampoco.
- **Anchura de SUBAGENTES** — es un tercer mecanismo, del cliente
  (``CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS``), y ni siquiera se comporta igual:
  el guard del tool ``Agent`` **rechaza** el lanzamiento N+1 en vez de
  encolarlo, mientras ``parallel()`` encola.

Confundirlos lleva a despachar un agente por cada unidad de trabajo, que es la
forma cara de hacer lo que un subproceso hace gratis.

Las DOS ENTRADAS del hogar del log
-----------------------------------
Directiva del ejecutor 2026-09-06: *«todas las que requieran cablear el hogar de
algo definiendo una ruta, todas ellas la ruta tiene que ser pasada por una
CONSTANTE, y con dos entradas, ambas de entorno»*. Aqui, igual que en
``workbench/paths.py``::

    LOG_DIR_VAR          <- el VALOR       (≙ WORKER_CONFIG)
    LOG_DIR_ENV_FILE_VAR <- la RUTA del archivo que lo declara (≙ CONFIG_FILE_PATH)

Son dos VIAS de declaracion de un dato unico, no dos fuentes de verdad. Y sin
ninguna de las dos se REHUSA: un hogar de logs inventado esparce evidencia por
un arbol que el consumidor no eligio.

El **ledger** no es una segunda declaracion: vive en ``<log_dir>/ledger`` por
construccion. Un trabajo y su anotacion son la misma corrida; separarlos en dos
parametros pediria al consumidor una decision que no tiene consecuencia.

El envoltorio de shell — el hecho 5 de ``task_pool``, implementado
------------------------------------------------------------------
El marcador se escribe en un shell EXTERIOR al comando::

    nohup bash -c 'bash -c "$1"; echo EXIT=$?' _ <comando>

Si el comando llama ``exit``, solo muere el shell INTERIOR; el exterior sigue
vivo y si llega a escribir. La forma de un solo shell —``f"{cmd}; echo
EXIT=$?"``— pierde el marcador exactamente cuando el comando sale, y entonces la
barrera lo da por muerto callado. La suite mide las dos formas: sin ese control,
un verde no distingue «el envoltorio es exterior» de «el comando no salio».
"""
from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence

# Este modulo se invoca TAMBIEN como guion (`python3 src/session/background.py`,
# y asi lo ejercita su suite): sin esto, `paths` no resuelve y muere en el
# import. Es el mismo control que `hooks/stop_tests` lleva por haberlo pagado.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths.reach import ENV_FILE_VAR, env_value  # noqa: E402
from session.job_ledger import Job, JobLedger  # noqa: E402
from session.parallel import width_cap  # noqa: E402
from session.task_pool import run as pool_run  # noqa: E402

#: Entrada 1 — el valor: el hogar de los logs, declarado directamente.
LOG_DIR_VAR = "THYROX_BACKGROUND_LOG_DIR"

#: Entrada 2 — la ruta del archivo que puede declararlo. Se re-exporta del
#: localizador del ``.env`` en vez de re-declararse: escribir el nombre otra vez
#: seria la segunda fuente de verdad que este modulo existe para no tener.
LOG_DIR_ENV_FILE_VAR = ENV_FILE_VAR

#: El patron del marcador. Va APAREADO al envoltorio de ``spawn_detached``: no
#: es politica del consumidor, es la otra mitad del mismo mecanismo.
MARKER_PATTERN = "^EXIT="

#: El intervalo de sondeo, en segundos. Es el de la fuente
#: (``run-task-pool.sh:112``, ``sleep 1``), no un numero elegido aqui.
DEFAULT_INTERVAL = 1.0


class LogHomeError(Exception):
    """Se rehusa cuando el consumidor no declaro donde van sus logs."""


def log_dir(start: str | Path | None = None) -> Path:
    """El hogar declarado de los logs, o rehusar.

    NO se emite un default. Un hogar de logs es del arbol del consumidor:
    inventarlo esparce evidencia donde nadie la pidio, y —a diferencia de un
    error— no se nota hasta que alguien la busca.
    """
    declared = env_value(LOG_DIR_VAR, Path(start) if start else None)
    if declared:
        return Path(declared)
    raise LogHomeError(
        "El hogar de los logs de segundo plano no esta declarado. Es una "
        f"decision del consumidor, no de THYROX: declara {LOG_DIR_VAR} en el "
        f"proceso, o en el archivo que nombra {LOG_DIR_ENV_FILE_VAR} (por "
        "defecto el .env del arbol). Tambien se puede pasar `log_dir=` "
        "explicito. NO se emite un hogar por defecto.")


def spawn_detached(command: str, log_path: str | Path) -> int:
    """Lanza ``command`` desprendido y devuelve su pid.

    El envoltorio es el del hecho 5 (ver el docstring del modulo): el ``echo
    EXIT=$?`` vive en un shell EXTERIOR, de modo que un ``exit`` del comando no
    se lleva el marcador por delante.

    ``start_new_session=True`` es el ``disown`` de la fuente: el proceso deja de
    pertenecer al grupo del turno, asi que sobrevive a su fin. Por eso la
    admision del pool SONDEA en vez de esperar — un proceso desprendido ya no es
    hijo esperable (hecho 4 de ``task_pool``).
    """
    log_path = Path(log_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(log_path, "w") as salida:
        proceso = subprocess.Popen(
            ["bash", "-c", 'bash -c "$1"; echo EXIT=$?', "_", command],
            stdout=salida, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
            start_new_session=True)
    return proceso.pid


def pid_is_alive(pid: int) -> bool:
    """¿El trabajo de ese pid sigue CORRIENDO?

    No es un ``kill -0``, y la diferencia es la que colgó la suite. ``kill -0``
    responde «el pid existe», no «el trabajo corre»: un proceso terminado y no
    cosechado queda **zombi**, y un zombi satisface ``kill -0`` para siempre.
    La admisión del pool (hecho 4 de ``task_pool``) giraba entonces sin salida,
    esperando un hueco que nadie liberaba.

    La fuente en bash no lo sufre porque su huérfano lo adopta init y lo
    cosecha. Aquí NO: medido en este contenedor, el huérfano queda con
    ``ppid`` de un **subreaper que no cosecha** —PID 1 es ``process_api``, no un
    init— y su ``/proc/<pid>/stat`` declara estado ``Z`` indefinidamente.

    Por eso el estado se lee de ``/proc`` cuando está, y ``kill -0`` queda como
    respaldo donde no lo esté (otro sistema operativo). ``EPERM`` cuenta como
    VIVO: el proceso existe y es de otro usuario; leerlo como muerto declararía
    ``bailed`` un trabajo que sigue corriendo, que es el veredicto más caro.
    """
    estado = Path(f"/proc/{pid}/stat")
    if estado.exists():
        try:
            # El comando va entre paréntesis y puede contener espacios; el
            # estado es el campo siguiente al ÚLTIMO paréntesis de cierre.
            return estado.read_text().rsplit(")", 1)[1].split()[0] != "Z"
        except (OSError, IndexError):
            return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except (OverflowError, ValueError):
        return False
    return True


@dataclass
class BackgroundResult:
    """El resultado de una corrida, con la anchura que de verdad se aplico.

    ``width`` se publica porque cae a ``width_cap()`` cuando el llamador no la
    declara: sin publicarla, la anchura efectiva seria un dato que solo el
    modulo conoce y nadie puede citar.
    """

    verdict: str
    settlements: Mapping[str, str]
    jobs: list[Job]
    width: int
    log_dir: Path


def run(commands: Sequence[str], *, timeout: float,
        log_dir: str | Path | None = None,
        width: int | None = None,
        interval: float = DEFAULT_INTERVAL,
        label_prefix: str = "job",
        start: str | Path | None = None) -> BackgroundResult:
    """Lanza los comandos en segundo plano con anchura acotada y espera.

    ``width`` cae a ``width_cap()`` —la formula del ejecutable, con su piso—
    porque eso es lo que la fuente hace en su script consumidor
    (``run-task-pool.sh:62``, ``nproc``). ``task_pool`` no la inventa y hace
    bien: alli seria un default silencioso dentro del mecanismo; aqui es la
    decision explicita de este consumidor, publicada en el resultado.

    ``timeout`` NO cae a nada: un plazo equivocado convierte un
    ``timed_out`` en un ``settled`` aparente si es largo, y trunca la corrida
    si es corto. Es la politica que mas cuesta acertar y la que menos se puede
    adivinar.
    """
    destino = Path(log_dir) if log_dir is not None else globals()["log_dir"](start)
    ancho = width if width is not None else width_cap()
    ledger = JobLedger(destino / "ledger")
    resultado = pool_run(
        commands,
        ledger=ledger,
        spawn=spawn_detached,
        is_alive=pid_is_alive,
        log_dir=destino,
        marker_pattern=MARKER_PATTERN,
        width=ancho,
        timeout=timeout,
        interval=interval,
        label_prefix=label_prefix)
    return BackgroundResult(
        verdict=resultado.verdict, settlements=resultado.settlements,
        jobs=resultado.jobs, width=ancho, log_dir=destino)


if __name__ == "__main__":
    print(f"background: anchura por defecto {width_cap()} "
          f"(alcance medido: nproc={os.cpu_count()}; marcador {MARKER_PATTERN!r}; "
          f"intervalo {DEFAULT_INTERVAL}s)")
