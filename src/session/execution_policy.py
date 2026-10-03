"""La política de ejecución declarada de este árbol (TASK-THYROX-0773).

Una sola declaración, con el esquema de
``src/packages/provider/src/cost/executionPolicy.ts``, en dos capas:

- la del REPOSITORIO, versionada en ``src/session/execution_policy.json``: la
  leen una sesión nueva, una compactación, un reinicio o un clon recién bajado;
- un override opcional, el archivo de ``THYROX_EXECUTION_POLICY``, que
  ``agent-recommend`` y ``headless-pool`` usan para la selección de modelo.

Los permisos del controlador (sección ``controller``) los fija el
repositorio y un override sólo puede ENDURECERLOS: el permiso efectivo es el
de las dos capas a la vez. Así una política de modelo antigua, sin sección
``controller``, no borra las restricciones del repositorio.

- ``controller.subagents`` — si el controlador puede despachar un subagente
  del cliente (``Agent``);
- ``controller.unmanagedPayloads`` — si puede ejecutar un payload fuera de la
  ejecución gestionada, en primer o en segundo plano;
- ``controller.implementation`` — ``bootstrap-exception`` mientras dura la
  excepción que permite al controlador implementar; ``managed-only`` cuando
  la implementación queda en los workers gestionados.

``fallback.enabled`` gobierna la selección de modelo y lo interpreta el
recomendador, no este módulo.

Falla cerrada: una política declarada que no existe o no se puede leer niega
todo lo que gobierna. Sin política del repositorio ni override, no hay nada
que restringir.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

POLICY_KEY = "THYROX_EXECUTION_POLICY"
DECLARED_POLICY = Path(__file__).resolve().parent / "execution_policy.json"
BOOTSTRAP_EXCEPTION = "bootstrap-exception"
MANAGED_ONLY = "managed-only"
_IMPLEMENTATION_MODES = (BOOTSTRAP_EXCEPTION, MANAGED_ONLY)


class UnreadablePolicyError(Exception):
    """Una política declarada que no existe o no se puede interpretar."""


def _read(path: Path) -> dict:
    try:
        policy = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise UnreadablePolicyError(f"{path}: {error}") from error
    if not isinstance(policy, dict):
        raise UnreadablePolicyError(f"{path}: la política es un objeto JSON")
    return policy


def _layers(env: dict[str, str] | None) -> list[dict]:
    """Las capas declaradas: la del repositorio si existe, y el override si se declaró."""
    layers = []
    if DECLARED_POLICY.exists():
        layers.append(_read(DECLARED_POLICY))
    declared = (os.environ if env is None else env).get(POLICY_KEY, "").strip()
    if declared:
        layers.append(_read(Path(declared)))
    return layers


def _controller_values(name: str, env: dict[str, str] | None) -> list:
    values = []
    for layer in _layers(env):
        controller = layer.get("controller")
        if controller is None:
            continue
        if not isinstance(controller, dict) or name not in controller:
            raise UnreadablePolicyError(f"controller.{name} no se declara")
        values.append(controller[name])
    return values


def _allows(name: str, env: dict[str, str] | None) -> bool:
    try:
        values = _controller_values(name, env)
    except UnreadablePolicyError:
        return False
    return all(value is True for value in values)


def subagents_allowed(env: dict[str, str] | None = None) -> bool:
    """¿Admiten las capas declaradas que el controlador despache un subagente?"""
    return _allows("subagents", env)


def unmanaged_payloads_allowed(env: dict[str, str] | None = None) -> bool:
    """¿Admiten las capas declaradas un payload fuera de la ejecución gestionada?"""
    return _allows("unmanagedPayloads", env)


def controller_may_implement(env: dict[str, str] | None = None) -> bool:
    """¿Puede el controlador modificar el producto (fuera de los workers gestionados)?

    Sí mientras dure la excepción bootstrap en todas las capas que la
    declaran; ``managed-only`` en cualquiera, un valor desconocido o una
    política ilegible lo niegan.
    """
    try:
        modes = _controller_values("implementation", env)
    except UnreadablePolicyError:
        return False
    return all(mode == BOOTSTRAP_EXCEPTION for mode in modes) and all(
        mode in _IMPLEMENTATION_MODES for mode in modes)
