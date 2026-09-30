#!/usr/bin/env bash
# Verify del ítem, corrido con cwd en el worktree: instala las dependencias,
# construye los paquetes que el defecto toca y carga su entrada "." desde dist.
# Es el control de H-THYROX-262: con el `export *` dentro de __esm, cargar
# @thyrox/agent cae con SyntaxError; corregido, los cuatro cargan.
set -uo pipefail
bun install --frozen-lockfile >/dev/null || { echo "verify: bun install falló"; exit 1; }
bun src/verify/expandStarShims.ts --check $(git grep -lE "^export (type )?\* from '@thyrox/" -- 'src/packages/**/*.ts' ':!**/__tests__/**') || exit 1
bun test tests/verify/expandStarShims.test.ts || exit 1
PKGS=(); for p in src/packages/*; do [[ "$p" == */transparent-napi ]] || PKGS+=("$p"); done
bash bin/typescript-build-javascript "${PKGS[@]}" || exit 1
fails=0
for name in @thyrox/agent @thyrox/cli @thyrox/permission @thyrox/provider; do
  if timeout 60 bun -e "await import('$name')" </dev/null >/dev/null 2>&1; then echo "carga: $name ok"
  else echo "carga: $name FALLA"; fails=$((fails+1)); fi
done
# Los manifiestos repuntados y dist/ son salida del build, no del ítem.
git checkout -q -- 'src/packages/*/package.json'
exit $fails
