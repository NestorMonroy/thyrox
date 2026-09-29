"""detect_library_path_invocation — invocar por ruta un módulo que tiene envoltorio.

El defecto que ataja
--------------------
``python3 src/verify/check_rst_sintaxis.py`` muere con ``ModuleNotFoundError:
paths`` porque el módulo asume ``PYTHONPATH=src`` y la resolución de
``THYROX_ROOT`` que sólo el envoltorio de ``bin/`` compone
(``trabajo-en-segundo-plano.md``, «Se invoca por el nombre corto»). El
envoltorio ya existe para ese mismo módulo —``bin/check_rst_sintaxis``—, así
que el fallo es evitable sin tocar nada más que el comando.

Cómo mide
---------
Un segmento invoca ``python3``, ``python`` o ``uv run python3``/``uv run
python`` sobre una ruta que contiene un componente ``src/`` y termina en
``.py``. El nombre del archivo, sin la extensión, es el *stem*; si
``bin/<stem>`` existe en el árbol, el aviso lo nombra. Si no existe —el
módulo es biblioteca, o no tiene envoltorio generado— calla: no hay forma
corta que ofrecer.

Ciega a: el intérprete que llega por variable o alias, y una ruta compuesta
en tiempo de ejecución (``$MOD``) que el análisis léxico no puede resolver.

Avisa, no bloquea, como sus hermanos de ``tool_use_preflight``.
"""
from __future__ import annotations

import re

from hooks.shell_text import strip_heredoc_bodies  # noqa: E402
from paths import reach  # noqa: E402

#: ``python3 <ruta>.py``, ``python <ruta>.py`` o ``uv run python3 <ruta>.py``,
#: con la ruta llevando un componente ``src/`` en algún punto.
_INVOCATION = re.compile(
    r"(?<![\w.-])(?:uv\s+run\s+)?python3?\s+"
    r"((?:[\w./-]*/)?src/[\w./-]+\.py)\b"
)


def _bin_wrapper_paths(command: str) -> list[tuple[str, str]]:
    """Las (ruta, stem) de cada invocación con un envoltorio en ``bin/``."""
    bin_dir = reach.thyrox_root() / "bin"
    found: list[tuple[str, str]] = []
    seen: set[str] = set()
    for match in _INVOCATION.finditer(command):
        path = match.group(1)
        stem = path.rsplit("/", 1)[-1][:-len(".py")]
        if stem in seen:
            continue
        if (bin_dir / stem).exists():
            seen.add(stem)
            found.append((path, stem))
    return found


def detect(payload: dict) -> str | None:
    """El aviso si el comando invoca por ruta un módulo con envoltorio en ``bin/``."""
    command = (payload.get("tool_input") or {}).get("command")
    if not isinstance(command, str) or not command.strip():
        return None
    found = _bin_wrapper_paths(strip_heredoc_bodies(command))
    if not found:
        return None
    shown = "; ".join(f"`{path}` → `bin/{stem}`" for path, stem in found[:3])
    return (
        "ENVOLTORIO DE bin/ — este comando invoca por ruta un módulo que ya "
        f"tiene envoltorio corto: {shown}. La invocación por ruta no compone "
        "`PYTHONPATH` ni resuelve `THYROX_ROOT`: medido, "
        "`python3 src/verify/check_rst_sintaxis.py` muere con "
        "`ModuleNotFoundError: paths` teniendo `bin/check_rst_sintaxis`. Usa "
        "el envoltorio."
    )


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    warning = detect(json.load(sys.stdin))
    if warning:
        print(warning)
    raise SystemExit(0)
