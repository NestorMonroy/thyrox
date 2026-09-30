#!/usr/bin/env bash
# Los paquetes de src/packages, con sus entradas bin/ y a qué dependencia
# operativa apuntan; y las piezas del proxy local.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
echo "== paquetes (nombre · entradas bin/*.ts · menciones de postgres|redis|ollama|podman)"
for dir in src/packages/*/; do
  name=$(basename "$dir")
  bins=$(find "$dir" -maxdepth 2 -path '*/bin/*.ts' 2>/dev/null | wc -l)
  infra=$(rg -l --glob '!**/__tests__/**' --glob '!**/node_modules/**' -i 'postgres|redis|ollama|podman' "$dir" </dev/null 2>/dev/null | wc -l)
  printf '%s\t%s\t%s\n' "$name" "$bins" "$infra"
done
echo "== entradas del proxy (provider/bin)"
ls src/packages/provider/bin/ | grep -iE 'proxy|server|mock'
echo "== upstreams del proxy (src/packages/provider/src/proxy)"
ls -d src/packages/provider/src/proxy/*/ | xargs -n1 basename
echo "== claves de entorno del proxy"
grep -oE '^THYROX_(PROXY|LOCAL_PROXY|CREDENTIAL_PROXY|OPENAI_COMPAT|REDIS_URL)[A-Z_]*=' .env.example | tr -d '=' | sort -u
