"""El uso de tokens de un intento delegado, con su procedencia.

Fuentes, en orden de autoridad:

1. ``result``: la línea ``type == "result"`` del stream-json de ``thyrox -p``. Sólo
   existe si el proceso terminó por su cuenta: el stream-json se escribe al
   final.
2. ``transcript``: los mensajes ``assistant`` del transcript que ``thyrox -p``
   persiste turno a turno; sobrevive a un trabajador que muere a mitad.
3. ``unavailable``: ninguna de las dos. Los campos quedan en ``None``: un cero
   afirmaría que no se gastó nada, y eso no se midió.

``billableTokens`` es entrada + escritura de caché + salida. La lectura de caché
va aparte (``cachedInputTokens``) porque los proveedores la tarifan distinto; el
precio en USD no se calcula aquí.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

USAGE_FIELDS = ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "output_tokens")


@dataclass(frozen=True)
class AttemptUsage:
    usage_source: str
    input_tokens: int | None = None
    cached_input_tokens: int | None = None
    cache_creation_tokens: int | None = None
    output_tokens: int | None = None
    tool_calls: int | None = None
    turns: int | None = None

    @property
    def usage_available(self) -> bool:
        return self.usage_source != "unavailable"

    @property
    def billable_tokens(self) -> int | None:
        parts = [part for part in (self.input_tokens, self.cache_creation_tokens, self.output_tokens)
                 if part is not None]
        return sum(parts) if len(parts) == 3 else None

    @property
    def total_tokens(self) -> int | None:
        billable = self.billable_tokens
        return None if billable is None or self.cached_input_tokens is None else billable + self.cached_input_tokens

    def to_record(self) -> dict:
        return {
            "inputTokens": self.input_tokens,
            "cachedInputTokens": self.cached_input_tokens,
            "cacheCreationTokens": self.cache_creation_tokens,
            "outputTokens": self.output_tokens,
            "totalTokens": self.total_tokens,
            "billableTokens": self.billable_tokens,
            "toolCalls": self.tool_calls,
            "turns": self.turns,
            "usageSource": self.usage_source,
            "usageAvailable": self.usage_available,
        }


UNAVAILABLE = AttemptUsage(usage_source="unavailable")


def _read_rows(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(errors="replace").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(row, dict):
            rows.append(row)
    return rows


def _usage_from_counts(source: str, usage: dict, tool_calls: int | None, turns: int | None) -> AttemptUsage:
    return AttemptUsage(
        usage_source=source,
        input_tokens=usage.get("input_tokens"),
        cached_input_tokens=usage.get("cache_read_input_tokens"),
        cache_creation_tokens=usage.get("cache_creation_input_tokens"),
        output_tokens=usage.get("output_tokens"),
        tool_calls=tool_calls,
        turns=turns,
    )


def usage_from_stream(stream: Path) -> AttemptUsage | None:
    """El ``result`` del stream-json; ``None`` si el proceso no llegó a escribirlo."""
    if not stream.is_file():
        return None
    results = [row for row in _read_rows(stream) if row.get("type") == "result" and isinstance(row.get("usage"), dict)]
    if not results:
        return None
    result = results[-1]
    # El result no trae el número de llamadas a herramienta; queda desconocido.
    return _usage_from_counts("result", result["usage"], None, result.get("num_turns"))


def usage_from_transcripts(directory: Path, since_epoch: float) -> AttemptUsage | None:
    """Suma, una vez por ``message.id``, el uso de los transcripts escritos desde ``since_epoch``."""
    if not directory.is_dir():
        return None
    messages: dict[str, dict] = {}
    tool_ids: set[str] = set()
    for path in sorted(directory.rglob("*.jsonl")):
        if path.stat().st_mtime < since_epoch:
            continue
        for row in _read_rows(path):
            message = row.get("message") if row.get("type") == "assistant" else None
            if not isinstance(message, dict) or not isinstance(message.get("usage"), dict):
                continue
            # Un mensaje partido en varios bloques repite su id y su uso: cuenta una vez.
            messages[message.get("id") or f"{path.name}:{len(messages)}"] = message["usage"]
            for block in message.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    tool_ids.add(f"{message.get('id')}:{block.get('id')}")
    if not messages:
        return None
    totals: dict[str, int | None] = {field: 0 for field in USAGE_FIELDS}
    for usage in messages.values():
        for field in USAGE_FIELDS:
            value = usage.get(field)
            if value is None:
                # un campo ausente en un turno vuelve desconocido el total, no lo baja
                totals[field] = None
            else:
                current = totals[field]
                if current is not None:
                    totals[field] = current + value
    return _usage_from_counts("transcript", totals, len(tool_ids), len(messages))


def attempt_usage(stream: Path, transcripts: Path, since_epoch: float) -> AttemptUsage:
    """La mejor fuente disponible para el intento; ``UNAVAILABLE`` si no hay ninguna."""
    return usage_from_stream(stream) or usage_from_transcripts(transcripts, since_epoch) or UNAVAILABLE
