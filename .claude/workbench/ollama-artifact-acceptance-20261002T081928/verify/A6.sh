#!/usr/bin/env bash
# A6: la entrada del Qwen y su política, leídas de vuelta. Datos, no código.
# Exige MODEL_POLICY_FILE (la política de la sesión propietaria); sin ella rehúsa con 2.
set -uo pipefail
root="$(git -C "$PWD" rev-parse --show-toplevel)"; cd "$root" || exit 2
: "${MODEL_POLICY_FILE:?A6: declara MODEL_POLICY_FILE}"
note1='Upstream equivalence was not verified. No byte-by-byte or tensor-by-tensor comparison against Qwen/Qwen2.5-7B-Instruct-GGUF was performed.'
entry="$(bash bin/local-models-catalog list --json | jq -c '.[] | select(.artifact.sha256 | startswith("2bada8a7"))')" || exit 2
[[ -n "$entry" ]] || { echo "A6: no hay entrada con sha256 2bada8a7…"; exit 1; }
rc=0
jq -e '.source == "ollama"' <<<"$entry" >/dev/null || { echo "A6: source != ollama"; rc=1; }
jq -e '.license == "apache-2.0"' <<<"$entry" >/dev/null || { echo "A6: licencia distinta de la del GGUF"; rc=1; }
jq -e '.compatibleRuntimes == ["ollama"]' <<<"$entry" >/dev/null || { echo "A6: compatibleRuntimes"; rc=1; }
jq -e --arg n "$note1" '.provenanceNotes | index($n) != null' <<<"$entry" >/dev/null || { echo "A6: falta la nota de procedencia verbatim"; rc=1; }
jq -e '.allowed[] | select(.runtime=="ollama" and .source=="ollama" and (.repository|ascii_downcase)=="library/qwen2.5-7b-instruct")' "$MODEL_POLICY_FILE" >/dev/null \
  || { echo "A6: la política no permite el artefacto"; rc=1; }
echo "A6 exit=$rc"; exit "$rc"
