#!/bin/sh
# T008, ruta C: qué modelos de embeddings anuncia el upstream OpenAI-compatible.
# Corre en una unidad con la clave montada como secreto; nunca la imprime ni la
# escribe. Emite JSON con los ids que el upstream declara y el código HTTP.
set -eu
key="$(cat /run/secrets/THYROX_OPENAI_COMPAT_API_KEY)"
base="$(cat /run/secrets/THYROX_OPENAI_COMPAT_BASE_URL)"
body="$(curl -sS -m 30 -w '\n%{http_code}' -H "Authorization: Bearer $key" "${base%/}/models" || true)"
code="$(printf '%s' "$body" | tail -n 1)"
printf '%s' "$body" | sed '$d' | python3 -c '
import json, sys
code = sys.argv[1]
try:
    ids = sorted(m.get("id", "") for m in json.load(sys.stdin).get("data", []))
except Exception:
    ids = []
emb = [i for i in ids if "embed" in i.lower()]
print(json.dumps({"httpStatus": code, "modelCount": len(ids), "embeddingModelIds": emb}))' "$code"
