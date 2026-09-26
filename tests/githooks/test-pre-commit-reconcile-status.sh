#!/usr/bin/env bash
# Control de la rama de reconciliación del store en `.githooks/pre-commit`.
#
# Episodio (2026-09-23): el hook publicó «la reconciliacion board->store fallo
# (exit 0)». Un fallo con código 0 no distingue nada: el `echo >&2` que abre
# la rama `else` ponía `$?` a 0 antes de imprimirlo, y el código real —2, la
# raíz de boards no existe en el contenedor— se perdía.
#
# Se monta un repositorio temporal con el hook real y gates falsos que salen
# 0, y un `board_sync.py` falso que sale 2. El hook tiene que nombrar el 2.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP" && git init -q && git config user.email t@t && git config user.name t
mkdir -p .githooks src/verify src/task agent-results
cp "$HERE/.githooks/pre-commit" .githooks/pre-commit
for gate in check-agent-artifacts.sh check-cli-typecheck.sh check-cross-model-read.sh; do
    printf '#!/usr/bin/env bash\nexit 0\n' > "src/verify/$gate"
done
for gate in check_provider_evidence.py check_bench_untracked.py check_cache_layout.py commit_identity.py; do
    printf 'import sys\nsys.exit(0)\n' > "src/verify/$gate"
done
printf 'import sys\nsys.exit(2)\n' > src/task/board_sync.py
printf 'store\n' > agent-results/agent_store.sqlite3
git add -A
OUT="$(bash .githooks/pre-commit 2>&1)"
passed=0; failed=0
check() {
    if [[ "$2" == "$3" ]]; then passed=$((passed+1)); echo "  ok    $1"
    else failed=$((failed+1)); echo "  FALLA $1 — esperado $2, obtenido $3"; fi
}
echo "test-pre-commit-reconcile-status:"
check "el fallo de la reconciliación nombra su código real" "1" \
    "$(grep -c 'reconciliacion board->store fallo (exit 2)' <<<"$OUT")"
check "y no bloquea el commit: el store es telemetría" "0" "$(bash .githooks/pre-commit >/dev/null 2>&1; echo $?)"
echo "test-pre-commit-reconcile-status: $((passed+failed)) aserciones — $passed ok, $failed falla(s)"
exit $((failed > 0))
