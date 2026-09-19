#!/usr/bin/env python3
"""Como cerro una sesion, y por que hacen falta DOS cifras y no una.

Mitad ROJA. `register_session.py:349-350` resuelve el cierre por el ULTIMO
`stop_reason` NO NULO entre los mensajes assistant. Es una regla, no un hecho:
si el ultimo mensaje no declara `stop_reason`, esa regla publica el de un
mensaje ANTERIOR, y quien lea la fila creera que el turno cerro asi.

TASK-THYROX-0155 pregunta si 325 filas `completed` llevan de verdad
`stop_reason='tool_use'`. Esa pregunta NO se puede responder con una sola
cifra: hay que publicar las dos —la del ultimo mensaje y la del ultimo no
nulo— y ver si coinciden.

    coinciden    -> la regla del extractor es fiel; la expectativa escrita
                    es la que esta mal, y `tool_use` al cerrar es normal.
    difieren     -> la regla arrastra el cierre de un mensaje anterior, y
                    el defecto esta en el extractor.

Una sola de las dos no discrimina, que es el sub-patron D con el propio
registro como sujeto.

*Metrica:* los mensajes `type=assistant` de un JSONL de transcript.
*Ciega a:* el cuerpo de los mensajes —se guardan los TIPOS de bloque, no su
contenido: 2.0 MB de mediana no caben versionados—, y a un transcript
truncado, que publica el mismo cierre que uno completo.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

# El bootstrap de UNA linea es la unica aritmetica que el gate admite,
# y la unica que el localizador no puede reemplazar: no se puede pedir
# `reach.thyrox_root()` antes de que `import reach` funcione.
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from paths import reach  # noqa: E402

HERE = reach.thyrox_root()
spec = importlib.util.spec_from_file_location(
    "closing", HERE / "src" / "transcript" / "closing.py")
closing = importlib.util.module_from_spec(spec)
# Se registra ANTES de ejecutar: `dataclasses._is_type` resuelve la anotacion
# buscando `sys.modules[cls.__module__]`, y sin esta linea encuentra None y
# revienta. Es precondicion del cargador, no del modulo cargado.
sys.modules["closing"] = closing
spec.loader.exec_module(closing)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def _write(path, messages):
    with open(path, "w", encoding="utf-8") as fh:
        for m in messages:
            fh.write(json.dumps(m) + "\n")


def _assistant(stop_reason, block_types):
    return {"type": "assistant", "message": {
        "role": "assistant", "id": f"m-{stop_reason}-{len(block_types)}",
        "stop_reason": stop_reason,
        "content": [{"type": t} for t in block_types]}}


with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)

    print("== 1. las dos cifras COINCIDEN: el ultimo mensaje declara su cierre ==")
    p = root / "coinciden.jsonl"
    _write(p, [_assistant("end_turn", ["text"]),
               _assistant("tool_use", ["text", "tool_use"])])
    c = closing.read(p)
    check("el cierre del ULTIMO mensaje", "tool_use", c.last_stop_reason)
    check("el ultimo NO NULO, que es la regla del extractor", "tool_use",
          c.last_declared_stop_reason)
    check("y el registro lo declara: no difieren", False, c.rule_diverges)
    check("los tipos de bloque del ultimo, sin su cuerpo",
          ["text", "tool_use"], c.last_block_types)
    check("el denominador viaja", 2, c.assistant_messages)

    print("== 2. DIFIEREN: el ultimo no declara cierre y la regla arrastra ==")
    p = root / "difieren.jsonl"
    _write(p, [_assistant("tool_use", ["tool_use"]),
               {"type": "assistant", "message": {
                   "role": "assistant", "id": "m-sin",
                   "content": [{"type": "text"}]}}])
    c = closing.read(p)
    check("el ultimo mensaje no declara cierre", None, c.last_stop_reason)
    check("la regla publica el de un mensaje ANTERIOR", "tool_use",
          c.last_declared_stop_reason)
    check("y el registro lo DECLARA en vez de esconderlo", True, c.rule_diverges)

    print("== 3. un transcript sin mensajes assistant no se inventa un cierre ==")
    p = root / "vacio.jsonl"
    _write(p, [{"type": "user", "message": {"role": "user"}}])
    c = closing.read(p)
    check("sin cierre, y el denominador en 0", (None, None, 0),
          (c.last_stop_reason, c.last_declared_stop_reason, c.assistant_messages))

    print("== 4. un transcript ausente REHUSA, no publica un cierre vacio ==")
    # Un `None` aqui no distinguiria «cerro sin declarar» de «no pude leer».
    try:
        closing.read(root / "no-existe.jsonl")
        check("rehusa con TranscriptNotFound", "TranscriptNotFound", "no lanzo")
    except closing.TranscriptNotFound:
        check("rehusa con TranscriptNotFound", "TranscriptNotFound",
              "TranscriptNotFound")

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
