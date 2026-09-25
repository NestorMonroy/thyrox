#!/usr/bin/env python3
"""Control de las piezas puras de `src/verify/pool_pipeline.py`.

Qué haría fallar a este control:
- tomar un archivo con ítems todavía en curso: sus trozos acabarían en lotes
  distintos y el segundo ya no encontraría su `old`;
- tomar dos veces el mismo archivo;
- construir el candidato contra HEAD y no contra el texto actual del árbol de
  medición: borraría lo aceptado en lotes anteriores;
- dejar pasar una edición que silencia.
"""
from __future__ import annotations

import hashlib
import sys
import tempfile
from pathlib import Path

from verify import pool_pipeline as pp

passed = failed = 0


def assert_equal(name: str, expected, obtained) -> None:
    global passed, failed
    if expected == obtained:
        passed += 1
        print(f"  ok    {name}")
    else:
        failed += 1
        print(f"  FALLA {name} — esperado {expected!r}, obtenido {obtained!r}")


print("test_pool_pipeline:")
items = ["a.ts d/1.txt", "b.ts d/2.txt", "a.ts d/3.txt", "c.ts d/4.txt"]
grouped = pp.items_by_file(items)
assert_equal("los ítems se agrupan por archivo", {"a.ts": [1, 3], "b.ts": [2], "c.ts": [4]}, grouped)
assert_equal("un archivo con un trozo en curso no está listo", ["b.ts"], pp.ready_files(grouped, {1, 2}, set()))
assert_equal("listo cuando terminan todos sus trozos", ["a.ts", "b.ts"], pp.ready_files(grouped, {1, 2, 3}, set()))
assert_equal("lo ya tomado no se vuelve a tomar", ["a.ts"], pp.ready_files(grouped, {1, 2, 3}, {"b.ts"}))

with tempfile.TemporaryDirectory() as directory:
    partial = Path(directory) / "1.json"
    partial.write_text('{"result": "sin cerr')
    assert_equal("una salida a medio escribir no cuenta como terminada", None, pp.read_output(partial))

text = "const a = BAD\nconst b = OK\n"
keys = ["a.ts: TS1: x.", "b.ts: TS1: y."]
candidate, dropped = pp.build_candidate("a.ts", text, [
    {"old": "BAD", "new": "1"},
    {"old": "OK", "new": "x as any"},
    {"old": "NOPE", "new": "z"},
], keys)
assert_equal("aplica lo seguro y descarta lo que silencia o no encuentra", (["silencia", "old no único"],
             "const a = 1\nconst b = OK\n"), (dropped, candidate["edits"][0]["newText"]))
assert_equal("la base es el texto ACTUAL, no HEAD", hashlib.sha256(text.encode()).hexdigest(),
             candidate["bases"]["a.ts"])
assert_equal("los objetivos son los diagnósticos del archivo", ["a.ts: TS1: x."], candidate["targets"])
assert_equal("sin cambio no hay candidato", None, pp.build_candidate("a.ts", text, [], keys)[0])

print(f"test_pool_pipeline: {passed + failed} aserciones — {passed} ok, {failed} falla(s)")
sys.exit(1 if failed else 0)
