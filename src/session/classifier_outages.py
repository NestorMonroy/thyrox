#!/usr/bin/env python3
"""Censo de las caídas del clasificador de auto mode en un transcript.

Un episodio es una racha de resultados de Bash rechazados sin veredicto
(``transient`` o ``hard``, ver ``hooks.classifier_rejection``). Lo termina un
Bash que pasa —el episodio se da por recuperado— o un rechazo con veredicto.
Los resultados de otras herramientas no lo cortan: no consultan al
clasificador, y el censo los cuenta aparte como lo que pasó mientras tanto.

Uso::

    bin/classifier_outages <transcript.jsonl> [--json]

Sale 0 con el censo y 2 si el transcript no existe, sin publicar un conteo:
un cero ahí no distinguiría «no hubo caídas» de «no pude leer».

*Métrica:* resultados de ``tool_result`` emparejados con su ``tool_use`` por
id, clasificados por el texto que el cliente escribe.
*Ciega a:* un rechazo cuyo texto no reconozca el clasificador de rechazos, y a
una línea del transcript que no sea JSON (se omite).
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path

from hooks.classifier_rejection import classify_rejection

_CLASSIFIED_TOOL = "Bash"


@dataclass
class Episode:
    started_at: str
    last_rejection_at: str
    last_ok_before: str | None
    recovered_at: str | None = None
    rejected: int = 0
    kinds: dict[str, int] = field(default_factory=dict)
    causes: dict[str, int] = field(default_factory=dict)
    passed_meanwhile: dict[str, int] = field(default_factory=dict)


@dataclass
class Census:
    bash_results: int
    no_verdict: int
    episodes: list[Episode]


def _entries(path: Path):
    with path.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                yield json.loads(line)
            except ValueError:
                continue


def _blocks(entry: dict, kind: str):
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict) and block.get("type") == kind:
                yield block


def census(transcript: str | Path) -> Census:
    """Recorre el transcript una vez y agrupa los rechazos en episodios."""
    calls: dict[str, tuple[str, str]] = {}
    episodes: list[Episode] = []
    current: Episode | None = None
    last_ok: str | None = None
    bash_results = no_verdict = 0
    for entry in _entries(Path(transcript)):
        for use in _blocks(entry, "tool_use"):
            calls[use.get("id", "")] = (use.get("name", ""), entry.get("timestamp", ""))
        for result in _blocks(entry, "tool_result"):
            name, at = calls.get(result.get("tool_use_id", ""), ("", entry.get("timestamp", "")))
            if name != _CLASSIFIED_TOOL:
                if current is not None:
                    current.passed_meanwhile[name] = current.passed_meanwhile.get(name, 0) + 1
                continue
            bash_results += 1
            rejection = classify_rejection(result.get("content"), is_error=result.get("is_error") is True)
            if rejection is None or rejection.kind == "judged":
                if current is not None and rejection is None:
                    current.recovered_at = at
                current = None
                if rejection is None:
                    last_ok = at
                continue
            no_verdict += 1
            if current is None:
                current = Episode(started_at=at, last_rejection_at=at, last_ok_before=last_ok)
                episodes.append(current)
            current.rejected += 1
            current.last_rejection_at = at
            current.kinds = dict(Counter(current.kinds) + Counter({rejection.kind: 1}))
            if rejection.cause:
                current.causes = dict(Counter(current.causes) + Counter({rejection.cause: 1}))
    return Census(bash_results=bash_results, no_verdict=no_verdict, episodes=episodes)


def _format(report: Census) -> str:
    lines = [(f"{len(report.episodes)} episodio(s); {report.no_verdict} rechazo(s) sin veredicto "
              f"sobre {report.bash_results} resultado(s) de Bash")]
    for e in report.episodes:
        passed = ", ".join(f"{k} {v}" for k, v in sorted(e.passed_meanwhile.items())) or "nada"
        lines.append(f"- {e.started_at} → {e.last_rejection_at}: {e.rejected} rechazo(s) "
                     f"{dict(e.kinds)} {dict(e.causes)}; último Bash bien {e.last_ok_before}; "
                     f"recuperado {e.recovered_at}; pasaron mientras tanto: {passed}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Censo de caídas del clasificador de auto mode.")
    parser.add_argument("transcript")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    path = Path(args.transcript)
    if not path.is_file():
        print(f"classifier_outages: el transcript no existe: {path}", file=sys.stderr)
        return 2
    report = census(path)
    print(json.dumps(asdict(report), ensure_ascii=False, indent=2) if args.json else _format(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
