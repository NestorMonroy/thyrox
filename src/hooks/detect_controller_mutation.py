"""Detector PreToolUse: el controlador que modifica el producto fuera de la excepción.

El defecto que ataja
--------------------
La excepción bootstrap permite que el controlador implemente mientras no
exista una ruta local gestionada.
Cuando la ruta existe, la implementación pasa a los workers gestionados y el
controlador sólo orquesta, verifica e integra. Sin un gate, nada impide que
siga escribiendo el producto después de cerrar la excepción, sobre todo tras
una compactación que la olvide.

Qué decide
----------
La política de ejecución declarada (``src/session/execution_policy.json``):
con ``controller.implementation: managed-only`` niega escribir el producto.

- **Producto** es toda ruta del árbol, o de uno de sus worktrees de
  ``.thyrox/runtime/worktrees/``, fuera del estado (``.claude/``, ``.thyrox/``,
  ``agent-results/``): ``src/`` y ``tests/``, pero también ``.env.example``,
  ``package.json``, ``.githooks/`` y la configuración. Una ruta relativa se
  resuelve contra el ``cwd`` de la llamada.
- **Escribir** es una herramienta de escritura (``Write``, ``Edit``,
  ``MultiEdit``, ``NotebookEdit``) o, en Bash, el destino de cada segmento que
  escribe: una redirección ``>``/``>>``, los archivos de ``sed -i``,
  ``gawk -i inplace``, ``perl -i``, ``replace_literal``, ``tee``, ``cp``,
  ``mv``, ``rm``, ``truncate``, ``touch``, y el árbol de ``git apply``. Un
  ``git commit -- src/x > log`` no escribe el producto: commitear lo integrado
  sigue siendo trabajo del controlador.
- **El actor** es un worker gestionado cuando el proceso del hook lleva la
  identidad que ``headless-pool`` da a cada ítem (``THYROX_POOL_ITEM`` y
  ``THYROX_POOL_RUN_ID``, las dos): escribe dentro de su ``cwd`` —su worktree— y
  se le niega fuera de él. El cliente del controlador no lleva esas variables.

Con ``bootstrap-exception`` calla.

*Métrica:* la herramienta, el destino resuelto y la identidad del proceso.
*Ciega a:* una escritura por un programa que el comando no nombra (un guion que
escribe por dentro), y a una identidad de worker declarada en el entorno del
propio cliente. Es un gate secundario: la frontera fuerte es el worktree del
ítem y la integración (``pool_integrate``).
"""
from __future__ import annotations

import os
import re
import shlex
from collections.abc import Mapping
from pathlib import Path

from hooks.shell_text import strip_data_heredoc_bodies  # noqa: E402
from session.execution_policy import controller_may_implement  # noqa: E402

WRITE_TOOLS = frozenset({"Write", "Edit", "MultiEdit", "NotebookEdit"})

#: Lo que la sesión escribe como estado, no como producto.
STATE_TOPS = frozenset({".claude", ".thyrox", "agent-results"})

#: La identidad que `headless-pool` exporta a cada ítem (`headless-pool.sh`).
WORKER_IDENTITY = ("THYROX_POOL_ITEM", "THYROX_POOL_RUN_ID")

_ROOT = Path(__file__).resolve().parents[2]

#: Dónde viven los árboles que no son la raíz, y cuántos niveles hay hasta cada
#: uno: los worktrees de implementación (`.thyrox/runtime/worktrees/<n>`) y los
#: de los ítems del pool (`<raíz>/<corrida>/<n>`, `item_worktree.sh`).
_TREE_CONTAINERS = ((_ROOT / ".thyrox" / "runtime" / "worktrees", 1),
                    (_ROOT / ".thyrox" / "pool-worktrees", 2))

#: Programas cuyos argumentos que no son opción son archivos escritos; el
#: primero de los que llevan guion (`sed`, `gawk`, `perl`) es su programa.
_FILE_WRITERS = frozenset({"tee", "cp", "mv", "rm", "truncate", "touch", "replace_literal"})
_SCRIPTED_WRITERS = frozenset({"sed", "gawk", "perl"})
_SEGMENT_SPLIT = re.compile(r"\|\||&&|[;|\n]")
_REDIRECT = re.compile(r"(?<![0-9&<])>>?\s*([^\s;&|<>]+)")
_ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")

POLICY_DENY_NOTICE = (
    "POLÍTICA DE EJECUCIÓN — la política declarada (`controller.implementation: "
    "managed-only`, `src/session/execution_policy.json`) cerró la excepción bootstrap: "
    "el controlador orquesta, verifica e integra, pero no escribe el producto. La "
    "implementación va a un worker gestionado (`bin/headless-pool --isolation worktree` "
    "o `bin/task_continuation`) y se integra con `bin/pool_integrate`."
)


def _containers(env: Mapping[str, str]) -> list[tuple[Path, int]]:
    """Los contenedores de árboles, más la raíz de ítems que el entorno declare."""
    declared = env.get("THYROX_POOL_WORKTREES_DIR")
    return [*_TREE_CONTAINERS, *([(Path(declared), 2)] if declared else [])]


def _tree_of(path: Path, env: Mapping[str, str]) -> tuple[Path, Path] | None:
    """El árbol (raíz, worktree o ítem del pool) que contiene la ruta, y la ruta relativa a él."""
    for container, depth in _containers(env):
        try:
            inside = path.relative_to(container)
        except ValueError:
            continue
        if len(inside.parts) < depth:
            return None
        tree = container.joinpath(*inside.parts[:depth])
        return tree, path.relative_to(tree)
    try:
        return _ROOT, path.relative_to(_ROOT)
    except ValueError:
        return None


def _resolve(text: str, cwd: str | None) -> Path:
    return Path(os.path.normpath(Path(cwd or _ROOT) / text.strip("\"'")))


def is_product_path(text: str, cwd: str | None = None, env: Mapping[str, str] | None = None) -> bool:
    """¿Escribir en esta ruta es escribir el producto de la raíz o de uno de sus árboles?"""
    raw = text.strip("\"'")
    if not raw or raw.startswith("-") or raw == "/dev/null":
        return False
    located = _tree_of(_resolve(raw, cwd), os.environ if env is None else env)
    if located is None:
        return False
    _tree, relative = located
    return bool(relative.parts) and relative.parts[0] not in STATE_TOPS



def _tokens(segment: str) -> list[str]:
    try:
        return shlex.split(segment, comments=False, posix=True)
    except ValueError:
        return segment.split()


def _program(tokens: list[str]) -> tuple[str, list[str]]:
    """El programa del segmento, sin asignaciones ni `bash` delante, y sus argumentos."""
    rest = list(tokens)
    while rest and _ASSIGNMENT.match(rest[0]):
        rest.pop(0)
    if rest and rest[0] in ("bash", "sh") and len(rest) > 1 and not rest[1].startswith("-"):
        rest.pop(0)
    if not rest:
        return "", []
    return Path(rest[0]).name, rest[1:]


def _segment_targets(segment: str) -> list[str]:
    """Los destinos que escribe un segmento de Bash."""
    targets = list(_REDIRECT.findall(segment))
    program, args = _program(_tokens(_REDIRECT.sub(" ", segment)))
    operands = [a for a in args if not a.startswith("-")]
    if program == "cp":
        targets += operands[-1:]
    elif program in _FILE_WRITERS:
        targets += operands
    elif program in _SCRIPTED_WRITERS and any(a.startswith("-i") for a in args):
        targets += operands[1:]
    elif program == "gawk" and "inplace" in args:
        targets += operands[1:]
    elif program == "git" and "apply" in args:
        tree = args[args.index("-C") + 1] if "-C" in args and args.index("-C") + 1 < len(args) else "."
        targets.append(f"{tree}/*")
    return [t for t in targets if t]


def mutated_product_path(payload: dict, cwd: str | None = None,
                         env: Mapping[str, str] | None = None) -> str | None:
    """La ruta de producto que la llamada escribiría, o ``None``."""
    tool = payload.get("tool_name")
    tool_input = payload.get("tool_input") or {}
    base = cwd or payload.get("cwd") or str(_ROOT)
    if tool in WRITE_TOOLS:
        path = tool_input.get("file_path") or tool_input.get("notebook_path") or ""
        return path if isinstance(path, str) and is_product_path(path, base, env) else None
    if tool == "Bash":
        command = tool_input.get("command")
        if not isinstance(command, str):
            return None
        for segment in _SEGMENT_SPLIT.split(strip_data_heredoc_bodies(command)):
            for target in _segment_targets(segment):
                if is_product_path(target, base, env):
                    return target
    return None


def _is_worker(env: Mapping[str, str]) -> bool:
    return all(env.get(name) for name in WORKER_IDENTITY)


def _inside(target: str, cwd: str) -> bool:
    path = _resolve(target, cwd)
    return path == Path(cwd) or Path(cwd) in path.parents


def detect(payload: dict, env: Mapping[str, str] | None = None) -> dict | None:
    """La negación si el controlador escribe el producto fuera de la excepción.

    Un worker gestionado escribe en su worktree (su ``cwd``) y nada más.
    """
    environment = os.environ if env is None else env
    cwd = payload.get("cwd") or os.getcwd()
    path = mutated_product_path(payload, cwd, environment)
    if path is None or controller_may_implement():
        return None
    if _is_worker(environment) and _inside(path, cwd):
        return None
    return {"notice": f"{POLICY_DENY_NOTICE} Destino: {path}", "decision": "deny"}



if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    result = detect(json.load(sys.stdin))
    if result:
        print(json.dumps(result))
    raise SystemExit(0)
