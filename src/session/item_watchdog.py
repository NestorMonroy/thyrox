"""Vigilante de un ítem del pool: detiene un worker que gira (TASK-THYROX-0931, F7).

`--max-turns` acota turnos y `--timeout` la pared; ninguno ve que un worker
local repite la misma llamada a herramienta, reintenta el mismo comando entre
otras o deja de producir eventos. Este vigilante lee el `stream-json` del ítem
mientras crece y, si ve uno de esos tres, detiene la SESIÓN del ítem —que el
pool lanza con `setsid`, así que su pid es el id de la sesión— y deja el motivo
en una línea `<motivo>\\t<detalle>`. `item_worktree finalize` la lee y da el
veredicto `detenido`.

Uso:
    item_watchdog.py watch <pid> <stream.jsonl> <informe> \\
        [--max-identical N] [--max-repeats M] [--idle-seconds S] [--interval S]

Métrica: llamadas `tool_use` (nombre + entrada JSON canónica) y el instante del
último evento leído.
Ciega a: un bucle cuyas llamadas difieren en un byte irrelevante, y al progreso
que no deja eventos (una generación larga sin salida parcial): por eso el
plazo sin progreso es generoso por defecto.
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

#: Una generación en CPU midió más de 300 s para un caso de qwen3-4b
#: (`qualifyModel.ts`, CASE_DEADLINE_MS): el plazo sin eventos lo cubre de sobra.
DEFAULT_IDLE_SECONDS = 1800
DEFAULT_MAX_IDENTICAL = 3
DEFAULT_MAX_REPEATS = 5
DEFAULT_INTERVAL = 2.0


@dataclass(frozen=True)
class Limits:
    max_identical: int
    max_repeats: int
    #: 0 desactiva el plazo sin progreso.
    idle_seconds: float


@dataclass(frozen=True)
class Breach:
    reason: str
    detail: str


#: Las herramientas cuyo éxito cambia el árbol del ítem.
MUTATING_TOOLS = frozenset({"Edit", "Write"})


class ToolCallTracker:
    """Cuenta las llamadas a herramienta de un ítem: la racha consecutiva y el total por llamada.

    Un cambio NUEVO aplicado —un `Edit`/`Write` con éxito cuya llamada no se
    había visto— es progreso: reinicia la racha y los totales de las llamadas
    que no cambian nada, así que editar → probar puede iterar (medido: qwen3-4b
    llegó a 6 de 7 pruebas y se lo detuvo por «5 en total» de la orden de
    pruebas, con un `Edit` distinto entre cada una). Un cambio rehusado o
    repetido no reinicia nada: reaplicar el mismo `Edit` sigue sumando, y una
    oscilación A→B, B→A cae por el total de esas mismas llamadas.
    """

    def __init__(self, limits: Limits) -> None:
        self._limits = limits
        self._totals: Counter[str] = Counter()
        self._last: str | None = None
        self._streak = 0
        self._mutations: dict[str, str] = {}

    def observe(self, event: dict) -> Breach | None:
        for call_id, call in _tool_calls(event):
            if json.loads(call).get("name") in MUTATING_TOOLS and call_id:
                self._mutations[call_id] = call
            breach = self._count(call)
            if breach is not None:
                return breach
        for call_id in _applied_results(event):
            call = self._mutations.pop(call_id, None)
            if call is not None and self._totals[call] == 1:
                self._progress()
        return None

    def _progress(self) -> None:
        self._totals = Counter({call: n for call, n in self._totals.items()
                                if json.loads(call).get("name") in MUTATING_TOOLS})
        self._last, self._streak = None, 0

    def _count(self, call: str) -> Breach | None:
        self._streak = self._streak + 1 if call == self._last else 1
        self._last = call
        self._totals[call] += 1
        if self._streak >= self._limits.max_identical:
            return Breach("identical-tool-call", f"{self._streak} consecutivas: {_preview(call)}")
        if self._totals[call] >= self._limits.max_repeats:
            return Breach("repeated-tool-call", f"{self._totals[call]} en total: {_preview(call)}")
        return None


def _tool_calls(event: dict) -> list[tuple[str, str]]:
    """``(id, llamada canónica)`` de cada ``tool_use`` de un evento assistant."""
    if event.get("type") != "assistant":
        return []
    content = (event.get("message") or {}).get("content") or []
    return [(str(part.get("id") or ""),
             json.dumps({"name": part.get("name"), "input": part.get("input")}, sort_keys=True, ensure_ascii=False))
            for part in content if isinstance(part, dict) and part.get("type") == "tool_use"]


def _applied_results(event: dict) -> list[str]:
    """Los ``tool_use_id`` que un evento user devuelve sin error."""
    if event.get("type") != "user":
        return []
    content = (event.get("message") or {}).get("content") or []
    return [str(part.get("tool_use_id")) for part in content
            if isinstance(part, dict) and part.get("type") == "tool_result" and not part.get("is_error")]


def _preview(call: str, length: int = 160) -> str:
    return call if len(call) <= length else f"{call[:length]}…"


def watch(pid: int, stream: Path, report: Path, limits: Limits, interval: float = DEFAULT_INTERVAL) -> Breach | None:
    """Vigila hasta que el ítem termine o rompa un límite; en ese caso lo detiene e informa."""
    tracker = ToolCallTracker(limits)
    offset, pending, last_event = 0, "", time.monotonic()
    while _alive(pid):
        chunk, offset = _read_from(stream, offset)
        lines = (pending + chunk).split("\n")
        pending = lines.pop()
        for line in lines:
            event = _parse(line)
            if event is None:
                continue
            last_event = time.monotonic()
            breach = tracker.observe(event)
            if breach is not None:
                return _stop(pid, report, breach)
        idle = time.monotonic() - last_event
        if limits.idle_seconds and idle >= limits.idle_seconds:
            return _stop(pid, report, Breach("no-progress", f"{int(idle)} s sin eventos en {stream.name}"))
        time.sleep(interval)
    return None


def _read_from(stream: Path, offset: int) -> tuple[str, int]:
    try:
        with stream.open("rb") as handle:
            handle.seek(offset)
            data = handle.read()
    except FileNotFoundError:
        return "", offset
    return data.decode("utf-8", errors="replace"), offset + len(data)


def _parse(line: str) -> dict | None:
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        return None
    return event if isinstance(event, dict) else None


def _alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return _state(pid) != "Z"


def _state(pid: int) -> str:
    try:
        return Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()[0]
    except (OSError, IndexError):
        return ""


def _stop(pid: int, report: Path, breach: Breach) -> Breach:
    report.write_text(f"{breach.reason}\t{breach.detail}\n")
    # La sesión puede no existir todavía si el límite se rompe antes de que el
    # ítem ejecute `setsid`: entonces se detiene el proceso mismo.
    try:
        os.killpg(pid, signal.SIGTERM)
    except ProcessLookupError:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    return breach


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="item_watchdog")
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("watch", help="vigila un ítem hasta que termine o rompa un límite")
    run.add_argument("pid", type=int)
    run.add_argument("stream", type=Path)
    run.add_argument("report", type=Path)
    run.add_argument("--max-identical", type=int, default=DEFAULT_MAX_IDENTICAL)
    run.add_argument("--max-repeats", type=int, default=DEFAULT_MAX_REPEATS)
    run.add_argument("--idle-seconds", type=float, default=DEFAULT_IDLE_SECONDS)
    run.add_argument("--interval", type=float, default=DEFAULT_INTERVAL)
    args = parser.parse_args(argv)
    limits = Limits(args.max_identical, args.max_repeats, args.idle_seconds)
    # El informe es el registro: finalize lo copia al .err del ítem y da el veredicto.
    watch(args.pid, args.stream, args.report, limits, args.interval)
    return 0


if __name__ == "__main__":
    sys.exit(main())
