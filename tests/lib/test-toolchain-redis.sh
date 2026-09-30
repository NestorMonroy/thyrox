#!/usr/bin/env bash
# test-toolchain-redis.sh — contrato de la adquisicion de `redis-server`.
#
# `redis-server` no viene en este contenedor (medido: `command -v redis-server`
# vacio). Mismo contrato que `test-toolchain-pgvector.sh`: instalar es opt-in,
# el rechazo no instala, y el exito se RE-COMPRUEBA sobre el binario, no sobre
# el exit de apt. La diferencia con `test-toolchain-rsync.sh` es que aqui la
# re-comprobacion invoca `--version`, asi que el control positivo necesita un
# binario falso que sepa responderlo — `sh` no basta para probarlo.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

# El contenedor puede traer funciones thyrox_toolchain_* ya exportadas de un
# proceso anterior (BASH_FUNC_*%%): el guard de doble inclusion de
# toolchain.sh las tomaria como ya cargadas y no resourcearia nada, dejando
# fuera cualquier funcion nueva del archivo. Se limpian antes de sourcear
# para partir de un proceso sin esa contaminacion.
for _stale in $(declare -F | awk '{print $3}' | grep '^thyrox_toolchain_' || true); do
  unset -f "$_stale"
done
unset _stale

source "$SUBJECT" 2>/dev/null || true

if type thyrox_toolchain_require_redis &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_redis en $SUBJECT"
  thyrox_summary; exit 1
fi

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
MISSING="thyrox-redis-que-no-existe-$$"

# Un `redis-server` falso que SI responde --version.
cat > "$WORK/redis-server-real" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  --version) echo "Redis server v=7.0.0 (fake)"; exit 0;;
esac
exit 1
STUB
chmod +x "$WORK/redis-server-real"

# Un `redis-server` falso que RESUELVE en el PATH pero no responde --version.
cat > "$WORK/redis-server-mudo" <<'STUB'
#!/usr/bin/env bash
exit 1
STUB
chmod +x "$WORK/redis-server-mudo"

# Caso 1 — binario presente y que responde --version: pasa sin instalar, y
# THYROX_TOOLCHAIN_REDIS_BIN queda resuelto a su ruta absoluta.
out="$(THYROX_TOOLCHAIN_REDIS_BIN="$WORK/redis-server-real" THYROX_INSTALL_REDIS='' \
       bash -c "source '$SUBJECT'; thyrox_toolchain_require_redis && printf '%s' \"\$THYROX_TOOLCHAIN_REDIS_BIN\"")"
if [[ "$out" == "$WORK/redis-server-real" ]]; then
  ok "un binario presente que responde --version pasa y resuelve THYROX_TOOLCHAIN_REDIS_BIN"
else
  bad "esperaba THYROX_TOOLCHAIN_REDIS_BIN='$WORK/redis-server-real', dio '$out'"
fi

# Caso 2 — ausente y sin opt-in: REHUSA con exit 2, y no instala nada.
out="$(THYROX_TOOLCHAIN_REDIS_BIN="$MISSING" THYROX_INSTALL_REDIS='' \
       THYROX_TOOLCHAIN_REDIS_INSTALL_CMD="touch $WORK/instalo-sin-permiso" \
       thyrox_toolchain_require_redis 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi
if [[ -e "$WORK/instalo-sin-permiso" ]]; then
  bad "sin opt-in NO debia instalar, y lo hizo"
else
  ok "sin opt-in no ejecuta el instalador"
fi

# Caso 3 — el rechazo nombra la variable de opt-in y el paquete.
if [[ "$out" == *THYROX_INSTALL_REDIS* && "$out" == *"paquete redis-server"* ]]; then
  ok "el rechazo nombra la variable de opt-in y el paquete"
else
  bad "el rechazo no nombra THYROX_INSTALL_REDIS ni el paquete redis-server: '$out'"
fi

# Caso 4 — EL QUE DISCRIMINA: ausente, con opt-in, e instalador que sale 0
# sin dejar el binario. NO se acepta.
THYROX_TOOLCHAIN_REDIS_BIN="$MISSING" \
THYROX_INSTALL_REDIS=1 \
THYROX_TOOLCHAIN_REDIS_INSTALL_CMD=true \
  thyrox_toolchain_require_redis >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un instalador que miente sin dejar el binario NO se acepta"
else
  bad "esperaba exit 2 con instalador mentiroso sin binario, dio $rc"
fi

# Caso 5 — un instalador falso que sale 0 y SI resuelve en el PATH, pero el
# binario resultante no responde --version. Tampoco se acepta: la
# re-comprobacion es --version, no `command -v`.
THYROX_TOOLCHAIN_REDIS_BIN="$WORK/redis-server-mudo" \
THYROX_INSTALL_REDIS=1 \
THYROX_TOOLCHAIN_REDIS_INSTALL_CMD=true \
  thyrox_toolchain_require_redis >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un binario que resuelve pero no responde --version NO se acepta"
else
  bad "esperaba exit 2 con binario mudo, dio $rc"
fi

# Caso 6 — un instalador que SI deja un binario funcional se acepta.
THYROX_TOOLCHAIN_REDIS_BIN="$WORK/redis-server-real" \
THYROX_INSTALL_REDIS='' \
  thyrox_toolchain_require_redis >/dev/null 2>&1; rc=$?
if [[ $rc -eq 0 ]]; then
  ok "un binario real, ya presente, se acepta sin instalar"
else
  bad "esperaba exit 0 con binario real, dio $rc"
fi

# Caso 7 — el instalador por defecto pide el paquete redis-server.
if [[ "${THYROX_TOOLCHAIN_REDIS_INSTALL_CMD:-}" == *"install -y redis-server"* ]]; then
  ok "el instalador por defecto pide el paquete redis-server"
else
  bad "el instalador por defecto no pide redis-server: '${THYROX_TOOLCHAIN_REDIS_INSTALL_CMD:-}'"
fi

thyrox_summary
