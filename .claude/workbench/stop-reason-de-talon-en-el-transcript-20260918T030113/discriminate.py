#!/usr/bin/env python3
"""Que separa a las filas `tool_use` de las `end_turn`: el DISCRIMINADOR.

TASK-THYROX-0155 abrio con un DESCONOCIDO: 325 filas `completed` del store
llevan `stop_reason='tool_use'`, y un agente que termina entregando su reporte
no cierra en una llamada a herramienta.

La primera mitad ya estaba medida antes de este guion: la regla que puebla la
columna (`register_session.py`) toma el ULTIMO NO NULO, asi que un mensaje
final con `stop_reason: null` la hace retroceder al anterior, que es una
llamada a herramienta. Lo que faltaba era por que el cliente deja ese campo en
nulo en unos transcripts y no en otros. Dos hipotesis cayeron midiendo:

- la FORMA del mensaje final (`['text']` contra `['thinking','text']`) — las
  dos formas salen en los dos grupos: 84/25 contra 21/8;
- la VERSION del cliente — las mismas builds y el mismo rango de fechas en los
  dos grupos.

Este guion mide la tercera, y esa si separa sin solape: la CONTABILIDAD del
mensaje final. Cuando `usage.output_tokens` esta entre 1 y 10 sobre un cuerpo
de cientos a miles de caracteres, esa cifra no es el conteo del mensaje — es un
talon. El cliente persistio la linea desde el estado parcial del stream y el
evento terminal, que es el que trae `stop_reason` y el conteo real, no llego a
volcarse al transcript.

*Metrica:* por transcript alcanzable, el mensaje final del hilo `assistant`
—todas sus lineas, agrupadas por `message.id`— con su `stop_reason`, su
`usage.output_tokens` y el tamano en caracteres de sus bloques.
*Ciega a:* los 216 de los 325 que ya no estan en disco; a por que el evento
terminal no se vuelca, que es del cliente y no se observa desde el transcript;
y al conteo REAL de salida de esos mensajes, que no existe en ningun sitio —
por eso el talon no se puede corregir, solo declarar.
"""
from __future__ import annotations

import collections
import json
import pathlib
import re
import sqlite3
import sys

PROJECTS = pathlib.Path("/root/.claude/projects")
STORE = pathlib.Path("/home/user/thyrox/agent-results/agent_store.sqlite3")

#: El tope del talon y el piso del cuerpo. No son umbrales elegidos: salen de
#: la medicion, y las dos poblaciones no se solapan — talon 1..10, real 24..3429.
STUB_MAX_OUTPUT_TOKENS = 10
BODY_MIN_CHARS = 200


def transcripts_on_disk() -> dict[str, pathlib.Path]:
    """Los transcripts de subagente que sobreviven, por `agent_id`.

    El glob es explicito hasta `subagents/` en vez de recursivo: un `rglob`
    sobre `projects/` recorre todo el arbol de sesiones sin cota, que es la
    forma que `trabajo-en-segundo-plano.md` prohibe.
    """
    found = {}
    for path in PROJECTS.glob("*/*/subagents/agent-*.jsonl"):
        matched = re.match(r"agent-(\w+)\.jsonl$", path.name)
        if matched:
            found[matched.group(1)] = path
    return found


def assistant_records(path: pathlib.Path):
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except Exception:
            continue
        if record.get("type") != "assistant":
            continue
        message = record.get("message") or {}
        if message.get("role") == "assistant":
            yield record, message


def body_chars(message: dict) -> int:
    return sum(len(block.get("text") or block.get("thinking") or "")
               for block in (message.get("content") or [])
               if isinstance(block, dict))


def agent_ids(stop_reason: str) -> list[str]:
    conn = sqlite3.connect(f"file:{STORE}?mode=ro", uri=True)
    try:
        return [row[0] for row in conn.execute(
            "SELECT agent_id FROM agent_sessions "
            "WHERE status='completed' AND stop_reason=?", (stop_reason,))]
    finally:
        conn.close()


def main() -> int:
    on_disk = transcripts_on_disk()
    print(f"transcripts de subagente en disco: {len(on_disk)}")
    print()

    print("== EL DISCRIMINADOR: la contabilidad del mensaje final ==")
    print(f"{'fila dice':<12} {'n':>4} {'output_tokens':>16} {'caracteres del cuerpo':>24}")
    print("-" * 60)
    resumen = {}
    for declared in ("tool_use", "end_turn"):
        tokens, chars, lineas = [], [], collections.Counter()
        for agent in agent_ids(declared):
            path = on_disk.get(agent)
            if path is None:
                continue
            records = list(assistant_records(path))
            if not records:
                continue
            final_id = records[-1][1].get("id")
            pieces = [msg for _, msg in records if msg.get("id") == final_id]
            lineas[(len(pieces), any(m.get("stop_reason") for m in pieces))] += 1
            tokens.append((pieces[-1].get("usage") or {}).get("output_tokens") or 0)
            chars.append(max(body_chars(m) for m in pieces))
        tokens.sort(); chars.sort()
        resumen[declared] = (tokens, chars, lineas)
        print(f"{declared:<12} {len(tokens):>4} "
              f"{f'{tokens[0]}..{tokens[-1]}':>16} "
              f"{f'{chars[0]}..{chars[-1]} (mediana {chars[len(chars)//2]})':>24}")
    print()
    alto = resumen["tool_use"][0][-1]
    bajo = resumen["end_turn"][0][0]
    print(f"Sin solape: el maximo del grupo `tool_use` es {alto} y el minimo del")
    print(f"grupo `end_turn` es {bajo}. Un cuerpo de miles de caracteres no cabe")
    print("en una cifra de un digito: esa contabilidad es un TALON, no un conteo.")
    print()

    print("== NINGUNA linea del mensaje final trae `stop_reason` en el grupo acusado ==")
    for declared in ("tool_use", "end_turn"):
        detalle = " · ".join(
            f"lineas={k[0]} alguna-con-stop_reason={k[1]}: {v}"
            for k, v in sorted(resumen[declared][2].items()))
        print(f"  {declared:<10} {detalle}")
    print()
    print("  No es que la ultima linea lo omita y otra lo traiga: el MENSAJE entero")
    print("  carece del campo. Agrupar por `message.id` es lo que lo separa de la")
    print("  hipotesis de forma, que trataba cada linea como un mensaje.")
    print()

    print("== ALCANCE DEL TALON: cuantos mensajes, no solo el final ==")
    total = stub = stub_final = 0
    transcripts = 0
    for agent in agent_ids("tool_use"):
        path = on_disk.get(agent)
        if path is None:
            continue
        transcripts += 1
        por_id: dict[str, tuple[int, int]] = {}
        orden: list[str] = []
        for _, message in assistant_records(path):
            mid, usage = message.get("id"), message.get("usage")
            if not usage or not mid:
                continue
            if mid not in orden:
                orden.append(mid)
            previo = por_id.get(mid, (0, 0))
            por_id[mid] = (usage.get("output_tokens", 0) or 0,
                           max(previo[1], body_chars(message)))
        total += len(por_id)
        for index, mid in enumerate(orden):
            output, cuerpo = por_id[mid]
            if output <= STUB_MAX_OUTPUT_TOKENS and cuerpo > BODY_MIN_CHARS:
                stub += 1
                if index == len(orden) - 1:
                    stub_final += 1
    print(f"  transcripts                 : {transcripts}")
    print(f"  mensajes assistant con usage: {total}")
    print(f"  con contabilidad de TALON   : {stub} ({100 * stub / total:.2f} %)")
    print(f"    el mensaje FINAL          : {stub_final}")
    print(f"    mensajes NO finales       : {stub - stub_final}")
    print()
    print("  Consecuencia para el costo, acotada: el talon subcuenta `output`, y")
    print("  `output` es el 0.02 % del consumo de un subagente")
    print("  (`calibration-verified-numbers.md`). El sesgo existe y es de segundo")
    print("  orden; lo que NO se puede es corregirlo — el conteo real del mensaje")
    print("  final no quedo escrito en ninguna parte.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
