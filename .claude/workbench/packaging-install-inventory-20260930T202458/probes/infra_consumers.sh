#!/usr/bin/env bash
# Qué paquete consume infraestructura operativa, en dos ejes:
#  directo    — su código de producción lee una clave de conexión a
#               infraestructura o abre la conexión (openByUrl, Bun.SQL,
#               cliente Redis, ejecutor de Podman);
#  transitivo — su package.json depende de un paquete que la abre.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
keys='THYROX_[A-Z_]*DATABASE_URL|THYROX_TEST_POSTGRES_URL|THYROX_REDIS_URL|THYROX_PROXY_MODE|THYROX_OPENAI_COMPAT_[A-Z_]+|THYROX_INFRA_[A-Z_]+|THYROX_TOOLCHAIN_PODMAN_BIN'
opens='openByUrl\(|new SQL\(|Bun\.SQL|RedisClient|from .redis.|createPodmanExecutor|podman'
printf 'paquete\tclaves\taperturas\tdepende_de\n'
for dir in src/packages/*/; do
  name=$(basename "$dir")
  prod=(--glob '*.ts' --glob '*.tsx' --glob '!**/__tests__/**' --glob '!**/*.test.ts' --glob '!**/node_modules/**' --glob '!**/dist/**')
  keys_hit=$(rg -o --no-filename "${prod[@]}" -e "$keys" "$dir" </dev/null 2>/dev/null | sort -u | tr '\n' ',' )
  open_hit=$(rg -l "${prod[@]}" -e "$opens" "$dir" </dev/null 2>/dev/null | wc -l)
  deps=$(jq -r '(.dependencies // {}) | keys[]' "$dir/package.json" 2>/dev/null | grep -E '^@thyrox/(store|shared-state|semantic-search|daemon)$' | tr '\n' ',')
  if [ -n "$keys_hit" ] || [ "$open_hit" -gt 0 ] || [ -n "$deps" ]; then
    printf '%s\t%s\t%s\t%s\n' "$name" "${keys_hit:--}" "$open_hit" "${deps:--}"
  fi
done
