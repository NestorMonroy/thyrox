"""Busca en el transcript real de esta sesion (JSONL) el momento en que el
ejecutor pregunto por primera vez que hacia falta instalar para usar thyrox
como proveedor, y compara contra el momento en que el gap real de package.json
(campo "workspaces" ausente) se descubrio y se corrigio.

No asume nada de memoria: cada afirmacion sale de un grep/parseo del propio
archivo, citado con su numero de linea real.
"""
import json
import sys

TRANSCRIPT = "/root/.claude/projects/-home-user/e8588da7-9c13-569f-ab69-f974894396e4.jsonl"


def iter_records(path):
    with open(path, "r", errors="replace") as fh:
        for i, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            yield i, obj


def text_of(obj):
    msg = obj.get("message", {})
    content = msg.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for c in content:
            if isinstance(c, dict) and c.get("type") == "text":
                parts.append(c.get("text", ""))
        return "\n".join(parts)
    return ""


def find_user_mentions(path, keywords):
    hits = []
    for i, obj in iter_records(path):
        if obj.get("type") != "user":
            continue
        text = text_of(obj)
        if not text.strip():
            continue
        low = text.lower()
        if any(k in low for k in keywords):
            hits.append((i, text[:400]))
    return hits


def main():
    print("=== 1. Menciones RAW de @thyrox / paquetes / instalar-para-thyrox"
          " en turnos de usuario (todo el archivo) ===")
    hits = find_user_mentions(
        TRANSCRIPT,
        ["@thyrox"],
    )
    for i, t in hits:
        print(f"LINE {i} :: {t[:200].replace(chr(10), ' ')}")
    print(f"TOTAL @thyrox en turnos de usuario: {len(hits)}")

    print()
    print("=== 2. La UNICA pregunta real anterior a esta sesion sobre "
          "'que hace falta instalar' (linea 177 esperada) ===")
    hits2 = find_user_mentions(TRANSCRIPT, ["instala"])
    for i, t in hits2[:5]:
        print(f"LINE {i} :: {t[:300].replace(chr(10), ' ')}")

    print()
    print("=== 3. Los 6 puntos de compactacion del transcript (limite de lo "
          "recuperable) ===")
    marker = "This session is being continued from a previous conversation"
    for i, obj in iter_records(TRANSCRIPT):
        text = text_of(obj)
        if marker in text:
            print(f"LINE {i}")

    print()
    print("=== 4. Confirmar que NINGUNA de las 4 sintesis de compactacion "
          "menciona bun/workspaces ANTES del descubrimiento reactivo ===")
    for target in (1297, 1778, 2203):
        for i, obj in iter_records(TRANSCRIPT):
            if i != target:
                continue
            text = text_of(obj)
            low = text.lower()
            found = [k for k in ("bun install", "workspaces", "@thyrox") if k in low]
            print(f"LINE {i}: keywords encontradas = {found}")


if __name__ == "__main__":
    main()
