#!/usr/bin/env bash
# test-toolchain-pgvector.sh — contrato de la adquisicion de pgvector.
#
# pgvector no es un binario: es una extension de PostgreSQL, y lo que su
# paquete entrega es `vector.control` en el directorio de extensiones del
# servidor. El paquete depende de la version mayor (`postgresql-16-pgvector`),
# asi que el instalador se deriva de `pg_config`. Mismo contrato que
# `test-toolchain-rsync.sh`; el caso que DISCRIMINA es el 7: un instalador que
# sale 0 sin dejar el archivo de control.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

if type thyrox_toolchain_require_pgvector &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_pgvector en $SUBJECT"
  thyrox_summary; exit 1
fi

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
SHARE="$WORK/share"; mkdir -p "$SHARE/extension"
# Un pg_config falso: declara la version mayor y el directorio compartido.
cat > "$WORK/pg_config" <<STUB
#!/usr/bin/env bash
case "\$1" in
  --version)  echo "PostgreSQL 16.13 (fake)";;
  --sharedir) echo "$SHARE";;
esac
STUB
chmod +x "$WORK/pg_config"
export THYROX_TOOLCHAIN_PG_CONFIG_BIN="$WORK/pg_config"

# Caso 2 — sin pg_config: REHUSA, y nombra que falta el servidor.
out="$(THYROX_TOOLCHAIN_PG_CONFIG_BIN="pg-config-que-no-existe" THYROX_INSTALL_PGVECTOR=1 \
       thyrox_toolchain_require_pgvector 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *pg_config* ]]; then ok "sin pg_config rehusa nombrandolo"
else bad "sin pg_config esperaba exit 2 nombrando pg_config, dio $rc: '$out'"; fi

# Caso 3 — ausente y sin opt-in: exit 2, nombra la variable y el paquete de la mayor.
out="$(THYROX_INSTALL_PGVECTOR='' thyrox_toolchain_require_pgvector 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi
if [[ "$out" == *THYROX_INSTALL_PGVECTOR* && "$out" == *postgresql-16-pgvector* ]]; then
  ok "el rechazo nombra la variable de opt-in y el paquete de la version mayor"
else
  bad "el rechazo no nombra THYROX_INSTALL_PGVECTOR ni postgresql-16-pgvector: '$out'"
fi

# Caso 4 — el instalador por defecto se deriva de la version mayor.
cmd="$(thyrox_toolchain_pgvector_install_cmd)"
if [[ "$cmd" == *"install -y postgresql-16-pgvector"* ]]; then ok "el instalador por defecto pide postgresql-16-pgvector"
else bad "instalador por defecto inesperado: '$cmd'"; fi

# Caso 5 — el instalador declarado gana sobre el derivado.
cmd="$(THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD='echo propio' thyrox_toolchain_pgvector_install_cmd)"
if [[ "$cmd" == "echo propio" ]]; then ok "el instalador declarado gana"
else bad "el instalador declarado no gano: '$cmd'"; fi

# Caso 6 — control positivo: con el archivo de control presente pasa sin opt-in.
: > "$SHARE/extension/vector.control"
if THYROX_INSTALL_PGVECTOR='' thyrox_toolchain_require_pgvector >/dev/null 2>&1; then
  ok "con vector.control presente pasa sin instalar"
else
  bad "con vector.control presente deberia pasar"
fi
rm -f "$SHARE/extension/vector.control"

# Caso 7 — EL QUE DISCRIMINA: instalador que sale 0 sin dejar el control.
THYROX_INSTALL_PGVECTOR=1 THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD=true \
  thyrox_toolchain_require_pgvector >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then ok "un instalador que miente NO se acepta: se re-comprueba el control"
else bad "esperaba exit 2 con instalador mentiroso, dio $rc"; fi

# Caso 8 — un instalador que SI deja el control pasa.
THYROX_INSTALL_PGVECTOR=1 THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD="touch $SHARE/extension/vector.control" \
  thyrox_toolchain_require_pgvector >/dev/null 2>&1; rc=$?
if [[ $rc -eq 0 ]]; then ok "un instalador que deja vector.control se acepta"
else bad "esperaba exit 0 con instalador real, dio $rc"; fi

thyrox_summary
