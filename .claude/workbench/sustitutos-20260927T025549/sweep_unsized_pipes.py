#!/usr/bin/env python3
"""Barrido: reescribe `productor | grep -q …` como `grep -q … <<<"$(productor)"`.

Usa el mismo parser que el gate (`check_unsized_writer_pipe`) para no medir con
un instrumento y arreglar con otro. `echo X` y `printf '%s' X` se reescriben
como `<<<X`: el here-string añade el salto final que `echo` ya ponía, y para un
`grep -q` un salto final de más no cambia el veredicto.
"""
import re
import sys
from pathlib import Path

from verify import check_unsized_writer_pipe as gate
from verify.check_unbounded_pipe import stages

PLAIN_FORMAT = re.compile(r"""^printf\s+(?:'%s'|'%s\\n'|"%s"|"%s\\n")\s+(".*")\s*$""")
ECHO_ARG = re.compile(r'^echo\s+(".*")\s*$')
PREFIX = re.compile(r"^(\s*(?:(?:if|elif|while|until|then|do|!)\s+)*)")


def captured(producer: str) -> str:
    text = producer.strip()
    for pattern in (ECHO_ARG, PLAIN_FORMAT):
        match = pattern.match(text)
        if match and match.group(1).count('"') == 2:
            return match.group(1)
    return f'"$({text})"'


def rewrite(chunk: str) -> tuple[str, str] | None:
    parts = stages(chunk)
    for index, stage in enumerate(parts[1:], start=1):
        if gate.short_circuit_consumer(stage):
            head = parts[0]
            prefix = PREFIX.match(head).group(1)
            producer = "|".join([head[len(prefix):]] + parts[1:index])
            old = "|".join(parts[:index + 1]).strip()
            new = f"{prefix.strip()} {stage.strip()} <<<{captured(producer)}".strip()
            if len(parts) > index + 1:
                return None
            return old, new
    return None


def main(paths: list[str]) -> int:
    changed = 0
    for name in paths:
        path = Path(name)
        text = path.read_text()
        findings, _ = gate.review(text, name)
        for finding in findings:
            result = rewrite(finding.text)
            if not result:
                print(f"SIN REESCRITURA {name}:{finding.line}  {finding.text}")
                continue
            old, new = result
            if old not in text:
                print(f"NO LOCALIZADO {name}:{finding.line}  {old}")
                continue
            text = text.replace(old, new)
            changed += 1
        path.write_text(text)
    print(f"reescritas: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
