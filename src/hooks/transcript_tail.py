"""La cola del transcript que el cliente pasa en ``transcript_path``, para los
detectores que miden el turno en curso sin guardar estado propio.

*Ciega a:* lo que quede antes de los últimos ``TAIL_BYTES``: un turno más largo
se mide desde su tramo final.
"""
from __future__ import annotations

import json
import os

#: Cuánto del final del transcript se lee.
TAIL_BYTES = 4 * 1024 * 1024


def tail_entries(path: str, tail_bytes: int = TAIL_BYTES) -> list[dict]:
    """Las entradas JSON de la cola; una ilegible se omite y un archivo ausente da ``[]``."""
    try:
        size = os.path.getsize(path)
        with open(path, "rb") as fh:
            fh.seek(max(0, size - tail_bytes))
            raw = fh.read().decode("utf-8", errors="replace")
    except OSError:
        return []
    lines = raw.splitlines()
    if size > tail_bytes and lines:
        lines = lines[1:]             # la primera puede venir cortada
    entries = []
    for line in lines:
        try:
            entries.append(json.loads(line))
        except ValueError:
            continue
    return entries


def is_genuine_user(entry: dict) -> bool:
    """Un mensaje escrito por el usuario: su ``content`` es texto.

    Los ``tool_result`` también llegan con ``type: user``; contarlos cortaría
    el turno en cada herramienta.
    """
    if entry.get("type") != "user":
        return False
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, str):
        return True
    return isinstance(content, list) and bool(content) and all(
        isinstance(b, dict) and b.get("type") == "text" for b in content)


def current_turn(entries: list[dict]) -> list[dict]:
    """Las entradas posteriores al último mensaje genuino del usuario."""
    last = max((i for i, e in enumerate(entries) if is_genuine_user(e)), default=-1)
    return entries[last + 1:]
