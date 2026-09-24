#!/usr/bin/env python3
"""Summarize TypeScript diagnostics by code, file, symbol and module edge."""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import re
import sys
from typing import Iterable

# Dos familias de codigo: `TSnnnn` de tsc y `SHAPEnnn` del auditor de forma
# de mensajes (`message_shape_audit.ts`), que emite en este mismo formato para
# que el lazo, su memoria de patrones y sus gates lo lean sin cambios. Es una
# lista cerrada a proposito: un prefijo desconocido no cuenta como error.
DIAGNOSTIC = re.compile(
    r"^(?P<file>.+?)\((?P<line>\d+),(?P<column>\d+)\): "
    r"error (?P<code>TS\d+|SHAPE\d+): (?P<message>.*)$"
)
MISSING_EXPORT = re.compile(
    r'''Module '["](?P<provider>.+?)["]' has no exported member '(?P<symbol>.+?)'\.'''
)


def diagnostic_key(match: re.Match[str]) -> str:
    """Identidad estable de un diagnóstico, sin coordenadas volátiles."""
    return (
        f"{match.group('file')}: {match.group('code')}: "
        f"{match.group('message')}"
    )


def analyze(lines: Iterable[str]) -> dict[str, object]:
    by_code: collections.Counter[str] = collections.Counter()
    by_file: collections.Counter[str] = collections.Counter()
    edges: collections.Counter[tuple[str, str, str]] = collections.Counter()
    identities: collections.Counter[tuple[str, str, str]] = collections.Counter()

    for raw_line in lines:
        match = DIAGNOSTIC.match(raw_line.rstrip("\n"))
        if not match:
            continue
        consumer = match.group("file")
        by_code[match.group("code")] += 1
        by_file[consumer] += 1
        identities[(consumer, match.group("code"), match.group("message"))] += 1
        missing = MISSING_EXPORT.search(match.group("message"))
        if missing:
            edges[(consumer, missing.group("provider"), missing.group("symbol"))] += 1

    return {
        "diagnostics": sum(by_code.values()),
        "files": len(by_file),
        "by_code": dict(sorted(by_code.items())),
        "by_file": dict(sorted(by_file.items())),
        "diagnostic_keys": [
            {
                "file": file,
                "code": code,
                "message": message,
                "key": f"{file}: {code}: {message}",
                "count": count,
            }
            for (file, code, message), count in sorted(identities.items())
        ],
        "missing_exports": [
            {"consumer": consumer, "provider": provider, "symbol": symbol, "count": count}
            for (consumer, provider, symbol), count in sorted(edges.items())
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("log", type=pathlib.Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    try:
        report = analyze(args.log.read_text(encoding="utf-8", errors="replace").splitlines())
    except OSError as error:
        print(f"typescript-diagnostics: cannot read {args.log}: {error}", file=sys.stderr)
        return 2
    if report["diagnostics"] == 0:
        print("typescript-diagnostics: no TypeScript diagnostics were parseable", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(f"TypeScript: {report['diagnostics']} diagnostics in {report['files']} files")
        for code, count in report["by_code"].items():
            print(f"  {code}: {count}")
        print(f"  missing-export edges: {len(report['missing_exports'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
