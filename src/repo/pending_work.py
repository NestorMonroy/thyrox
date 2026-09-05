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

#: Los cuatro ejes, en el orden en que se leen en la prosa del consumidor.
FIELDS = ("dirty", "staged", "untracked", "ahead")

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

    def __bool__(self) -> bool:
        return any(getattr(self, field) for field in FIELDS)


def sweep(roots: Sequence[str]) -> list[Pending]:
    """Los repos con trabajo sin publicar, en el orden de ``roots``."""
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
        item = _measure(path)
        if item:
            found.append(item)
    return found


def render(items: Sequence[Pending], labels: Mapping[str, str]) -> str:
    """Una línea por repo, con las etiquetas que el consumidor declara."""
    missing = [field for field in FIELDS if field not in labels]
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
           labels: Mapping[str, str]) -> Callable[[], tuple[int, str]]:
    """El motor en proceso que ``hooks.stop_gate.Gate`` consume.

    Devuelve ``(1, <lista>)`` cuando hay trabajo sin publicar y ``(0, "")``
    cuando no. El código y la salida coinciden a propósito: así el gate puede
    decidir por cualquiera de sus dos modos sin cambiar de lectura.
    """
    def consult() -> tuple[int, str]:
        items = sweep(roots)
        return (1, render(items, labels)) if items else (0, "")
    return consult


def _measure(repo: Path) -> Pending:
    counts = {
        "dirty": _count(repo, "diff", "--name-only"),
        "staged": _count(repo, "diff", "--cached", "--name-only"),
        # `--untracked-files=all` para ver los ARCHIVOS y no el directorio que
        # los contiene; el `??` los distingue del resto del porcelain.
        "untracked": _count(repo, "status", "--porcelain",
                            "--untracked-files=all", prefix="?? "),
        "ahead": _ahead(repo),
    }
    return Pending(name=repo.name, **counts)


def _count(repo: Path, *args: str, prefix: str = "") -> int:
    done = run_guarded(["git", "-C", str(repo), *args], TIMEOUT)
    if done.exit_code != 0:
        return 0
    return sum(1 for line in done.stdout.splitlines()
               if line.strip() and line.startswith(prefix))


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
