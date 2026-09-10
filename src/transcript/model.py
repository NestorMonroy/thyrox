"""Qué modelo produjo cada turno — el reparto de ``usage`` por identificador.

Adaptación de ``kaupamex-docs: .claude/scripts/agents/model_catalog.py``
(``model_of_transcript``, líneas 121-137, y ``session_usage_by_model``,
líneas 242-268). Medido antes de portarlo: **0 hits** de ``message.model`` en
todo ``src/transcript`` — la única mención de «model» era prosa de un
docstring y un ejemplo de ``/model`` en una tabla de ``messages.py``. Sin esta
mitad, ``transcript.usage.Usage`` produce un total plano y no puede repartir
el gasto por modelo — el cruce que ``kaupamex-docs:
.claude/rules/model-selection-subagents.md`` publica en su tabla
«por-modelo», y la razón por la que el store de la fuente guarda el
identificador que el transcript DECLARA, nunca el alias con que se despachó:
un alias resuelve a versiones distintas según el proveedor, con tiers de
precio y ventanas distintas.

El discriminador es el PREFIJO, no una gramática de partes
-----------------------------------------------------------

Tres de los diecinueve identificadores del catálogo de la fuente ponen la
versión delante de la familia (``claude-3-5-sonnet``, ``claude-3-5-haiku``,
``claude-3-7-sonnet``); del 4 en adelante va detrás (``claude-sonnet-4-0``,
``claude-opus-5``, ``claude-fable-5-1``…). Un patrón que asuma
``claude-<familia>-<version>`` es ciego a esos tres. El único criterio, igual
que en la fuente, es el prefijo ``claude-`` — nada más.

El cubo del modelo AUSENTE — la cuarta pieza del porte
---------------------------------------------------------

Un mensaje ``assistant`` con ``usage`` real pero SIN ``message.model`` — o con
un valor que no empieza con el prefijo — no se descarta en silencio ni se
atribuye a un modelo cualquiera: gastó algo, y confundirlo con «cero de un
modelo» repite la ceguera que ``usage_source`` ya distingue en el store de la
fuente (``NULL`` = «nadie ha medido» ≠ un cero medido). Se agrupa bajo
``UNKNOWN_MODEL`` — un cubo NOMBRADO, nunca ``None`` (que en un ``dict`` de
Python es indistinguible de una clave ausente al iterar) ni la cadena vacía.

Qué se inyecta (DEC-04) y qué es mecanismo
-----------------------------------------------

Este módulo NO abre ningún archivo: recibe líneas YA leídas, igual que
``transcript.usage.accumulate`` — de dónde sale el transcript (una ruta, un
stream, un fixture de prueba) es política del consumidor, no de este
primitivo. Lo que SÍ es mecanismo, y por eso vive aquí: el discriminador del
prefijo, la deduplicación por ``message.id``, y el nombre del cubo ausente. La
lectura del propio ``usage`` NO se reimplementa — se reutiliza
``transcript.usage.usage_of`` tal cual, para no tener dos lugares que decidan
qué cuenta como gasto de un turno.

La deduplicación es GLOBAL, no por cubo
--------------------------------------------

Un ``message.id`` visto antes se salta SIN IMPORTAR en qué cubo cayó su
primera aparición — la misma garantía que ``transcript.usage.accumulate`` ya
tiene, portada tal cual (la fuente también usa un único ``seen: set`` para
todos los modelos, no uno por modelo). Un turno en streaming repite el MISMO
``id`` con el MISMO ``usage`` — y, por construcción, el mismo modelo — en
cada fragmento; deduplicar por cubo en vez de global sólo cambiaría algo ante
un ``id`` adjudicado a dos modelos distintos, un caso patológico no observado
en un transcript real. Si ocurriera, sólo la PRIMERA aparición abre su cubo:
la segunda ni siquiera llega a mirar su modelo, porque el filtro de
duplicados corre antes de agrupar (igual que en la fuente).

*Métrica:* ``message.model`` con prefijo ``claude-`` en líneas
``type: assistant`` con ``usage``, agrupado y deduplicado por ``message.id``.
*Ciega a:* un modelo de otro proveedor (no empieza con ``claude-``) — cae en
el mismo cubo ``UNKNOWN_MODEL`` que un modelo ausente, y este módulo no
distingue entre las dos causas.
"""
from __future__ import annotations

from collections.abc import Iterable

from transcript.usage import COMPONENTS, Usage, usage_of

#: El prefijo que declara un identificador real de modelo Claude. NO se
#: cambia por una gramática de partes: ver la sección de arriba.
MODEL_PREFIX = "claude-"

#: El cubo de un mensaje con usage real pero SIN modelo reconocible (ausente,
#: o de otro proveedor). Nombrado a propósito — nunca ``None`` ni ``""`` — para
#: que no se confunda con "clave ausente" al iterar el dict resultante.
UNKNOWN_MODEL = "(sin modelo declarado)"


def model_of(message: dict) -> str | None:
    """El ``message.model`` de una línea, si declara un identificador Claude real.

    ``None`` si la línea no es ``assistant``, si el cuerpo no declara
    ``role: assistant``, si ``message.model`` no es una cadena, o si esa
    cadena no empieza con ``MODEL_PREFIX`` (otro proveedor, o el campo vacío).
    """
    if message.get("type") != "assistant":
        return None
    body = message.get("message") or {}
    if body.get("role") != "assistant":
        return None
    model = body.get("model")
    if isinstance(model, str) and model.startswith(MODEL_PREFIX):
        return model
    return None


def accumulate_by_model(lines: Iterable[dict]) -> dict[str, Usage]:
    """Reparte el uso de un transcript por modelo — nunca un total plano.

    Cada línea que ``transcript.usage.usage_of`` reconoce como gasto de un
    turno se suma al cubo de su modelo (``model_of``), o a ``UNKNOWN_MODEL``
    si no declara uno reconocible. La deduplicación por ``message.id`` es
    GLOBAL — corre antes de decidir el cubo — así que un id repetido nunca
    abre un segundo cubo ni se cuenta dos veces (ver la sección de arriba).

    Cero líneas con gasto da un dict vacío, no una excepción: es un hecho
    medible («este transcript no tiene turnos de asistente»), igual que
    ``transcript.usage.accumulate`` de cero líneas da un ``Usage`` en ceros
    en vez de rehusar.
    """
    totals: dict[str, dict[str, int]] = {}
    counted: dict[str, int] = {}
    seen_ids: set[str] = set()
    for line in lines:
        usage = usage_of(line)
        if usage is None:
            continue
        message_id = (line.get("message") or {}).get("id")
        if message_id is not None:
            if message_id in seen_ids:
                continue
            seen_ids.add(message_id)
        key = model_of(line) or UNKNOWN_MODEL
        bucket = totals.setdefault(key, {component: 0 for component in COMPONENTS})
        for component in COMPONENTS:
            bucket[component] += usage[component]
        counted[key] = counted.get(key, 0) + 1
    return {key: Usage(messages=counted[key], **bucket) for key, bucket in totals.items()}
