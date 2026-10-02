"""La frontera ejecutable de un banco: qué ítems pueden correr ahora, todos a la vez.

El controlador de continuación nació con un cursor —``next_item``: el primer ítem
sin aceptar—, y con él un banco de N tareas independientes corría de a una. Este
módulo sustituye el cursor por un CONJUNTO: todo ítem sin asentar cuyas
dependencias están aceptadas, que no corre ya, que no necesita una credencial
expuesta y que no choca con lo que está en curso. Cuántos corren de verdad lo
decide quien materializa la frontera —GNU Parallel con su anchura y la admisión
de cada unidad—, no este módulo: aquí sólo se calcula el conjunto lógico.

Los estados salen del registro del banco (``outputs/continuation.jsonl``):

- ``accepted`` y ``blocked`` (credencial expuesta) valen entre ejecuciones;
- ``failed`` (``hard_block``, ``commit-failed``) y ``running`` (``dispatched`` sin
  asentar) valen sólo desde el último ``start``: una ejecución nueva reintenta lo
  que la anterior no pudo, y lo que quedó a medias al morir no sigue «corriendo».

Funciones puras: ni disco ni procesos.
"""
from __future__ import annotations

from collections.abc import Iterable

PERMANENT_KINDS = {"accepted": "accepted", "blocked": "blocked"}
RUN_KINDS = {"hard_block": "failed", "commit-failed": "failed", "dependency_blocked": "failed"}


def item_states(log: Iterable[dict]) -> dict[str, str]:
    """El estado de cada ítem que el registro nombra: accepted, blocked, failed o running."""
    rows = list(log)
    last_start = max((index for index, row in enumerate(rows) if row.get("kind") == "start"), default=-1)
    states: dict[str, str] = {}
    for index, row in enumerate(rows):
        kind, identifier = row.get("kind"), row.get("item")
        if identifier is None:
            continue
        if kind in PERMANENT_KINDS:
            states[identifier] = PERMANENT_KINDS[kind]
        elif index > last_start and states.get(identifier) not in PERMANENT_KINDS.values():
            if kind in RUN_KINDS:
                states[identifier] = RUN_KINDS[kind]
            elif kind == "dispatched":
                states[identifier] = "running"
    return states


def _overlaps(left: tuple[str, ...], right: tuple[str, ...]) -> bool:
    """Dos rutas declaradas se pisan si una es la otra o la contiene."""
    def nested(a: str, b: str) -> bool:
        a, b = a.rstrip("/"), b.rstrip("/")
        return a == b or b.startswith(a + "/") or a.startswith(b + "/")
    return any(nested(a, b) for a in left for b in right)


def conflicts(left, right) -> bool:
    """Si dos ítems no pueden correr a la vez.

    Sólo chocan dos ítems que mutan: en el mismo checkout siempre —sus
    verificaciones verían el trabajo a medias del otro—, y en worktrees propios
    cuando sus archivos declarados se pisan, porque la integración del segundo
    no aplicaría sobre la del primero.
    """
    if not (left.mutates and right.mutates):
        return False
    if left.isolation != "worktree" and right.isolation != "worktree":
        return True
    return _overlaps(left.owned, right.owned)


def _needs_exposed(entry, exposed: set[str]) -> set[str]:
    return set(entry.secrets) & set(exposed)


def doomed_items(plan, states: dict[str, str], exposed: Iterable[str] = ()) -> list[tuple[object, str]]:
    """Ítems sin asentar que no pueden correr nunca en esta ejecución, con su motivo."""
    exposed = set(exposed)
    doomed = []
    for entry in plan:
        if states.get(entry.id) in ("accepted", "blocked", "failed", "running"):
            continue
        needed = _needs_exposed(entry, exposed)
        if needed:
            doomed.append((entry, f"credencial expuesta: {', '.join(sorted(needed))}"))
            continue
        lost = [dependency for dependency in entry.depends_on if states.get(dependency) in ("failed", "blocked")]
        if lost:
            doomed.append((entry, f"dependencia sin aceptar: {', '.join(lost)}"))
    return doomed


def runnable_items(plan, states: dict[str, str], exposed: Iterable[str] = ()) -> list:
    """La frontera: todo ítem que puede despacharse ahora, en el orden del plan."""
    exposed = set(exposed)
    in_flight = [entry for entry in plan if states.get(entry.id) == "running"]
    frontier: list = []
    for entry in plan:
        if entry.id in states:
            continue
        if _needs_exposed(entry, exposed):
            continue
        if any(states.get(dependency) != "accepted" for dependency in entry.depends_on):
            continue
        if any(conflicts(entry, other) for other in (*in_flight, *frontier)):
            continue
        frontier.append(entry)
    return frontier
