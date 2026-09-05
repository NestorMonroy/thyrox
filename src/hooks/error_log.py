#!/usr/bin/env python3
"""Registro compartido de fallos de subprocess en hooks — con su salida inyectada.

Porte de ``kaupamex-docs: .claude/hooks/hook_error_log.py`` a THYROX. La razón
del mecanismo no cambia y se conserva de la fuente: cada invocación se registra
con éxito o fallo explícito, nunca se deja escapar como excepción ni se descarta
en silencio. Antes de la pieza original, ``inject_auto_recall.py`` y
``register_agent_session.py`` hacían ``subprocess.run(..., capture_output=True)``
sin inspeccionar jamás ``returncode``: un fallo real —base bloqueada, salida 1
por identificador inexistente, timeout— se veía idéntico a un éxito silencioso
desde fuera. Ver ``H-DOCS-165``. A su vez la fuente adapta el patrón
``report("tool_call", {...})`` de ``TencentDB Agent Memory: index.ts:352-480``.

Log crudo, gitignored — mismo criterio que ``registro-de-agentes.md`` y
``delta-de-agentes.md``: NUNCA se imprime a ``stdout`` (el canal de salida JSON
de los hooks) ni se deja propagar una excepción hacia el llamador.

Qué cambia respecto de la fuente, y por qué
-------------------------------------------

Una sola divergencia, y responde a un defecto medido, no a una preferencia.

**``_RESULTS_DIR`` deja de ser una constante derivada de ``__file__`` y pasa a
ser ``results_dir()``, que LEE su parámetro y REHÚSA si no lo encuentra.** La
fuente lo resolvía así::

    _RESULTS_DIR = Path(__file__).resolve().parent.parent / "agent-results"

Medido en ``H-DOCS-1080``, eso da ``kaupamex-docs/.claude/agent-results/`` —
correcto mientras el archivo viva en ``kaupamex-docs/.claude/hooks/``, y
silenciosamente equivocado en cuanto se mude: en THYROX escribiría en el árbol
de THYROX, y el drenador del carrete —que vive en kaupamex— dejaría de verlo. El
cierre de dependencia del archivo está limpio; su **directorio de salida** es un
parámetro.

Es DEC-04 en su forma más pequeña: *un vocabulario viaja; una ruta se inyecta*.
El canal es el mismo que ``paths.reach`` ya usa —variable de proceso, después
``.env``— y se reusa en vez de reimplementarse: dos analizadores de ``.env``
serían la segunda fuente de verdad que ``calibration-verified-numbers.md``
prohíbe.

**El rehúse es ruidoso, no mudo, y ésa es la mitad que hace al control
discriminar.** Un default cualquiera —el de ``__file__`` o un temporal— haría
que el hook «registre» donde nadie mira: verde falso. Un rehúse en silencio
haría que «no hubo fallos» y «no pude registrar» se vieran igual: el otro verde
falso, que es el sub-patrón D de ``metrica-decide-la-conclusion.md``. Por eso
``_append`` y ``_spool`` siguen sin lanzar hacia el llamador —el hook no se
puede romper— pero avisan por ``stderr`` nombrando la variable ausente.

El carrete (``spool=True``) — el evento sobrevive al fallo
-----------------------------------------------------------

El log de prosa deja **constancia** del fallo y pierde el **evento**: el ``cmd``
se escribe concatenado con espacios, así que un argumento con espacios ya no se
puede reconstruir. Para avisar a un humano basta; para reintentar la escritura,
no.

``heng: part7/ch29.md`` §29.3 (*disk-persistent retry*) resuelve lo mismo en el
pipeline de telemetría de Claude Code: el evento que no se pudo entregar se
apenda a un archivo, y al arrancar se relee y se retransmite. Con ``spool=True``
esta función hace eso — apenda el ``cmd`` **como lista JSON**, reproducible tal
cual, y el drenador del repo consumidor lo reenvía en el siguiente arranque.

Dos topes, y los dos existen porque un carrete sin límite es peor que el evento
perdido que evita:

- ``HOOK_SPOOL_MAX_ENTRIES`` — un fallo sistemático (store corrupto, disco
  lleno) produciría una entrada por subagente, sin fin. Al alcanzarlo se deja de
  apendar y el descarte queda en el log de prosa.
- ``HOOK_SPOOL_MAX_ATTEMPTS`` — un evento irreenviable no se reintenta para
  siempre. Es el ``EGAVEUP`` de ``ccb: bgDaemon.ts:599-604`` adaptado. **Lo
  consume el drenador, no esta pieza**: aquí sólo se nombra para que quien lea
  el mecanismo entero sepa dónde vive su otra mitad.

Los dos se fijan por entorno para que las pruebas ejerciten el tope sin fabricar
el volumen que lo dispara en producción.

Métrica: los símbolos de la fuente, portados uno a uno.
Ciega a: si el directorio declarado es escribible — ``results_dir()`` resuelve la
ruta, y quien no pueda escribirla se entera por el aviso de ``_append``.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import os
import subprocess
import sys

# El módulo se importa como ``hooks.error_log`` (con ``src`` en la ruta) y
# también se ejecuta como guion, donde ``sys.path[0]`` es ``src/hooks`` y
# ``paths`` no resolvería. La composición va ANTES del import a propósito; el
# import sigue siendo de nivel de módulo, que es lo que ``no-lazy-imports.md``
# exige.
if __package__ in (None, ""):  # sólo en invocación directa
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paths import reach  # noqa: E402  (la ruta se compone arriba, a propósito)

#: Las grafías del directorio de salida, EN ORDEN. Gana la primera declarada.
#:
#: Mismo criterio y mismo orden que ``reach.TREE_ROOT_VARS``: primero la que
#: nombra al lector —la forma que el binario de la referencia usa para sus
#: propias variables—, después la heredada, que tendrá consumidores vivos en
#: kaupamex el día que migren.
RESULTS_DIR_VARS: tuple[str, ...] = ("THYROX_RESULTS_DIR", "KAUPAMEX_RESULTS_DIR")

#: Los dos artefactos que el mecanismo escribe, con el nombre de la fuente. Se
#: conservan verbatim: el drenador del repo consumidor los busca por nombre.
LOG_NAME = "errores-hooks.md"
SPOOL_NAME = "carrete-store.jsonl"

#: La anulación puntual del carrete, tal como la fuente la declara. Se conserva
#: sin prefijo de producto porque su consumidor es la suite del repo que
#: hospeda, no THYROX.
SPOOL_PATH_VAR = "HOOK_SPOOL_PATH"
SPOOL_MAX_ENTRIES_VAR = "HOOK_SPOOL_MAX_ENTRIES"
SPOOL_MAX_ENTRIES_DEFAULT = 500


class ResultsDirError(RuntimeError):
    """El directorio de salida no está declarado.

    Es un tipo propio, y no un ``FileNotFoundError``, por la misma razón que
    ``reach.ReachRootError``: un consumidor debe poder distinguir «el mecanismo
    no tiene su parámetro» de «no encontré este archivo». La primera invalida
    todo registro; la segunda puede ser un dato ausente legítimo.
    """


def results_dir(start: Path | None = None) -> Path:
    """El directorio de salida declarado, o un rehúse que nombra la variable.

    NO comprueba que exista: quien escribe lo crea con ``mkdir(parents=True)``,
    igual que la fuente. Lo que sí hace es negarse a inventarlo.
    """
    for var in RESULTS_DIR_VARS:
        declared = reach.env_value(var, start)
        if declared:
            return Path(declared)
    raise ResultsDirError(
        f"el directorio de salida no está declarado. Declara "
        f"{RESULTS_DIR_VARS[0]} en el proceso o en el .env del repo que "
        "hospeda. NO se deriva de la ubicación de este archivo: derivarlo "
        "escribiría en el árbol de THYROX y el drenador del repo consumidor "
        "no lo vería nunca (H-DOCS-1080)."
    )


def log_path(start: Path | None = None) -> Path:
    """Ruta del registro de prosa. Se resuelve en cada llamada, no al importar.

    Es la corrección de la constante ``LOG_PATH`` de la fuente: una constante de
    módulo se evalúa al importar, así que un consumidor que declare la variable
    después del ``import`` no la ve, y ninguna prueba puede variarla.
    """
    return results_dir(start) / LOG_NAME


def spool_path(start: Path | None = None) -> Path:
    """Ruta del carrete. ``HOOK_SPOOL_PATH`` la redirige para las pruebas.

    Se resuelve en cada llamada, no al importar: una prueba fija la variable
    después de que el módulo ya esté cargado por su propio ``import``.
    """
    override = os.environ.get(SPOOL_PATH_VAR)
    return Path(override) if override else results_dir(start) / SPOOL_NAME


def _limit(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


def _warn(err: ResultsDirError) -> None:
    """El rehúse se oye. Es la mitad que separa «no hubo fallos» de «no medí».

    Va a ``stderr`` y nunca a ``stdout``: el canal de salida de un hook es JSON,
    y un aviso ahí lo corrompería.
    """
    print(f"error_log: {err}", file=sys.stderr)


def run_and_log(hook_name: str, cmd: list, *, spool: bool = False,
                **kwargs) -> "subprocess.CompletedProcess | None":
    """Corre ``cmd`` y registra el fallo si lo hay; nunca lanza.

    Un ``returncode`` distinto de 0, o una excepción de ``subprocess.run``
    (timeout, binario ausente), se registran igual — ambos son «la invocación no
    funcionó», con causa distinta. Devuelve ``None`` sólo cuando ni siquiera
    pudo lanzarse el proceso, para que el llamador siga su propio camino de «sin
    resultado»; en cualquier otro caso devuelve el ``CompletedProcess``,
    incluido cuando ``returncode != 0``.

    ``spool=True`` además encola el evento para reenviarlo al arrancar. Lo
    declara el LLAMADOR y no se infiere del ``cmd``: sólo quien lo invoca sabe si
    su comando es idempotente, y reenviar uno que no lo sea duplica su efecto.
    """
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    except Exception as exc:
        _append(hook_name, cmd, None, str(exc))
        if spool:
            _spool(hook_name, cmd, str(exc))
        return None
    if result.returncode != 0:
        _append(hook_name, cmd, result.returncode, result.stderr)
        if spool:
            _spool(hook_name, cmd, result.stderr)
    return result


def _spool(hook_name: str, cmd: list, detail: str) -> None:
    """Apenda el evento al carrete. Nunca lanza: el hook cierra igual."""
    try:
        destination = spool_path()
    except ResultsDirError as err:
        _warn(err)
        return
    try:
        cap = _limit(SPOOL_MAX_ENTRIES_VAR, SPOOL_MAX_ENTRIES_DEFAULT)
        if destination.exists():
            with destination.open(encoding="utf-8") as fh:
                if sum(1 for line in fh if line.strip()) >= cap:
                    _append(hook_name, cmd, None,
                            f"carrete lleno ({cap}): evento NO encolado")
                    return
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({
                "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
                "hook": hook_name,
                "cmd": [str(c) for c in cmd],
                "attempts": 0,
                "last_error": (detail or "").strip()[:500],
            }, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _append(hook_name: str, cmd: list, returncode, detail: str) -> None:
    try:
        destination = log_path()
    except ResultsDirError as err:
        _warn(err)
        return
    try:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("a", encoding="utf-8") as fh:
            fh.write(
                f"## {ts} — {hook_name}\n"
                f"- cmd: `{' '.join(str(c) for c in cmd)}`\n"
                f"- returncode: {returncode}\n"
                f"- detalle: {(detail or '').strip()[:500]}\n\n"
            )
    except Exception:
        pass


_USAGE = "uso: error_log.py <nombre-del-hook> -- <comando> [args...]"


def main(argv: list) -> int:
    """Puente para los hooks escritos en bash.

    Los hooks en Python importan ``run_and_log``; los de shell no pueden, y la
    única alternativa era ``|| true`` — que convierte el fallo en indistinguible
    del éxito, el sub-patrón D de ``metrica-decide-la-conclusion.md`` aplicado a
    un hook. Sin este puente, un hook de shell que quisiera dejar rastro tendría
    que reimplementar el registro: dos mecanismos para lo mismo, que es lo que
    esta pieza existe para evitar.

    Propaga el ``returncode`` del comando, porque el llamador lo usa para
    decidir. Devuelve 127 —el código con que un shell reporta «comando no
    encontrado»— cuando el proceso ni siquiera pudo lanzarse, y 2 cuando el uso
    es incorrecto.
    """
    if len(argv) < 3 or "--" not in argv[1:]:
        print(_USAGE, file=sys.stderr)
        return 2
    separator = argv.index("--", 1)
    hook_name, cmd = argv[0], argv[separator + 1:]
    if not hook_name or not cmd:
        print(_USAGE, file=sys.stderr)
        return 2

    result = run_and_log(hook_name, cmd)
    if result is None:
        return 127
    # La salida se reemite tal cual: el llamador la redirige como quiera, y
    # tragarla aquí rompería a cualquier hook que lea el stdout del comando.
    sys.stdout.write(result.stdout or "")
    sys.stderr.write(result.stderr or "")
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
