#!/usr/bin/env bash
# El pre-commit de thyrox corre el gate de idioma de identificadores sobre los
# .py staged de src/ y tests/.
#
# Medido 2026-09-27: el gate vivía en el proveedor y NINGÚN hook lo corría
# sobre el proveedor — 2081 identificadores en español en 574 archivos, sin
# que nada lo dijera. El gate real tiene su propia suite; aquí se mide el
# CABLEADO con un espía: qué archivos recibe y si su rechazo detiene el commit.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cd "$TMP" && git init -q && git config user.email t@t && git config user.name t
mkdir -p .githooks src/verify src/task tests docs
cp "$HERE/.githooks/pre-commit" .githooks/pre-commit
for gate in check-agent-artifacts.sh check-cli-typecheck.sh check-cross-model-read.sh; do
    printf '#!/usr/bin/env bash\nexit 0\n' > "src/verify/$gate"
done
for gate in check_provider_evidence.py check_bench_untracked.py check_cache_layout.py check_single_workspace_root.py commit_identity.py check_lint_zero.py; do
    printf 'import sys\nsys.exit(0)\n' > "src/verify/$gate"
done
# El espía anota sus argumentos y sale con lo que diga `veredicto`.
cat > src/verify/check_identifier_language.py <<'PY'
import pathlib, sys
pathlib.Path('recibidos.txt').write_text('\n'.join(sys.argv[1:]) + '\n')
sys.exit(int(pathlib.Path('veredicto').read_text()) if pathlib.Path('veredicto').exists() else 0)
PY
printf 'x = 1\n' > src/modulo.py
printf 'y = 2\n' > tests/prueba.py
printf 'texto\n' > docs/nota.md
printf 'z = 3\n' > otro.py
git add src/modulo.py tests/prueba.py docs/nota.md otro.py

passed=0; failed=0
check() {
    if [[ "$2" == "$3" ]]; then passed=$((passed+1)); echo "  ok    $1"
    else failed=$((failed+1)); echo "  FALLA $1 — esperado [$2], obtenido [$3]"; fi
}
echo "test-pre-commit-identifier-language:"
bash .githooks/pre-commit >/dev/null 2>&1; CODE=$?
check "con el gate en verde, el hook sale 0" "0" "$CODE"
check "recibe los .py staged de src/ y tests/" "src/modulo.py tests/prueba.py" \
    "$(tr '\n' ' ' < recibidos.txt | sed 's/ $//')"
echo 1 > veredicto
bash .githooks/pre-commit >/dev/null 2>&1; CODE=$?
check "su rechazo detiene el commit" "1" "$CODE"
rm -f recibidos.txt veredicto
git reset -q -- src/modulo.py tests/prueba.py
bash .githooks/pre-commit >/dev/null 2>&1
check "sin .py de src/ ni tests/ staged, no se invoca" "no" \
    "$([[ -f recibidos.txt ]] && echo si || echo no)"
echo "test-pre-commit-identifier-language: $((passed+failed)) aserciones — $passed ok, $failed falla(s)"
exit $((failed > 0))
