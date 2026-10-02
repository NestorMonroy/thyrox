"""El registro de experiencia (S, A, R, S') de un intento, versionado y sin secretos.

- **S** (``DecisionState``): sólo lo que se conocía ANTES de elegir: clase de la
  tarea, ítem, intento, acciones permitidas y resultados previos del ítem.
- **A** (``Action``): el candidato elegido y su proveedor.
- **R**: la recompensa del contrato de ``reward`` (1 aceptado, 0 en otro caso).
- **S'**: el estado tras el intento; acumula su resultado y avanza el intento.

Los costes (tokens, latencia, reintentos) viajan aparte de la recompensa, en
``costs``. Ningún nombre ni valor con forma de credencial entra al registro:
``to_record`` rehúsa antes de serializar.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, replace

SCHEMA_VERSION = 1

#: Nombres de variable de entorno que declaran una credencial; una clave camelCase
#: como ``billableTokens`` no es un nombre de variable y no cuenta.
SECRET_NAME_PATTERN = re.compile(r"^[A-Z0-9_]*(TOKEN|KEY|PASSWORD|SECRET|_PAT|CREDENTIAL)[A-Z0-9_]*$")
#: Valores con forma de clave de API o de token de registro.
SECRET_VALUE_PATTERN = re.compile(r"(sk-[A-Za-z0-9_-]{20,}|dckr_pat_[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|"
                                  r"-----BEGIN [A-Z ]*PRIVATE KEY-----)")


class SecretInExperienceError(ValueError):
    """Una experiencia lleva algo con forma de credencial."""


class UnsupportedSchemaError(ValueError):
    """Un registro de otra versión de esquema."""


@dataclass(frozen=True)
class DecisionState:
    task_class: str
    item_id: str
    task_id: str
    attempt: int
    allowed_actions: tuple[str, ...]
    prior_outcomes: tuple[str, ...] = ()

    def after(self, outcome: str) -> DecisionState:
        """El estado siguiente: el resultado se acumula y el intento avanza."""
        return replace(self, attempt=self.attempt + 1, prior_outcomes=(*self.prior_outcomes, outcome))

    def to_record(self) -> dict:
        return {"taskClass": self.task_class, "itemId": self.item_id, "taskId": self.task_id, "attempt": self.attempt,
                "allowedActions": list(self.allowed_actions), "priorOutcomes": list(self.prior_outcomes)}

    @classmethod
    def from_record(cls, record: dict) -> DecisionState:
        return cls(task_class=record["taskClass"], item_id=record["itemId"], task_id=record["taskId"],
                   attempt=record["attempt"], allowed_actions=tuple(record["allowedActions"]),
                   prior_outcomes=tuple(record["priorOutcomes"]))


@dataclass(frozen=True)
class Action:
    model: str
    provider: str | None = None


@dataclass(frozen=True)
class Experience:
    state: DecisionState
    action: Action
    reward: float
    accepted: bool
    outcome: str
    next_state: DecisionState
    policy_version: str
    reward_version: str
    costs: dict = field(default_factory=dict)

    def to_record(self) -> dict:
        record = {
            "schemaVersion": SCHEMA_VERSION,
            "policyVersion": self.policy_version,
            "rewardVersion": self.reward_version,
            "state": self.state.to_record(),
            "action": {"model": self.action.model, "provider": self.action.provider},
            "reward": self.reward,
            "accepted": self.accepted,
            "outcome": self.outcome,
            "nextState": self.next_state.to_record(),
            "costs": dict(self.costs),
        }
        assert_secret_free(record)
        return record

    @classmethod
    def from_record(cls, record: dict) -> Experience:
        if record.get("schemaVersion") != SCHEMA_VERSION:
            raise UnsupportedSchemaError(f"esquema {record.get('schemaVersion')!r}; se lee {SCHEMA_VERSION}")
        return cls(state=DecisionState.from_record(record["state"]),
                   action=Action(model=record["action"]["model"], provider=record["action"]["provider"]),
                   reward=record["reward"], accepted=record["accepted"], outcome=record["outcome"],
                   next_state=DecisionState.from_record(record["nextState"]),
                   policy_version=record["policyVersion"], reward_version=record["rewardVersion"],
                   costs=dict(record["costs"]))


def assert_secret_free(value, path: str = "") -> None:
    """Recorre el registro y rehúsa ante un nombre o un valor con forma de credencial; nunca repite el valor."""
    if isinstance(value, dict):
        for key, inner in value.items():
            if SECRET_NAME_PATTERN.search(str(key)):
                raise SecretInExperienceError(f"{path}{key}: nombre de credencial")
            assert_secret_free(inner, f"{path}{key}.")
    elif isinstance(value, (list, tuple)):
        for index, inner in enumerate(value):
            assert_secret_free(inner, f"{path}{index}.")
    elif isinstance(value, str) and SECRET_VALUE_PATTERN.search(value):
        raise SecretInExperienceError(f"{path.rstrip('.')}: valor con forma de credencial")
