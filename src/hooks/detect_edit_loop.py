"""Detector PreToolUse: el mismo archivo editado una y otra vez en un turno.

Origen: propuesta 4 del banco ``notas-ai-course-aplicables-a-thyrox-*``
(informe G1 de ``ai-course-notes``: el *doom loop* de un agente largo, que
reintenta la misma corrección sin cambiar de hipótesis). Medido al abrirla:
``rg -i 'doom.?loop|repeated.?edit' src`` daba 0.

No guarda estado propio: el turno se lee del transcript que el cliente pasa en
``transcript_path``. El corte es el último mensaje **genuino** del usuario —su
``content`` es texto—; los ``tool_result`` también llegan con ``type: user`` y
cortarían el turno en cada herramienta si se contaran.

Cuenta las ediciones de ``Edit``/``Write``/``MultiEdit``/``NotebookEdit`` por
``file_path`` y las de ``sed -i`` por su último argumento, más la que está a
punto de ocurrir. Al llegar a ``THRESHOLD`` avisa: no bloquea, porque editar
cinco veces un archivo grande puede ser legítimo; lo que pide es parar y
revisar la hipótesis.

*Ciega a:* la edición hecha con un guion (``python3 - <<EOF``, ``cat >``), cuyo
destino no se lee de la línea de comando, y al bucle repartido en varios
archivos. Lee sólo la cola del transcript (``TAIL_BYTES``): un turno más largo
que eso se mide desde su tramo final.
"""
from __future__ import annotations

import json
import os
import re
import shlex

#: Ediciones del mismo archivo en un turno a partir de las que se avisa.
THRESHOLD = 5

#: Cuánto del final del transcript se lee.
TAIL_BYTES = 4 * 1024 * 1024

_FILE_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
_SED_INPLACE = re.compile(r"(?:^|[;&|]\s*)sed\s+(?:-[a-zA-Z]*i|--in-place)")


def _target(name: str, tool_input: dict) -> str | None:
    if name in _FILE_TOOLS:
        path = tool_input.get("file_path") or tool_input.get("notebook_path")
        return path if isinstance(path, str) else None
    if name == "Bash":
        command = tool_input.get("command")
        if not isinstance(command, str) or not _SED_INPLACE.search(command):
            return None
        try:
            words = shlex.split(command.splitlines()[0])
        except ValueError:
            return None
        return words[-1] if words and not words[-1].startswith("-") else None
    return None


def _tail_entries(path: str) -> list[dict]:
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as fh:
            fh.seek(max(0, size - TAIL_BYTES))
            raw = fh.read().decode("utf-8", errors="replace")
    except OSError:
        return []
    lines = raw.splitlines()
    if size > TAIL_BYTES and lines:
        lines = lines[1:]             # la primera puede venir cortada
    entries = []
    for line in lines:
        try:
            entries.append(json.loads(line))
        except ValueError:
            continue
    return entries


def _is_genuine_user(entry: dict) -> bool:
    if entry.get("type") != "user":
        return False
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, str):
        return True
    return isinstance(content, list) and bool(content) and all(
        isinstance(b, dict) and b.get("type") == "text" for b in content)


def _turn_targets(entries: list[dict]) -> list[str]:
    last = max((i for i, e in enumerate(entries) if _is_genuine_user(e)), default=-1)
    targets = []
    for entry in entries[last + 1:]:
        if entry.get("type") != "assistant":
            continue
        for block in (entry.get("message") or {}).get("content") or []:
            if isinstance(block, dict) and block.get("type") == "tool_use":
                t = _target(block.get("name", ""), block.get("input") or {})
                if t:
                    targets.append(t)
    return targets


def detect(payload: dict) -> str | None:
    """El aviso si este archivo ya se editó ``THRESHOLD - 1`` veces en el turno."""
    target = _target(payload.get("tool_name", ""), payload.get("tool_input") or {})
    transcript = payload.get("transcript_path")
    if not target or not isinstance(transcript, str):
        return None
    count = _turn_targets(_tail_entries(transcript)).count(target) + 1
    if count < THRESHOLD:
        return None
    return (
        f"EDICIÓN EN BUCLE — `{target}` va por su edición {count} en este turno. "
        "Reintentar la misma corrección sin cambiar de hipótesis es la forma "
        "del *doom loop*: para, vuelve a medir el fallo (la salida exacta del "
        "test o del gate) y decide si la causa es la que estás corrigiendo. Si "
        "son pasos distintos de un cambio grande, ignora este aviso."
    )
