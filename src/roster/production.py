"""Distinguir un trabajo que AVANZA de uno que sólo está vivo.

``job_liveness`` responde «¿sigue esta entrada dando señales?» leyendo el
``mtime`` de su transcript. Es la pregunta correcta para decidir si relanzar, y
es **ciega a lo que el trabajo produjo**: el ``mtime`` de un transcript avanza
cada vez que el agente escribe una línea — un ``grep``, una búsqueda de
herramienta, un párrafo de razonamiento. De ahí no se sigue que haya tocado el
árbol.

El defecto está escrito en el consumidor, verbatim
(``src/agents/reconcile-agents.sh:322``):

    vivo)  echo "       Su mtime avanzó durante la vigilancia. Sigue trabajando."

Medir el crecimiento del archivo y concluir «sigue trabajando» es el
sub-patrón C de ``metrica-decide-la-conclusion``: se mide el significante y se
concluye sobre el significado. Este módulo aporta el segundo eje —**qué
herramientas usó y cuáles de ellas pudieron mutar el árbol**— para que el
veredicto se emita sobre dos ejes y no sobre uno.

Por qué el nombre de la herramienta NO alcanza
-----------------------------------------------

Medido sobre el transcript de un subagente real de esta sesión: de **32**
``tool_use``, **30 son ``Bash``**, 1 ``ToolSearch`` y 1 ``SendMessage``. En
auto mode las operaciones de archivo van por shell
(``.claude/rules/operaciones-de-archivo-con-bash.md``), así que una taxonomía
que sólo mirara el nombre declararía indecidible el 94 % de la evidencia y
publicaría «sin producción» sobre un agente que escribió media docena de
archivos.

Por eso el efecto de un ``Bash`` lo decide **su comando**, y por eso la
clasificación tiene **tres** valores y no dos: hay comandos cuyo efecto este
instrumento no puede ver.

La asimetría que hace honesto al instrumento
----------------------------------------------

``classify_shell`` sólo promueve: ante evidencia de escritura devuelve
``"mutating"``; en ausencia de esa evidencia devuelve ``"undecidable"``,
**nunca** ``"read_only"``. Un ``python3 scripts/generate.py`` escribe sin
ningún verbo de shell, y leerlo como inocuo sería afirmar una ausencia desde
un instrumento que no puede verla — la misma regla que ``job_liveness`` aplica
al separar ``stalled_evident`` de ``stalled_unknown``.

Qué se inyecta (DEC-04)
------------------------

Los **eventos**. Este módulo no abre un transcript ni conoce su formato:
recibe tuplas ``(name, tool_input, age_seconds)`` que el consumidor extrae de
su sustrato — un JSONL de subagente, el log de una tarea de ``Bash``, o una
prueba que las construye a mano. La ``window`` también la fija quien llama.

*Métrica:* nombres de herramienta y, para el shell, evidencia léxica de
escritura en la cadena del comando.
*Ciega a:* lo que un intérprete escribe sin verbo de shell (queda
``undecidable``, declarado); un ``>`` dentro de comillas, que se lee como
redirección; y la diferencia entre mutar el entregable y mutar un archivo de
registro — las dos cuentan como ``mutating``. El instrumento que **sí** ve el
árbol es el delta de disco, y es complementario, no sustituible por éste.
"""
from __future__ import annotations

import re
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from .job_liveness import Diagnosis, is_alive

#: Los tres efectos que una llamada a herramienta puede tener sobre el árbol.
#: ``undecidable`` no es un hueco de la taxonomía: es el valor que impide
#: colapsar «no vi escritura» con «no escribió».
TOOL_EFFECTS = ("mutating", "read_only", "undecidable")

#: El efecto que se deriva del NOMBRE, cuando el nombre alcanza. Las que no
#: figuran caen a ``DEFAULT_EFFECT`` — una herramienta que el cliente añada
#: mañana puede escribir, y asumirla inocua sería un verde falso.
EFFECT_BY_TOOL: dict[str, str] = {
    "Write": "mutating",
    "Edit": "mutating",
    "MultiEdit": "mutating",
    "NotebookEdit": "mutating",
    "Read": "read_only",
    "Grep": "read_only",
    "Glob": "read_only",
    "ToolSearch": "read_only",
    "WebFetch": "read_only",
    "WebSearch": "read_only",
}

#: Una herramienta desconocida NO se presume inocua.
DEFAULT_EFFECT = "undecidable"

#: Las herramientas cuyo efecto lo decide su entrada, no su nombre.
SHELL_TOOLS = ("Bash", "PowerShell")

#: Verbos de shell cuya presencia es evidencia POSITIVA de escritura. La lista
#: promueve; su ausencia no degrada. ``sed`` exige ``-i`` porque ``sed -n`` es
#: el lector canónico de esta base.
SHELL_WRITE_VERBS = (
    r"\bsed\b[^|;&]*\s-i\b",
    r"\btee\b",
    r"\b(?:cp|mv|rm|rmdir|mkdir|touch|ln|install|truncate|dd|patch)\b",
    r"\bchmod\b",
    r"\bchown\b",
    r"\bgit\s+(?:add|commit|apply|restore|rm|mv|checkout|merge|rebase|stash)\b",
    r"\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|ci)\b",
    r"\b(?:pip|uv)\s+(?:install|sync|add)\b",
)

#: Una redirección: el descriptor opcional, el ``>`` (o ``>>``) y su destino.
_REDIRECTION = re.compile(r"(?P<fd>\d?)>>?\s*(?P<target>&?\S*)")

#: Destinos que NO son el árbol: el duplicado de descriptor (``2>&1``) y el
#: agujero negro. Contarlos como escritura convertiría en «productivo» a
#: cualquier ``grep ... 2>&1``.
_NON_TREE_TARGETS = ("/dev/null", "/dev/stdout", "/dev/stderr")

#: Los dos veredictos de producción. El segundo se llama
#: ``no_evidence_of_production`` y no ``not_producing`` a propósito: nombra el
#: estado del instrumento, no el del agente.
PRODUCTION_VERDICTS = ("producing", "no_evidence_of_production")

#: El 2x2 de vivacidad x producción. Cada uno pide una acción distinta:
#: ``working`` no se toca; ``alive_without_evidence`` se vigila (puede estar
#: pensando, o girando en vacío); ``stalled_after_producing`` tiene trabajo en
#: el árbol que hay que recoger ANTES de relanzar; ``stalled_without_evidence``
#: es el único donde relanzar no arriesga barrer nada.
ACTIVITY_VERDICTS = (
    "working",
    "alive_without_evidence",
    "stalled_after_producing",
    "stalled_without_evidence",
)

#: Ventana por defecto para considerar «reciente» una llamada a herramienta.
#: Misma magnitud que ``job_liveness.STALE_THRESHOLD_SECONDS`` y por la misma
#: razón —el ciclo largo del loop— pero es una constante PROPIA: la vejez de
#: un archivo y la antigüedad de la última escritura son dos preguntas, y
#: atarlas a un solo número las haría inseparables el día que una cambie.
PRODUCTION_WINDOW_SECONDS = 900


def classify_shell(command: str) -> str:
    """Decide el efecto de un comando de shell. Sólo promueve a ``mutating``.

    Devuelve ``"mutating"`` ante evidencia positiva de escritura —una
    redirección a un archivo del árbol, o un verbo de la lista— y
    ``"undecidable"`` en cualquier otro caso. **Nunca** devuelve
    ``"read_only"``: este instrumento no puede probar que un comando no
    escribió.
    """
    if not command:
        return "undecidable"
    for match in _REDIRECTION.finditer(command):
        target = match.group("target")
        if target.startswith("&"):
            continue  # 2>&1 duplica un descriptor, no toca el árbol
        if target in _NON_TREE_TARGETS:
            continue
        if target:
            return "mutating"
    for verb in SHELL_WRITE_VERBS:
        if re.search(verb, command):
            return "mutating"
    return "undecidable"


def classify_tool(name: str, tool_input: Any = None) -> str:
    """El efecto de UNA llamada: por nombre, y por comando cuando es shell."""
    if name in SHELL_TOOLS:
        command = ""
        if isinstance(tool_input, dict):
            command = tool_input.get("command") or ""
        return classify_shell(command)
    return EFFECT_BY_TOOL.get(name, DEFAULT_EFFECT)


@dataclass(frozen=True)
class Production:
    """El reparto por efecto dentro de la ventana, y la última mutación vista.

    Los tres conteos viajan juntos y ninguno se descarta al emitir el
    veredicto: un ``no_evidence_of_production`` con 30 ``undecidable`` y otro
    con 0 son estados distintos —en el primero el instrumento fue ciego treinta
    veces— y sin el conteo el lector no puede distinguirlos.
    """

    mutating: int
    read_only: int
    undecidable: int
    last_mutation_age: float | None


def summarize(events: Sequence[tuple[str, Any, float]],
              *,
              window: float = PRODUCTION_WINDOW_SECONDS) -> Production:
    """Reparte por efecto los eventos DENTRO de la ventana.

    Una secuencia vacía no rehúsa: igual que ``job_liveness.sweep([])``, aquí
    el vacío describe un trabajo tranquilo, no una lista de configuración que
    alguien olvidó llenar.
    """
    counts = {effect: 0 for effect in TOOL_EFFECTS}
    last_mutation: float | None = None
    for name, tool_input, age_seconds in events:
        if age_seconds > window:
            continue
        effect = classify_tool(name, tool_input)
        counts[effect] += 1
        if effect == "mutating" and (last_mutation is None or age_seconds < last_mutation):
            last_mutation = age_seconds
    return Production(mutating=counts["mutating"],
                      read_only=counts["read_only"],
                      undecidable=counts["undecidable"],
                      last_mutation_age=last_mutation)


def verdict(production: Production) -> str:
    """``producing`` sólo con evidencia positiva; si no, se nombra el silencio."""
    return "producing" if production.mutating else "no_evidence_of_production"


def combine(diagnosis: Diagnosis, production: Production) -> str:
    """Cruza el eje de vivacidad con el de producción — cuatro acciones.

    ``is_alive`` decide la primera mitad, así que la asimetría que
    ``job_liveness`` ya fija (``stalled_unknown`` NO cuenta como vivo) se
    hereda sin repetirla aquí.
    """
    alive = is_alive(diagnosis)
    producing = verdict(production) == "producing"
    if alive:
        return "working" if producing else "alive_without_evidence"
    return "stalled_after_producing" if producing else "stalled_without_evidence"
