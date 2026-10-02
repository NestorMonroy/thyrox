"""El contrato de recompensa de un intento.

Orden de decisión:

1. **Compuertas duras.** Cada una es ``True`` (cumplida), ``False`` (incumplida) o
   desconocida (``None`` o ausente). Una incumplida o desconocida deja la
   recompensa en 0: lo que no se midió no se premia.
2. **Verificador.** Con todas las compuertas en ``True``, la recompensa es 1 sólo
   si el verificador del ítem aceptó. Una tarea rechazada nunca recibe éxito.
3. **Costes.** Tokens facturables, USD, latencia, reintentos y fallos de proveedor
   se registran APARTE y no mueven la recompensa; sirven para ordenar candidatos
   con la misma probabilidad de aceptación.

El orden de candidatos es lexicográfico: P(aceptado) mayor, luego tokens
facturables, USD, latencia y reintentos menores. Un coste desconocido ordena
detrás de cualquiera medido: tratarlo como cero lo premiaría por no medirse.
"""
from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass, field

REWARD_VERSION = "hard-gates-v1"

HARD_GATES = (
    "scope",
    "architecture",
    "secret_boundary",
    "red",
    "green",
    "typecheck",
    "annulment",
    "required_outputs",
    "container_identity",
)


@dataclass(frozen=True)
class RewardOutcome:
    reward: float
    accepted: bool
    failed_gates: tuple[str, ...]
    unknown_gates: tuple[str, ...]
    costs: dict = field(default_factory=dict)
    reward_version: str = REWARD_VERSION


def reward_for(gates: Mapping[str, bool | None], verifier_accepted: bool, costs: Mapping | None = None,
               required: tuple[str, ...] = HARD_GATES) -> RewardOutcome:
    """La recompensa de un intento a partir de sus compuertas y del veredicto del verificador."""
    failed = tuple(gate for gate in required if gates.get(gate) is False)
    unknown = tuple(gate for gate in required if gates.get(gate) is None)
    accepted = verifier_accepted and not failed and not unknown
    return RewardOutcome(reward=1.0 if accepted else 0.0, accepted=accepted, failed_gates=failed,
                         unknown_gates=unknown, costs=dict(costs or {}))


@dataclass(frozen=True)
class CandidateStats:
    """Lo que se sabe de un candidato para ordenarlo; ``None`` es desconocido, no cero."""

    action: str
    p_accepted: float
    billable_tokens: float | None
    usd: float | None
    latency_ms: float | None
    retries: float | None


def _known_or_last(value: float | None) -> float:
    return math.inf if value is None else value


def ranking_key(stats: CandidateStats) -> tuple[float, ...]:
    """Clave de orden ascendente: mejor candidato primero."""
    return (-stats.p_accepted, _known_or_last(stats.billable_tokens), _known_or_last(stats.usd),
            _known_or_last(stats.latency_ms), _known_or_last(stats.retries))
