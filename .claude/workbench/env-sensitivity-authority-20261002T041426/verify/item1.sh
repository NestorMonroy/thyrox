#!/usr/bin/env bash
# Verificación declarada de TASK-THYROX-0765: la prueba del ítem, el contrato
# sobre el árbol real, los casos RED de la fuente de verdad por la CLI generada,
# el gate cableado y los linters del pre-commit sobre sus archivos.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
library=src/verify/env_sensitivity.py suite=tests/verify/test_env_sensitivity.py
test -f "$library" && test -f "$suite" || { echo "verify: falta $library o $suite" >&2; exit 1; }
PYTHONDONTWRITEBYTECODE=1 python3 "$suite" || exit 1
bash bin/env_sensitivity check || exit 1
for expected in THYROX_TOOLCHAIN_INTERPRETER_PATH:config THYROX_CODE_MAX_OUTPUT_TOKENS:config \
    CACHE_KEY_PREFIX:unclassified THYROX_SEMANTIC_SEARCH_DATABASE_URL:credential THYROX_BG_CLAIM_AUTH:credential; do
  name="${expected%%:*}" class="${expected#*:}"
  got="$(bash bin/env_sensitivity classify "$name" | gawk -F'\t' '{ print $2 }')"
  [[ "$got" == "$class" ]] || { echo "verify: $name se clasificó '$got', se esperaba '$class'" >&2; exit 1; }
done
python3 src/session/generate_bin.py --check || exit 1
grep -q "env_sensitivity" .githooks/pre-commit || { echo "verify: check no está cableado en pre-commit" >&2; exit 1; }
git diff --quiet -- src/verify/env_sensitivity.tsv || { echo "verify: la autoridad se editó" >&2; exit 1; }
bash bin/check_lint_zero "$library" "$suite"
