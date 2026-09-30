#!/usr/bin/env bash
# Verify del ítem, con cwd en el worktree: construye los 51 paquetes (transparent-napi
# incluido) y carga desde dist la entrada "." de cada paquete *-napi que la declara.
set -uo pipefail
bun install --frozen-lockfile >/dev/null || { echo "verify: bun install falló"; exit 1; }
bun test tests/typescript/buildJavascript.test.ts || exit 1
bash bin/typescript-build-javascript src/packages/* || exit 1
bash bin/typescript-build-javascript --check src/packages/* || exit 1
fails=0
for p in src/packages/*napi*; do
  jq -e '.exports | has(".")' "$p/package.json" >/dev/null || continue
  name="$(jq -r .name "$p/package.json")"
  if timeout 60 bun -e "await import('$name')" </dev/null >/dev/null 2>&1; then echo "carga: $name ok"
  else echo "carga: $name FALLA"; fails=$((fails+1)); fi
done
n="$(find src/packages -path '*/dist/*' -name '*.node' | wc -l)"
echo "dist: $n archivo(s) .node copiado(s)"
[[ "$n" -eq 0 ]] || fails=$((fails+1))
git checkout -q -- 'src/packages/*/package.json'
exit $fails
