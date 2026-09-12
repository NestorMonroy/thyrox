#!/usr/bin/env python3
"""Mide, sobre el transcript REAL de esta sesion, el costo en caracteres
de Read/Edit frente a su equivalente Bash — sin aproximar nada que se
pueda contar exacto. La conversion a tokens queda declarada como estimada
(no hay tokenizer de Anthropic disponible offline en este contenedor).
"""
import json
import subprocess
import sys
from pathlib import Path

TRANSCRIPT = Path(
    "/root/.claude/projects/-home-user/e8588da7-9c13-569f-ab69-f974894396e4.jsonl"
)

# Lecturas SIN offset (archivo completo) y sin Edit posterior sobre el mismo
# archivo en este transcript -> comparables byte a byte contra el disco hoy.
SAFE_FULL_READS = [
    "/home/user/thyrox/tests/session/test_write_env.py",
]

# Lectura PARCIAL (offset/limit) que tampoco vuelve a tocarse -> se compara
# contra el mismo rango via `sed -n`.
SAFE_PARTIAL_READ = {
    "file_path": "/home/user/thyrox/src/session/job_runs.py",
    "offset": 95,
    "limit": 45,
}


def load_entries():
    with open(TRANSCRIPT, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def tool_result_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            b.get("text", "") for b in content
            if isinstance(b, dict) and b.get("type") == "text"
        )
    return ""


def collect_read_calls():
    calls = {}       # id -> input dict
    results = {}      # id -> text
    for entry in load_entries():
        msg = entry.get("message", {})
        content = msg.get("content")
        role = msg.get("role")
        if not isinstance(content, list):
            continue
        if role == "assistant":
            for b in content:
                if isinstance(b, dict) and b.get("type") == "tool_use" and b.get("name") == "Read":
                    calls[b.get("id")] = b.get("input") or {}
        elif role == "user":
            for b in content:
                if isinstance(b, dict) and b.get("type") == "tool_result":
                    tid = b.get("tool_use_id")
                    if tid in calls:
                        results[tid] = tool_result_text(b.get("content"))
    return calls, results


def collect_edit_calls(file_substr):
    out = []
    for entry in load_entries():
        msg = entry.get("message", {})
        content = msg.get("content")
        if not isinstance(content, list) or msg.get("role") != "assistant":
            continue
        for b in content:
            if isinstance(b, dict) and b.get("type") == "tool_use" and b.get("name") == "Edit":
                inp = b.get("input") or {}
                if file_substr in inp.get("file_path", ""):
                    out.append(inp)
    return out


def report_full_read(fp, result_text):
    raw = subprocess.run(["cat", fp], capture_output=True, text=True).stdout
    n_lines = raw.count("\n") + (1 if raw and not raw.endswith("\n") else 0)
    result_chars = len(result_text)
    raw_chars = len(raw)
    delta = result_chars - raw_chars
    print(f"\n[lectura completa] {fp}")
    print(f"  lineas                   : {n_lines}")
    print(f"  cat plano (bytes)        : {raw_chars}")
    print(f"  Read tool_result (bytes) : {result_chars}")
    print(f"  delta (Read - cat)       : {delta:+d}  ({delta/max(raw_chars,1)*100:+.1f}%)")
    print(f"  overhead por linea       : {delta/max(n_lines,1):.2f} bytes/linea")
    return raw_chars, result_chars


def report_partial_read(fp, offset, limit, result_text):
    end = offset + limit - 1
    raw = subprocess.run(
        ["sed", "-n", f"{offset},{end}p", fp], capture_output=True, text=True
    ).stdout
    result_chars = len(result_text)
    raw_chars = len(raw)
    delta = result_chars - raw_chars
    print(f"\n[lectura parcial offset={offset} limit={limit}] {fp}")
    print(f"  sed -n '{offset},{end}p' (bytes) : {raw_chars}")
    print(f"  Read tool_result (bytes)         : {result_chars}")
    print(f"  delta (Read - sed)               : {delta:+d}  ({delta/max(raw_chars,1)*100:+.1f}%)")
    return raw_chars, result_chars


def main():
    print("=== 1. Read tool_result REAL vs Bash equivalente, mismo archivo/rango ===")
    calls, results = collect_read_calls()
    total_raw = 0
    total_read = 0

    for fp in SAFE_FULL_READS:
        for tid, inp in calls.items():
            if inp.get("file_path") == fp and "offset" not in inp:
                raw_c, read_c = report_full_read(fp, results[tid])
                total_raw += raw_c
                total_read += read_c
                break

    p = SAFE_PARTIAL_READ
    for tid, inp in calls.items():
        if inp.get("file_path") == p["file_path"] and inp.get("offset") == p["offset"]:
            raw_c, read_c = report_partial_read(
                p["file_path"], p["offset"], p["limit"], results[tid]
            )
            total_raw += raw_c
            total_read += read_c
            break

    d = total_read - total_raw
    print(f"\n  TOTAL Bash (cat/sed)     : {total_raw}")
    print(f"  TOTAL Read tool_result   : {total_read}")
    print(f"  TOTAL delta              : {d:+d}  ({d/max(total_raw,1)*100:+.1f}%)")
    print(f"  ~ tokens (heuristica 4 char/tok, NO medido con tokenizer real): {d/4:+.0f}")

    print("\n=== 2. Edit — la resolucion REAL del conflicto de merge en generate_bin.py ===")
    print("     (identificada por contenido: la que combina 'bin_name' y 'PYTHONPATH')")
    edits = collect_edit_calls("generate_bin.py")
    merge_edit = None
    for inp in edits:
        if "<<<<<<<" in inp.get("old_string", ""):
            merge_edit = inp
            break
    if merge_edit:
        old_s = merge_edit.get("old_string", "")
        new_s = merge_edit.get("new_string", "")
        payload = len(old_s) + len(new_s)
        print(f"  old_string : {len(old_s)}b")
        print(f"  new_string : {len(new_s)}b")
        print(f"  payload Edit (old+new, INPUT tokens del tool_use) : {payload}b")
        # Equivalente Bash real: un sed que borra los 3 marcadores de conflicto
        # y no necesita reproducir NADA del cuerpo — el auto-merge de git ya
        # habia dejado las dos mitades correctas, solo sobraban los marcadores.
        bash_equiv = (
            "sed -i -e '/^<<<<<<< HEAD$/d' -e 's/^=======$//' "
            "-e '/^>>>>>>> origin\\/feature\\/thyrox-l1$/d' "
            "src/session/generate_bin.py"
        )
        print(f"  equivalente Bash real (3 lineas de marcador, sin cuerpo) : {len(bash_equiv)}b")
        print(f"  ~ tokens del payload Edit (4 char/tok, NO medido)        : {payload/4:+.0f}")
        print(f"  ~ tokens del sed equivalente (4 char/tok, NO medido)     : {len(bash_equiv)/4:+.0f}")
    else:
        print("  No se identifico por contenido — ver manifest.blind_to")
    print(f"\n  Total llamadas Edit sobre generate_bin.py en toda la sesion: {len(edits)}")
    print("  (la mayoria NO son la resolucion del conflicto: son ediciones normales")
    print("   de las fases anteriores — implementar resolve_bin_name, el fix del")
    print("   separador guion/guion_bajo, etc. No se comparan aqui 1:1 contra Bash")
    print("   porque cada una tiene su propia alternativa y mezclar las 21 en un")
    print("   total unico seria el sub-patron A de metrica-decide-la-conclusion.md.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
