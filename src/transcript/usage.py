"""Cuánto costó un transcript — el uso de tokens, no de quién es cada mensaje.

Adaptación de ``kaupamex-docs: .claude/scripts/agents/medir_usage_subagentes.py``.
``transcript.messages`` ya lee el JSONL para saber QUIÉN escribió cada línea;
este módulo lo lee para la otra pregunta que la fuente respondía: **cuánto**
gastó cada línea. Medido antes de portarlo: **5 consumidores** de
``kaupamex-docs: .claude/scripts/`` leen ``usage`` del transcript
(``reconciliar_store.py``, ``costo-agente.sh``, ``backfill_agent_sessions.py``,
``medir_usage_subagentes.py``, ``agent_store.py``), cada uno con su propia
reimplementación de la extracción.

Por qué la deduplicación por ``message.id`` no es opcional
-------------------------------------------------------------

Un mensaje ``assistant`` emitido en streaming aparece varias veces en el
JSONL con el MISMO ``message.id`` y el MISMO ``message.usage`` — la
documentación oficial lo confirma desde el otro lado (``ccdoc:
cost-tracking.md``, *Understand token usage*): *"all messages in a streamed
response share the same usage"*. Sumar cada aparición cuenta ese turno tantas
veces como fragmentos tenga. Medido en la fuente que se adapta: **3880
mensajes con usage sobre 1983 ids únicos** — casi el doble. Por eso
``accumulate`` cuenta cada ``message.id`` una sola vez, sin importar cuántas
líneas lo repitan.

Un mensaje sin ``id`` no se puede deduplicar por construcción — no hay con
qué comparar la siguiente aparición. La decisión de este módulo es contarlo
igual (nunca se descarta un gasto real por falta de identificador), y queda
declarada aquí para que nadie la redescubra leyendo el código: si el
transcript trae mensajes sin ``id`` repetidos, el total puede sobre-contar.
Es una ceguera conocida, no un silencio.

Por qué los pesos NO llevan un valor por defecto
----------------------------------------------------

``medir_usage_subagentes.py:63`` declaraba una tabla de pesos con su propio
comentario de advertencia (H-DOCS-1008): en el tier
``tier_10_50_cache_read_0_25`` la caché leída NO vale una fracción fija del
input — el peso es una propiedad del **contrato de precio del modelo**, no
del transcript. Por eso ``Usage.weighted()`` RECIBE los pesos como parámetro
en vez de traerlos incrustados: este primitivo exporta el mecanismo de
acumular, no un precio (DEC-04 — thyrox exporta el mecanismo, el consumidor
decide qué hacer con él).

Por qué ``accumulate`` de CERO líneas NO rehúsa
----------------------------------------------------

``repo.pending_work.sweep([])`` rehúsa ante una lista vacía porque esa lista
es una **configuración**: una lista de repos vacía es indistinguible de
"nadie configuró nada". Aquí la premisa no aplica — ``accumulate`` no recibe
una lista de configuración, recibe líneas YA leídas de un transcript
concreto. Un transcript sin ningún ``usage`` de asistente describe un hecho
medible («este dato no gastó nada»), igual que ``roster.job_liveness.sweep([])``
no rehúsa: un roster vacío es un estado tranquilo legítimo, no una lista
olvidada. El criterio es el mismo que ese módulo ya declaró: aplicar la forma
de un primitivo a un dominio donde su premisa no se sostiene sería el error.

*Métrica:* las cuatro claves de ``message.usage`` por línea ``type: assistant``
con ``message.id`` único.
*Ciega a:* un mensaje del asistente sin ``message.id`` — se cuenta sin poder
deduplicarlo; y a si el ``usage`` que reporta el cliente es exacto, que
``origin`` (en ``transcript.messages``) tampoco verifica para la procedencia.
"""
from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

#: Los cuatro tipos de token que Anthropic factura por separado.
COMPONENTS = ("input", "cache_creation", "cache_read", "output")

#: La clave de ``message.usage`` que corresponde a cada componente.
USAGE_KEYS = {
    "input": "input_tokens",
    "cache_creation": "cache_creation_input_tokens",
    "cache_read": "cache_read_input_tokens",
    "output": "output_tokens",
}


@dataclass(frozen=True)
class Usage:
    """El uso acumulado de un transcript, en los cuatro componentes."""

    input: int
    cache_creation: int
    cache_read: int
    output: int
    messages: int  # cuántos ids únicos de message.id aportaron al acumulado

    def total(self) -> int:
        """La suma llana de los cuatro componentes, sin ponderar."""
        return self.input + self.cache_creation + self.cache_read + self.output

    def weighted(self, weights: Mapping[str, float]) -> float:
        """Combina cada componente con su peso — el que el LLAMADOR declare.

        Un componente ausente de ``weights`` pesa 0.0: no hay ningún precio
        agazapado por defecto. Ver la sección de arriba sobre por qué el peso
        es del consumidor, no del transcript.
        """
        return sum(getattr(self, component) * weights.get(component, 0.0)
                   for component in COMPONENTS)


def usage_of(message: dict) -> dict[str, int] | None:
    """El uso de una línea ``assistant``; ``None`` si no aplica.

    No aplica cuando la línea no es de tipo ``assistant``, cuando el cuerpo
    no declara ``role: assistant``, o cuando no trae ``usage`` en absoluto
    — un mensaje del asistente sin ``usage`` existe (turnos de sólo
    ``tool_use`` en algunas builds) y no es un error de lectura.

    Una clave ausente DENTRO de ``usage`` (no todos los turnos escriben
    caché) cuenta 0 para ese componente, en vez de reventar.
    """
    if message.get("type") != "assistant":
        return None
    body = message.get("message") or {}
    if body.get("role") != "assistant":
        return None
    raw_usage = body.get("usage")
    if not isinstance(raw_usage, dict):
        return None
    return {component: int(raw_usage.get(key, 0) or 0)
            for component, key in USAGE_KEYS.items()}


def accumulate(lines: Iterable[dict]) -> Usage:
    """Acumula el uso de un transcript, deduplicando por ``message.id``.

    Un ``message.id`` visto antes se salta: es un fragmento repetido del
    mismo turno en streaming, no un turno nuevo. Un mensaje sin ``id`` no se
    puede deduplicar y se cuenta igual (ver la sección de arriba).

    Cero líneas con ``usage`` da un ``Usage`` en ceros, no una excepción —
    es un resultado legítimo, no una configuración ambigua (ver la sección
    de arriba sobre por qué esto no repite el rehúso de ``pending_work``).
    """
    totals = {component: 0 for component in COMPONENTS}
    seen_ids: set[str] = set()
    counted = 0
    for line in lines:
        usage = usage_of(line)
        if usage is None:
            continue
        message_id = (line.get("message") or {}).get("id")
        if message_id is not None:
            if message_id in seen_ids:
                continue
            seen_ids.add(message_id)
        for component in COMPONENTS:
            totals[component] += usage[component]
        counted += 1
    return Usage(messages=counted, **totals)
