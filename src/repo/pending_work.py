"""Qué repositorio deja trabajo sin publicar al cerrar el turno.

Adaptación del predicado de ``kaupamex-docs:
.claude/hooks/stop-gate-trabajo-sin-publicar.sh``. Viaja el **barrido**: por
cada repo, cuatro cuentas independientes y la lista de los que tienen alguna.
Se inyectan las **raíces** y las **etiquetas** de la prosa, que son del
consumidor (DEC-04).

El modo de fallo que ataca está medido, no supuesto: dos tandas de agentes
terminaron dejando trabajo sin commitear mientras el resumen decía «running»
(ERR-12), y un ``git commit`` que falló con *«failed to write commit object»*
encadenó un ``git log -1`` que imprimió el commit ANTERIOR — la salida parecía
éxito. Los dos comparten forma: el turno termina y el estado real diverge del
declarado.

Qué NO mide, y es deliberado
-----------------------------

No exige árbol limpio ni build verde: eso bloquearía todo turno intermedio de
trabajo normal. Señala lo que el agente probablemente cree haber publicado y no
publicó. Es la diferencia entre un gate y un estorbo.

Por qué lo ignorado no cuenta, y lo untracked sí
-------------------------------------------------

El repo **ya declara** qué es transitorio: ``--untracked-files=all`` no lista lo
ignorado. Así que un archivo untracked y no-ignorado es, por declaración del
propio repo, algo que se quiso versionar y no se versionó — que es exactamente
cómo nace la salida de un agente. La primera versión del guion no contaba nada
untracked, con su razón escrita a la vista (*«un scratch sin añadir no es
trabajo perdido»*); es correcto para un scratch y falso para un agente
(H-DOCS-311).

El ``all`` no es un detalle de forma: sin él git reporta un directorio nuevo
como **una** línea y los archivos de dentro quedan invisibles.

Por qué la lista de raíces vacía rehúsa
-----------------------------------------

Cero repos barridos y cero repos con trabajo publican la misma lista vacía.
Rehusar es lo único que los separa: es el cero silencioso de H-API-335, y aquí
cerraría el turno con trabajo sin publicar.
"""
from __future__ import annotations

import sys
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

# El módulo se importa como ``repo.pending_work`` (con ``src`` en la ruta) y
# también puede ejecutarse como guion. La composición va ANTES del import a
# propósito; el import sigue siendo de nivel de módulo.
if __package__ in (None, ""):  # sólo en invocación directa
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hooks.process import run_guarded  # noqa: E402

#: Los cuatro ejes de TRABAJO, en el orden en que se leen en la prosa del
#: consumidor. Son los que deciden si un repo entra en la lista.
WORK_FIELDS = ("dirty", "staged", "untracked", "ahead")

#: El eje de la suciedad que un hook escribe cada turno y que NO es trabajo
#: sin publicar — el store versionado es el caso medido. Se cuenta y se
#: NOMBRA, pero no dispara: una exclusión declarada por el consumidor no es
#: un punto ciego; una silenciosa sí. Ver la cabecera del módulo.
TELEMETRY_FIELD = "telemetry"

#: Todos los ejes que la prosa del consumidor tiene que etiquetar.
FIELDS = (*WORK_FIELDS, TELEMETRY_FIELD)

#: Segundos por consulta a git. Un repo con el índice bloqueado por otro
#: escritor cuelga; el gate no puede colgarse con él.
TIMEOUT = 20

#: La referencia simbólica del upstream de la rama actual.
UPSTREAM = "@{upstream}"


class EmptyRootsError(ValueError):
    """Se pidió barrer una lista de raíces vacía."""


class MissingLabelError(KeyError):
    """El consumidor no declaró la etiqueta de uno de los ejes."""


@dataclass(frozen=True)
class Pending:
    """Lo que un repo dejó sin publicar, por eje."""

    name: str
    dirty: int = 0
    staged: int = 0
    untracked: int = 0
    ahead: int = 0
    telemetry: int = 0

    def __bool__(self) -> bool:
        """Sólo los ejes de TRABAJO deciden. La telemetría viaja, no dispara.

        Si contara, un repo cuya única suciedad es el store que los hooks
        escriben cada turno bloquearía todos los turnos — y el hábito que eso
        enseña es commitear sin mirar, el contrario del que este gate existe
        para crear.
        """
        return any(getattr(self, field) for field in WORK_FIELDS)


def sweep(roots: Sequence[str],
          telemetry: Sequence[str] = ()) -> list[Pending]:
    """Los repos con trabajo sin publicar, en el orden de ``roots``.

    ``telemetry`` son rutas relativas al repo cuya suciedad NO cuenta como
    trabajo. Las declara el consumidor (DEC-04): este módulo no sabe cuál de
    sus archivos escribe un hook en cada turno, y adivinarlo por el nombre
    sería inventar la política del consumidor.
    """
    if not roots:
        raise EmptyRootsError(
            "no se declaró ninguna raíz que barrer.\n"
            "  NO se devuelve una lista vacía: se leería como «nada "
            "pendiente», que es el veredicto contrario."
        )
    found: list[Pending] = []
    for root in roots:
        path = Path(root)
        if not (path / ".git").exists():
            continue                      # no es un repo: no es un fallo
        item = _measure(path, frozenset(telemetry))
        if item:
            found.append(item)
    return found


def render(items: Sequence[Pending], labels: Mapping[str, str]) -> str:
    """Una línea por repo, con las etiquetas que el consumidor declara."""
    # Los cuatro ejes de TRABAJO se exigen siempre, aunque hoy valgan cero:
    # es un fallo temprano sobre la DECLARACIÓN del consumidor, y su valor
    # está en dispararse el primer día y no el día en que aparezca un
    # `staged`. La telemetría se exige sólo si algún item la reporta —un
    # consumidor que no la declara no tiene número que rotular, y pedirle el
    # rótulo le rompería el gate por un eje que no usa.
    exigidos = list(WORK_FIELDS)
    if any(getattr(i, TELEMETRY_FIELD) for i in items):
        exigidos.append(TELEMETRY_FIELD)
    missing = [field for field in exigidos if field not in labels]
    if missing:
        raise MissingLabelError(
            f"faltan las etiquetas de {missing}.\n"
            "  NO se rellenan por omisión: la prosa es del consumidor, y una "
            "etiqueta inventada aquí saldría en su idioma equivocado."
        )
    lines = []
    for item in items:
        parts = [f"{getattr(item, field)} {labels[field]}"
                 for field in FIELDS if getattr(item, field)]
        lines.append(f"  - {item.name}: {', '.join(parts)}")
    return "\n".join(lines)


def engine(roots: Sequence[str],
           labels: Mapping[str, str],
           telemetry: Sequence[str] = ()) -> Callable[[], tuple[int, str]]:
    """El motor en proceso que ``hooks.stop_gate.Gate`` consume.

    Devuelve ``(1, <lista>)`` cuando hay trabajo sin publicar y ``(0, "")``
    cuando no. El código y la salida coinciden a propósito: así el gate puede
    decidir por cualquiera de sus dos modos sin cambiar de lectura.
    """
    def consult() -> tuple[int, str]:
        items = sweep(roots, telemetry)
        return (1, render(items, labels)) if items else (0, "")
    return consult


def _measure(repo: Path, telemetry: frozenset[str] = frozenset()) -> Pending:
    dirty, tele_dirty = _split(repo, telemetry, "diff", "--name-only")
    staged, tele_staged = _split(repo, telemetry, "diff", "--cached", "--name-only")
    # `--untracked-files=all` para ver los ARCHIVOS y no el directorio que
    # los contiene; el `??` los distingue del resto del porcelain.
    untracked, tele_untracked = _split(repo, telemetry, "status", "--porcelain",
                                       "--untracked-files=all", prefix="?? ")
    return Pending(name=repo.name, dirty=dirty, staged=staged,
                   untracked=untracked, ahead=_ahead(repo),
                   telemetry=tele_dirty + tele_staged + tele_untracked)


def _split(repo: Path, telemetry: frozenset[str], *args: str,
           prefix: str = "") -> tuple[int, int]:
    """``(trabajo, telemetría)`` de una consulta a git.

    Se cuentan las dos mitades en el mismo recorrido a propósito: si la
    telemetría se restara del total, un repo sin ninguna daría el mismo
    número que uno cuya telemetría no se supo leer.
    """
    done = run_guarded(["git", "-C", str(repo), *args], TIMEOUT)
    if done.exit_code != 0:
        return 0, 0
    trabajo = tele = 0
    for line in done.stdout.splitlines():
        if not line.strip() or not line.startswith(prefix):
            continue
        if line[len(prefix):].strip() in telemetry:
            tele += 1
        else:
            trabajo += 1
    return trabajo, tele


def _ahead(repo: Path) -> int:
    """Commits locales por delante del upstream — 0 si no hay upstream."""
    probe = run_guarded(
        ["git", "-C", str(repo), "rev-parse", "--abbrev-ref", UPSTREAM], TIMEOUT)
    if probe.exit_code != 0:
        return 0
    done = run_guarded(
        ["git", "-C", str(repo), "rev-list", "--count", f"{UPSTREAM}..HEAD"],
        TIMEOUT)
    if done.exit_code != 0:
        return 0
    try:
        return int(done.stdout.strip())
    except ValueError:
        return 0
