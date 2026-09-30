#!/usr/bin/env bash
# El pre-commit reparte a los gates las rutas que el commit prepara, y un
# RENOMBRE es una de ellas.
#
# Medido 2026-09-27 (commit 4357a89f, 23 `git mv` de pruebas a `__tests__`):
# la lista salía de `git diff --cached --diff-filter=ACM`, que excluye el
# estado R. Un commit hecho sólo de renombres llegaba con la lista vacía a
# los gates que se disparan por ruta, y el de frontera de paquete no corrió.
# Aquí se mide el CABLEADO con un espía, no el gate real.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP:?}"' EXIT
cd "$TMP" && git init -q && git config user.email t@t && git config user.name t
mkdir -p .githooks src/verify src/pkg/__tests__ src/pkg/src
cp "$HERE/.githooks/pre-commit" .githooks/pre-commit
# shellcheck source=tests/githooks/stub_hook_gates.sh
source "$HERE/tests/githooks/stub_hook_gates.sh"
stub_hook_gates .githooks/pre-commit .
# El espía anota que el gate de frontera se invocó.
cat > src/verify/package_boundary.py <<'PY'
import pathlib, sys
pathlib.Path('invocado').write_text(' '.join(sys.argv[1:]) + '\n')
sys.exit(0)
PY
printf 'export const a = 1\n' > src/pkg/src/a.test.ts
git add src && git commit -q --no-verify -m seed

passed=0; failed=0
check() {
    if [[ "$2" == "$3" ]]; then passed=$((passed+1)); echo "  ok    $1"
    else failed=$((failed+1)); echo "  FALLA $1 — esperado [$2], obtenido [$3]"; fi
}
echo "test-pre-commit-renamed-paths:"
git mv src/pkg/src/a.test.ts src/pkg/__tests__/a.test.ts
check "el índice registra el cambio como renombre" "R" \
    "$(git diff --cached --name-status | cut -c1)"
bash .githooks/pre-commit >/dev/null 2>&1
check "un commit sólo de renombres invoca el gate de frontera" "si" \
    "$([[ -f invocado ]] && echo si || echo no)"
rm -f invocado
git reset -q --hard
printf 'x\n' > README
git add README
bash .githooks/pre-commit >/dev/null 2>&1
check "sin rutas de código staged, no se invoca" "no" \
    "$([[ -f invocado ]] && echo si || echo no)"
echo "test-pre-commit-renamed-paths: $((passed+failed)) aserciones — $passed ok, $failed falla(s)"
exit $((failed > 0))
