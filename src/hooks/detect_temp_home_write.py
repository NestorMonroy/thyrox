"""detect_temp_home_write — escribir en ``/tmp`` teniendo hogares declarados.

El defecto que ataja
--------------------
El ``.env`` del proveedor declara dónde va cada cosa que una sesión produce:
``THYROX_WORKBENCH_DIR`` la evidencia de un banco, ``THYROX_CACHE_DIR`` lo que
se puede regenerar y ``THYROX_BACKGROUND_LOG_DIR`` los logs. Lo que se escribe
en ``/tmp`` —el *scratchpad* de la sesión incluido— muere con el contenedor,
ningún commit lo ve y ningún gate lo mide. Episodio de 2026-09-23: listas de
archivos, una copia del store, punteros entre pasos y dos ``git worktree``
fueron a parar al scratchpad, y los worktrees, al heredar el ``.env``
versionado, reescribieron el ``bin/`` del clon real (H-THYROX-163).

Qué cuenta como escribir
------------------------
El destino de ``>``/``>>``, de ``tee``, de ``mkdir``, el último argumento de
``cp``/``mv`` y la ruta de ``git worktree add``. Una variable asignada en el
mismo comando a una ruta de ``/tmp`` (``S=/tmp/...; ... > $S/x``) se resuelve
antes de decidir. **Leer** de ``/tmp`` no avisa: así se leen las salidas de las
tareas del cliente.

Ciega a: una escritura hecha por un programa (``python -c "open('/tmp/x','w')"``)
y una variable asignada en otro comando. Mide la sintaxis del shell, no lo que
cada programa hace con sus argumentos.

Avisa, no bloquea, como sus hermanos de ``pretooluse_dispatch``.
"""
from __future__ import annotations

import re
import shlex

TEMP_ROOT = "/tmp/"

_ASSIGNMENT = re.compile(r"""(?:^|[\s;&|])([A-Za-z_][A-Za-z0-9_]*)=(["']?)(/tmp/[^\s;&|"']*)\2""")
_REDIRECT = re.compile(r"""(?<![<>&0-9])>{1,2}(?!&)\s*(["']?[^\s;&|"'<>]+["']?)""")
_SEGMENT = re.compile(r"\|\||&&|[;|\n]")
_VARIABLE = re.compile(r"\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?")


def _assignments(command: str) -> dict[str, str]:
    return {name: value for name, _quote, value in _ASSIGNMENT.findall(command)}


def _resolve(token: str, variables: dict[str, str]) -> str:
    token = token.strip("'\"")
    return _VARIABLE.sub(lambda m: variables.get(m.group(1), m.group(0)), token)


def _tokens(segment: str) -> list[str]:
    try:
        return shlex.split(segment)
    except ValueError:
        return segment.split()


def _targets(command: str) -> list[str]:
    """Los destinos de escritura que la sintaxis del comando declara."""
    targets = list(_REDIRECT.findall(command))
    for segment in _SEGMENT.split(command):
        words = [w for w in _tokens(segment) if not re.fullmatch(r"[A-Za-z_]\w*=.*", w)]
        if not words:
            continue
        program, args = words[0], words[1:]
        plain = [a for a in args if not a.startswith("-")]
        if program == "tee":
            targets += plain
        elif program == "mkdir":
            targets += plain
        elif program in ("cp", "mv") and len(plain) >= 2:
            targets.append(plain[-1])
        elif program == "git" and args[:2] == ["worktree", "add"]:
            rest = [a for a in args[2:] if not a.startswith("-")]
            if rest:
                targets.append(rest[0])
    return targets


def writes_to_temp(command: str) -> bool:
    """¿Alguno de los destinos de escritura cae bajo ``/tmp``?"""
    variables = _assignments(command)
    return any(_resolve(t, variables).startswith(TEMP_ROOT) for t in _targets(command))


def detect(payload: dict) -> str | None:
    """El aviso si el comando escribe en ``/tmp``."""
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or TEMP_ROOT not in command:
        return None
    if not writes_to_temp(command):
        return None
    return (
        "HOGAR DECLARADO — este comando escribe en `/tmp`, que muere con el "
        "contenedor y ningún commit ve (H-THYROX-163). El `.env` declara dónde "
        "va cada cosa: la evidencia de un banco en `THYROX_WORKBENCH_DIR`, lo "
        "regenerable en `THYROX_CACHE_DIR` y los logs en "
        "`THYROX_BACKGROUND_LOG_DIR`. Una copia del árbol (`git worktree`) "
        "fuera del clon además hereda el `.env` versionado y actúa sobre el "
        "clon original."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
