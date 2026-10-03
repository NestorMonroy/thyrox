#!/usr/bin/env bash
# Dependencias operativas detectables por paquete, en filas de
# (paquete, dependencia, tipo, relación, alcance, evidencia).
#
# NO decide qué entra al ejecutable (eso es de P1–P7) ni la capa de nadie:
# sólo inventaría dependencias detectables en el código.
#   relación  directa        el código del paquete lee la clave o abre/invoca
#             primer-grado   el package.json depende de un paquete con una
#                            dependencia directa (exposición, no alcance: no
#                            prueba que un camino de ejecución llegue a ella)
#   alcance   produccion     código fuera de __tests__, *.test.ts y testing/
#             arnes-de-prueba  testing/ exportado por el paquete: capacidad
#                            para pruebas, no requisito de ejecución
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}" || exit 2
declare -A KIND=( [PostgreSQL]=base-de-datos [Redis]=almacen-efimero [Podman]=runtime-de-ejecucion [OpenAI-compatible]=upstream-de-modelo )
declare -A PATTERN=(
  [PostgreSQL]='THYROX_[A-Z_]*DATABASE_URL|THYROX_TEST_POSTGRES_URL|openByUrl\(|new SQL\(|Bun\.SQL'
  [Redis]='THYROX_REDIS_URL|RedisClient'
  [Podman]='THYROX_TOOLCHAIN_PODMAN_BIN|createPodmanExecutor'
  [OpenAI-compatible]='THYROX_OPENAI_COMPAT_[A-Z_]+'
)
common=(--glob '*.ts' --glob '*.tsx' --glob '!**/__tests__/**' --glob '!**/*.test.ts' --glob '!**/node_modules/**' --glob '!**/dist/**')
declare -A DIRECT
# Archivos cuyo CÓDIGO (no un comentario) casa el patrón: una línea de
# comentario que nombra «Bun.SQL» para decir que no se usa no es una apertura
# (falso positivo medido en provider/src/accounts/connectionSchema.ts:76).
code_matches() {
  local pattern="$1" root="$2"; shift 2
  rg -n --no-heading "${common[@]}" "$@" -e "$pattern" "$root" </dev/null 2>/dev/null \
    | gawk -F: '{ line = $0; sub(/^[^:]*:[0-9]+:/, "", line); if (line !~ /^[[:space:]]*(\*|\/\/|\/\*)/) print $1 }' \
    | sort -u | head -3 | tr '\n' ' '
}
printf 'paquete\tdependencia\ttipo\trelacion\talcance\tevidencia\n'
for dir in src/packages/*/; do
  pkg=$(basename "$dir")
  for dep in "${!PATTERN[@]}"; do
    prod=$(code_matches "${PATTERN[$dep]}" "$dir" --glob '!**/testing/**')
    harness=""
    [ -d "$dir/testing" ] && harness=$(code_matches "${PATTERN[$dep]}" "$dir/testing")
    if [ -n "$prod" ]; then
      printf '%s\t%s\t%s\tdirecta\tproduccion\t%s\n' "$pkg" "$dep" "${KIND[$dep]}" "$prod"
      DIRECT["$pkg|$dep"]=1
    fi
    [ -n "$harness" ] && printf '%s\t%s\t%s\tdirecta\tarnes-de-prueba\t%s\n' "$pkg" "$dep" "${KIND[$dep]}" "$harness"
  done
done
for dir in src/packages/*/; do
  pkg=$(basename "$dir")
  for target in $(jq -r '(.dependencies // {}) | keys[]' "$dir/package.json" 2>/dev/null | sed -n 's#^@thyrox/##p'); do
    for dep in "${!PATTERN[@]}"; do
      if [ -n "${DIRECT[$target|$dep]:-}" ] && [ -z "${DIRECT[$pkg|$dep]:-}" ]; then
        printf '%s\t%s\t%s\tprimer-grado\tproduccion\tpackage.json -> @thyrox/%s\n' "$pkg" "$dep" "${KIND[$dep]}" "$target"
      fi
    done
  done
done
