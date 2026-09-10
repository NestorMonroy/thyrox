"""Hook SessionStart que resuelve cada flow de THYROX a su coordinator.

Adaptación de ``kaupamex-docs: .claude/hooks/inject-flow-selection.sh`` (73
líneas de bash). Lo que viaja es el mecanismo —los flows canónicos, la
resolución en dos pasos, y la forma de invocación que el ejecutable declara—;
lo que se inyecta es el directorio de agentes y las notas propias del
consumidor (DEC-04).

Por qué el mapa se DERIVA y no se declara
------------------------------------------

El hook no lleva registro de qué coordinators existen: los resuelve contra el
árbol en cada arranque. Una lista escrita aquí sería una segunda fuente de
verdad que nadie sincroniza —lo que ``calibration-verified-numbers.md`` prohíbe
en su corolario «una cifra que vive en código NO se transcribe a prosa»—: el
árbol gana un coordinator y el mecanismo no se entera.

Los flows canónicos sí se declaran, y no es la misma cosa: son **entrada** a
resolver, fijada por DEC-R-01, no el resultado de mirar el árbol.

Por qué la resolución tiene dos pasos
--------------------------------------

La convención de nombre —``<flow>-coordinator``— no cubre todos los casos: en el
árbol medido, ``babok`` no tiene homónimo y su coordinator es ``ba-coordinator``,
que lo declara en su descripción. El segundo paso existe por ese caso real, no
por simetría.

El homónimo **gana** sobre la coincidencia por descripción. Sin esa precedencia,
el recorrido alfabético del segundo paso podría llevarse un flow que ya tiene
dueño exacto.

Por qué el prefijo ``agent-`` es obligatorio
----------------------------------------------

La mención que despacha es ``@agent-<nombre>``: la forma sale del ejecutable
(``@agent-${attachment.agentType}``), no de la prosa del contrato, que la
escribía sin el prefijo. Sin él la mención no despacha, y el coordinator queda
declarado sin vía de invocación conocida.

Por qué un directorio ausente REHÚSA
--------------------------------------

Sin guarda, resolver sobre una ruta inexistente devuelve el mapa vacío y los
catorce flows «sin coordinator». Eso se publica como «este árbol no tiene
coordinators» y es indistinguible de «no pude mirar»: un verde que no
discrimina, el sub-patrón D de ``metrica-decide-la-conclusion.md``. Rehusar
nombrando el directorio es la conducta; el default sería el fallo.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

#: Los flows que DEC-R-01 declara. Entrada a resolver, no registro del árbol.
CANONICAL_FLOWS: tuple[str, ...] = (
    "rup", "scrum", "kanban", "tdd", "pm", "pdca", "dmaic",
    "lean", "babok", "bpa", "cp", "pps", "sp", "rm",
)

#: Grafías admitidas del directorio de agentes: la propia primero, la heredada
#: después. Misma forma que ``WATCHED_DIR_VARS`` en ``stop_tests``.
AGENTS_DIR_VARS: tuple[str, ...] = ("THYROX_AGENTS_DIR", "FLOW_SELECTION_AGENTS_DIR")

#: El prefijo que el ejecutable exige para que una mención despache.
MENTION_PREFIX = "@agent-"

#: Sufijo por el que se reconoce a un coordinator en el árbol.
COORDINATOR_SUFFIX = "-coordinator"


class AgentsDirError(RuntimeError):
    """El directorio de agentes no se declaró, o no existe."""


def _from_env(names: tuple[str, ...]) -> str | None:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value
    return None


def resolve_agents_dir(agents_dir: Path | str | None = None) -> Path:
    """El directorio de agentes, declarado o tomado del entorno. Rehúsa si falta."""
    declared = agents_dir or _from_env(AGENTS_DIR_VARS)
    if not declared:
        raise AgentsDirError(
            f"el directorio de agentes no está declarado: fija {AGENTS_DIR_VARS[0]} "
            f"(o {AGENTS_DIR_VARS[1]}) o pásalo como argumento.\n"
            "  NO se cae a un default: un mapa vacío se publica como «este árbol "
            "no tiene coordinators», que es indistinguible de «no pude mirar»."
        )
    path = Path(declared)
    if not path.is_dir():
        raise AgentsDirError(
            f"el directorio de agentes no existe: {path}\n"
            f"  Declarado por {AGENTS_DIR_VARS[0]} o por argumento. NO se resuelve "
            "sobre un árbol ausente: los catorce flows saldrían «sin coordinator»."
        )
    return path


def _describes(archivo: Path, flow: str) -> bool:
    """¿La línea ``description:`` del agente nombra al flow como PALABRA?

    Por palabra y no por subcadena: ``sp`` dentro de «responsable» haría juego
    con cualquier descripción, y ``babok`` con «BABOKISMO».
    """
    patron = re.compile(rf"^description:.*\b{re.escape(flow)}\b",
                        re.IGNORECASE | re.MULTILINE)
    try:
        return bool(patron.search(archivo.read_text(errors="replace")))
    except OSError:
        return False


def resolve_coordinator(flow: str, agents_dir: Path | str) -> str | None:
    """El coordinator de un flow: homónimo primero, descripción después."""
    carpeta = Path(agents_dir)
    homonimo = carpeta / f"{flow}{COORDINATOR_SUFFIX}.md"
    if homonimo.is_file():
        return homonimo.stem
    for archivo in sorted(carpeta.glob(f"*{COORDINATOR_SUFFIX}.md")):
        if _describes(archivo, flow):
            return archivo.stem
    return None


def resolve_all(agents_dir: Path | str,
                flows: tuple[str, ...] = CANONICAL_FLOWS) -> tuple[dict[str, str], list[str]]:
    """Reparte los flows en resueltos y sin resolver, conservando su orden."""
    resueltos: dict[str, str] = {}
    sin_resolver: list[str] = []
    for flow in flows:
        coordinator = resolve_coordinator(flow, agents_dir)
        if coordinator:
            resueltos[flow] = coordinator
        else:
            sin_resolver.append(flow)
    return resueltos, sin_resolver


def render(mapping: dict[str, str], without: list[str], *,
           evidence_note: str = "", closing_note: str = "") -> str:
    """El mensaje que el hook publica. Las notas del consumidor entran verbatim."""
    mapa = " ".join(f"{flow}→{MENTION_PREFIX}{nombre}" for flow, nombre in mapping.items())
    return (
        "THYROX — flow metodológico y su coordinator. Cada iniciativa declara su "
        "metodología en la clave ':flow:' del bloque '.. meta::' de su alcance "
        "(DEC-R-01). Con un flow declarado, su coordinator SE DESPACHA — no basta "
        f"con que exista: {evidence_note}"
        "Dos formas de invocación, ambas verificadas contra el ejecutable: la "
        f"mención '{MENTION_PREFIX}<nombre>' (el prefijo 'agent-' es obligatorio) o "
        'Agent(subagent_type="<nombre>"). Mapa flow→coordinator resuelto en este '
        f"árbol: {mapa}. "
        "Flows SIN coordinator (se cubren con skills, no con agente): "
        f"{' '.join(without)} — scrum-* para desarrollo iterativo en Sprints, "
        "kanban-* para flujo continuo de llegada continua (bugs/soporte). "
        "El coordinator lee el ':flow:' del alcance y la bitácora de "
        f"'progreso-<slug>.rst'; {closing_note}"
    )


def render_session_start(message: str) -> str:
    """El sobre que el cliente espera de un hook ``SessionStart``."""
    return json.dumps({"hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": message}})


def main(argv: list[str] | None = None) -> int:
    """Punto de entrada del hook. Sale 0 SIEMPRE: un hook no rompe el turno."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--agents-dir", default=None)
    parser.add_argument("--evidence-note", default="")
    parser.add_argument("--closing-note", default="")
    args = parser.parse_args(argv)

    try:
        carpeta = resolve_agents_dir(args.agents_dir)
    except AgentsDirError as err:
        print(f"flow_selection: {err}", file=sys.stderr)
        print("{}")
        return 0

    resueltos, sin_resolver = resolve_all(carpeta)
    print(render_session_start(render(
        resueltos, sin_resolver,
        evidence_note=args.evidence_note,
        closing_note=args.closing_note,
    )))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
