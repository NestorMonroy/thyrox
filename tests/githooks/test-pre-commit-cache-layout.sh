#!/usr/bin/env bash
# El pre-commit de thyrox valida la forma de su propio `.claude/cache/`.
#
# Episodio (2026-09-25): `check_cache_layout.py` sólo estaba cableado en el
# pre-commit COMPARTIDO de los consumidores (`src/verify/pre-commit.sh`), no en
# el de thyrox; y el registro de gates no lo conocía. Un archivo suelto en la
# raíz del caché del proveedor no chocaba con nada.
#
# Se monta un repositorio temporal con el hook real y gates falsos que salen 0,
# salvo `check_cache_layout.py`, que anota sus argumentos y sale 1: el hook
# tiene que llamarlo con `--staged --strict` y su fallo tiene que bloquear.
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
for gate in check_provider_evidence.py check_bench_untracked.py commit_identity.py; do
    printf 'import sys\nsys.exit(0)\n' > "src/verify/$gate"
done
printf 'import sys\nsys.exit(0)\n' > src/task/board_sync.py
cat > src/verify/check_cache_layout.py <<PY
import sys
open("$TMP/cache-args", "w").write(" ".join(sys.argv[1:]))
sys.exit(1)
PY
printf 'store\n' > agent-results/agent_store.sqlite3
git add -A
bash .githooks/pre-commit >/dev/null 2>&1; CODE=$?
passed=0; failed=0
check() {
    if [[ "$2" == "$3" ]]; then passed=$((passed+1)); echo "  ok    $1"
    else failed=$((failed+1)); echo "  FALLA $1 — esperado $2, obtenido $3"; fi
}
echo "test-pre-commit-cache-layout:"
check "el pre-commit llama al gate del caché" "1" "$([[ -f $TMP/cache-args ]] && echo 1 || echo 0)"
check "sobre lo preparado y en modo estricto" "1" \
    "$(gawk '/--staged/ && /--strict/ {n++} END{print n+0}' "$TMP/cache-args" 2>/dev/null)"
check "su fallo bloquea el commit" "1" "$CODE"
echo "test-pre-commit-cache-layout: $((passed+failed)) aserciones — $passed ok, $failed falla(s)"
exit $((failed > 0))
