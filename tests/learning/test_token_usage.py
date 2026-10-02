#!/usr/bin/env python3
"""Suite de ``src/learning/token_usage.py``: el uso de tokens de un intento.

Qué tiene que garantizar:
- el ``result`` del stream-json es la primera fuente; el transcript, la segunda;
- un uso que ninguna fuente trae queda DESCONOCIDO (``None``), nunca cero;
- el transcript se suma una vez por mensaje: los bloques que repiten ``message.id``
  no duplican el uso;
- sólo cuentan los transcripts de ESTE intento (escritos desde su lanzamiento);
- ``billableTokens`` = entrada + escritura de caché + salida; la lectura de caché
  va aparte en ``cachedInputTokens``.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from learning.token_usage import attempt_usage, usage_from_stream, usage_from_transcripts  # noqa: E402

OK = FAILED = 0


def check(name: str, condition: bool) -> None:
    global OK, FAILED
    if condition:
        OK += 1
        print(f"ok   {name}")
    else:
        FAILED += 1
        print(f"FAIL {name}")


def write_jsonl(path: Path, rows: list[dict]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row) + "\n" for row in rows))
    return path


def assistant(message_id: str, usage: dict, tools: int = 0) -> dict:
    content = [{"type": "text", "text": "x"}] + [{"type": "tool_use", "id": f"t{i}", "name": "Bash", "input": {}}
                                                  for i in range(tools)]
    return {"type": "assistant", "message": {"id": message_id, "model": "qwen3.8-flash", "usage": usage,
                                             "content": content}}


USAGE_A = {"input_tokens": 100, "output_tokens": 10, "cache_creation_input_tokens": 5, "cache_read_input_tokens": 1000}
USAGE_B = {"input_tokens": 200, "output_tokens": 20, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 2000}

with tempfile.TemporaryDirectory() as raw:
    root = Path(raw)

    print("== 1. el result del stream es la primera fuente ==")
    stream = write_jsonl(root / "s1.jsonl", [{"type": "system"}, {"type": "result", "num_turns": 3, "usage": USAGE_A}])
    usage = usage_from_stream(stream)
    assert usage is not None
    check("fuente result", usage.usage_source == "result")
    check("billable = in + creation + out", usage.billable_tokens == 115)
    check("cached aparte", usage.cached_input_tokens == 1000)
    check("total = in + cached + creation + out", usage.total_tokens == 1115)

    print("== 2. sin result, el transcript; los bloques de un mismo mensaje no se duplican ==")
    transcripts = root / "t2"
    write_jsonl(transcripts / "session.jsonl", [assistant("m1", USAGE_A, tools=1), assistant("m1", USAGE_A, tools=1),
                                                assistant("m2", USAGE_B, tools=2)])
    usage = usage_from_transcripts(transcripts, since_epoch=0)
    assert usage is not None
    check("fuente transcript", usage.usage_source == "transcript")
    check("entrada sumada una vez por mensaje", usage.input_tokens == 300)
    check("llamadas a herramienta contadas por bloque único", usage.tool_calls == 3)

    print("== 3. un transcript anterior al lanzamiento no es de este intento ==")
    old = transcripts / "old.jsonl"
    write_jsonl(old, [assistant("m9", USAGE_B)])
    os.utime(old, (1000, 1000))
    usage = usage_from_transcripts(transcripts, since_epoch=5000)
    check("sólo cuenta lo escrito desde el lanzamiento", usage is not None and usage.input_tokens == 300)

    print("== 4. ninguna fuente: desconocido, nunca cero ==")
    empty_stream = write_jsonl(root / "s4.jsonl", [{"type": "system"}])
    usage = attempt_usage(empty_stream, root / "no-transcripts", since_epoch=0)
    record = usage.to_record()
    check("usageAvailable false", record["usageAvailable"] is False)
    check("usageSource unavailable", record["usageSource"] == "unavailable")
    check("inputTokens None, no 0", record["inputTokens"] is None)
    check("billableTokens None, no 0", record["billableTokens"] is None)

    print("== 5. el stream gana al transcript cuando los dos existen ==")
    usage = attempt_usage(stream, transcripts, since_epoch=0)
    check("result antes que transcript", usage.usage_source == "result" and usage.input_tokens == 100)

print("== 6. la fila del intento: identidad del delegado, uso y veredicto ==")
from session.task_continuation import PlanItem, attempt_telemetry  # noqa: E402

with tempfile.TemporaryDirectory() as raw:
    workbench = Path(raw)
    item = PlanItem(id="p9", prompt="p.md", verify="true", candidates=("qwen3.8-flash",), task_id="TASK-THYROX-0755")
    write_jsonl(workbench / "outputs" / "p9-qwen3.8-flash.transcript" / "s.jsonl", [assistant("m1", USAGE_A, tools=1)])
    write_jsonl(workbench / "outputs" / "cutover-executions.jsonl", [
        {"utc": "2000-01-01T00:00:00Z", "item": "p9", "model": "qwen3.8-flash", "containerId": "old", "executionId": "old"},
        {"utc": "2030-01-01T00:00:00Z", "item": "p9", "model": "qwen3.8-flash", "containerId": "c" * 64,
         "executionId": "c" * 12, "provider": "token-plan"}])
    row = attempt_telemetry(workbench, item, "TASK-THYROX-0755", 2, "qwen3.8-flash", launched_at=1.0e9,
                            elapsed_seconds=12.5, outcome="task_failure", verify_exit=1, provider_retries=1)
    check("el contenedor es el del intento, no uno anterior", row["containerId"] == "c" * 64)
    check("uso del transcript con su procedencia", row["usageSource"] == "transcript" and row["inputTokens"] == 100)
    check("veredicto rechazado por el verificador", row["verdict"] == "rejected")
    check("elapsedMs y reintentos de proveedor", row["elapsedMs"] == 12500 and row["providerRetries"] == 1)

print(f"\n{OK + FAILED} casos: {OK} ok, {FAILED} fallos")
sys.exit(1 if FAILED else 0)
