#!/usr/bin/env python3
"""Decide el DESCONOCIDO de TASK-THYROX-0155 sobre los transcripts que quedan.

La regla que puebla la columna vive en ``register_session.py:348``:

    if msg.get("stop_reason"):
        ultimo_cierre = str(msg["stop_reason"])

Es el ULTIMO NO NULO, no el ultimo. Si el mensaje final de un subagente —su
reporte— declara ``stop_reason: null``, la regla retrocede al anterior, que es
una llamada a herramienta, y la fila publica ``tool_use``. Esa es la hipotesis,
y ``closing.py`` existe para separarla de la alternativa: que el agente parase
de verdad en una llamada a herramienta.

*Metrica:* por transcript alcanzable de los 325, las DOS cifras de cierre y si
divergen.
*Ciega a:* los 216 que ya no estan en disco — este reparto describe a los que
sobreviven, no a los 325. Y ciega a por que el mensaje final declara nulo, que
es del cliente y no de este instrumento.
"""
from __future__ import annotations

import importlib.util
import pathlib
import re
import sqlite3
import sys

ROOT = pathlib.Path('/home/user/thyrox')
spec = importlib.util.spec_from_file_location("closing", ROOT / "src/transcript/closing.py")
closing = importlib.util.module_from_spec(spec)
sys.modules["closing"] = closing
spec.loader.exec_module(closing)

on_disk = {}
for path in pathlib.Path('/root/.claude/projects').rglob('subagents/*.jsonl'):
    found = re.match(r'agent-(\w+)\.jsonl$', path.name)
    if found:
        on_disk[found.group(1)] = path

conn = sqlite3.connect(f'file:{ROOT}/agent-results/agent_store.sqlite3?mode=ro', uri=True)
rows = conn.execute("SELECT agent_id, turns FROM agent_sessions "
                    "WHERE status='completed' AND stop_reason='tool_use'").fetchall()

buckets: dict = {}
diverging_examples = []
measured = 0
for agent_id, turns in rows:
    path = on_disk.get(agent_id)
    if path is None:
        continue
    result = closing.read(path)
    measured += 1
    key = (result.last_stop_reason, result.last_declared_stop_reason)
    buckets[key] = buckets.get(key, 0) + 1
    if result.rule_diverges and len(diverging_examples) < 3:
        diverging_examples.append((agent_id, result))

print(f"medidos {measured} de {len(rows)} (el resto ya no esta en disco)")
print()
print(f"{'ultimo':<16} {'ultimo NO nulo':<16} {'filas':>6}   {'divergen?'}")
print("-" * 58)
for (last, declared), count in sorted(buckets.items(), key=lambda kv: -kv[1]):
    flag = "SI" if last != declared else ""
    print(f"{str(last):<16} {str(declared):<16} {count:>6}   {flag}")
print()
for agent_id, result in diverging_examples:
    print(f"  ejemplo {agent_id}: ultimo={result.last_stop_reason} "
          f"declarado={result.last_declared_stop_reason} "
          f"bloques={result.last_block_types} "
          f"mensajes={result.assistant_messages}")
