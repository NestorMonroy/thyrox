"""Pruebas de ``transcript.tool_events`` — el sustrato que alimenta el eje de producción.

Los casos que DISCRIMINAN:

- **3** — un evento sin fecha legible va a ``undated``, no se descarta. Sin esa
  separación, un transcript de formato inesperado publicaría el mismo vacío
  que uno tranquilo, y el veredicto de producción leería «no produjo» sobre un
  agente al que no se le pudo medir nada.
- **4** — el escaneo alimenta a ``production.summarize`` sin traducción: es la
  prueba de que la frontera del sustrato (DEC-04) está donde dice estar.
"""
from __future__ import annotations

import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from roster import production as pr  # noqa: E402
from transcript import tool_events as te  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


NOW = datetime(2026, 9, 9, 18, 0, 0, tzinfo=timezone.utc).timestamp()


def stamp(seconds_ago: float) -> str:
    """La marca ISO 8601 con ``Z`` que el cliente escribe."""
    when = datetime.fromtimestamp(NOW - seconds_ago, tz=timezone.utc)
    return when.isoformat().replace("+00:00", "Z")


def write_transcript(tmp: Path, lines: list[dict]) -> Path:
    path = tmp / "agent.jsonl"
    path.write_text("\n".join(json.dumps(line) for line in lines) + "\n")
    return path


def tool_line(name: str, tool_input, seconds_ago: float) -> dict:
    return {"timestamp": stamp(seconds_ago), "type": "assistant",
            "message": {"role": "assistant",
                        "content": [{"type": "tool_use", "name": name, "input": tool_input}]}}


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)

    print("== 1. extrae nombre, entrada y antigüedad de cada tool_use ==")
    path = write_transcript(raiz, [
        {"timestamp": stamp(100), "type": "assistant",
         "message": {"role": "assistant", "content": [{"type": "text", "text": "pienso"}]}},
        tool_line("Bash", {"command": "grep -rn x src/"}, 60),
        tool_line("Write", {"file_path": "src/x.py"}, 30),
    ])
    escaneo = te.scan(path, now=NOW)
    check("dos eventos, el texto no cuenta", 2, len(escaneo.events))
    check("nombre y antigüedad del primero", ("Bash", 60.0),
          (escaneo.events[0][0], escaneo.events[0][2]))
    check("la entrada viaja entera", {"file_path": "src/x.py"}, escaneo.events[1][1])
    check("sin eventos sin fecha", [], escaneo.undated)

    print("== 2. una línea corrupta no tumba la lectura ==")
    path = raiz / "roto.jsonl"
    path.write_text("{no es json\n" + json.dumps(tool_line("Read", None, 10)) + "\n")
    check("el evento legible sobrevive", 1, len(te.scan(path, now=NOW).events))

    print("== 3. un evento SIN fecha legible se separa, no se descarta ==")
    path = write_transcript(raiz, [
        {"type": "assistant",
         "message": {"role": "assistant",
                     "content": [{"type": "tool_use", "name": "Edit", "input": {}}]}},
        tool_line("Read", None, 5),
    ])
    escaneo = te.scan(path, now=NOW)
    check("el fechado entra a events", ["Read"], [e[0] for e in escaneo.events])
    check("el otro va a undated con su nombre", ["Edit"], escaneo.undated)

    print("== 4. el escaneo alimenta a production.summarize sin traducción ==")
    path = write_transcript(raiz, [
        tool_line("Bash", {"command": "grep -rn x src/"}, 10),
        tool_line("Bash", {"command": "cat > src/nuevo.py <<'PY'"}, 20),
        tool_line("Grep", {"pattern": "x"}, 30),
    ])
    resumen = pr.summarize(te.scan(path, now=NOW).events, window=900)
    check("un mutating, un read_only, un indecidible", (1, 1, 1),
          (resumen.mutating, resumen.read_only, resumen.undecidable))
    check("y el veredicto es producing", "producing", pr.verdict(resumen))

    print("== 5. un archivo ausente da un escaneo vacío, no una excepción ==")
    escaneo = te.scan(raiz / "no-existe.jsonl", now=NOW)
    check("vacío en ambas listas", ([], []), (escaneo.events, escaneo.undated))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
