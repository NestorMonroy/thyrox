#!/usr/bin/env bash
# Veredicto del bootstrap de un candidato a partir de su evidencia, sin llamar
# al modelo. Los criterios requeridos deciden la salida; las observaciones
# (caché, repetición idéntica, precio, latencia) se publican y no bloquean.
#   exit 0  todos los requeridos pasan · exit 3  falla alguno · exit 2  sin evidencia
# Uso: cutover_verdict.sh <cutover-bootstrap-<modelo>.jsonl>
set -uo pipefail
evidence="$1"
[[ -s "$evidence" ]] || { echo "sin evidencia: $evidence" >&2; exit 2; }
jq -s '
  def check(name): (map(select(.check == name))[0]);
  {
    required: {
      secret_visible: check("secret_visible").ok,
      authentication: check("authentication").ok,
      simple_response_with_content: check("simple_request").ok,
      structured_tool_call: check("structured_tool_call").ok,
      file_tool_capability: check("file_read").ok,
      controlled_modification: check("controlled_modification").ok,
      thyrox_p_parseable_result: check("parseable_result").ok
    },
    observations: {
      context_answer_correct: [check("context_request_1").ok, check("context_request_2").ok],
      cached_tokens_second_request: (check("context_request_2").detail.usage.cached // null),
      identical_repetition: (check("context_request_1").detail.answer == check("context_request_2").detail.answer)
    }
  } | .requiredFailed = ([.required | to_entries[] | select(.value != true) | .key])' "$evidence" > "${evidence%.jsonl}.verdict.json"
failed="$(jq -r '.requiredFailed | length' "${evidence%.jsonl}.verdict.json")"
jq -c '{requiredFailed, observations}' "${evidence%.jsonl}.verdict.json"
[[ "$failed" -eq 0 ]] || exit 3
