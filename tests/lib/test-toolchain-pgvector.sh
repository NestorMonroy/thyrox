#!/usr/bin/env bash
# test-toolchain-pgvector.sh — contrato de la adquisicion de pgvector, version
# FIJADA (0.8.6 por defecto, THYROX_PGVECTOR_VERSION).
#
# pgvector no es un binario: es una extension de PostgreSQL, y lo que su
# paquete entrega es `vector.control` en el directorio de extensiones del
# servidor. Su clave `default_version` es la que gobierna: que el archivo
# exista ya NO basta (el paquete de Ubuntu instala 0.6.0). El instalador por
# defecto compila la etiqueta `v<version>` desde el fuente contra el
# PostgreSQL de Ubuntu — PGDG queda descartado (H-THYROX-256). Mismo contrato
# que `test-toolchain-rsync.sh`; el caso que DISCRIMINA es el 7: un instalador
# que sale 0 sin dejar la version pedida.
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
CONTROL="$SHARE/extension/vector.control"
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

# Caso 1 (LA ROJA): una version DISTINTA a la pedida y sin opt-in — el simple
# archivo de control ya NO basta. Rehusa nombrando la instalada (0.6.0) y la
# pedida (0.8.6, el defecto de THYROX_PGVECTOR_VERSION).
printf "default_version = '0.6.0'\n" > "$CONTROL"
out="$(THYROX_INSTALL_PGVECTOR='' thyrox_toolchain_require_pgvector 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "una version distinta a la pedida rehusa (exit 2) aunque el control exista"
else bad "esperaba exit 2 con 0.6.0 instalada y 0.8.6 pedida, dio $rc: '$out'"; fi
if [[ "$out" == *"0.6.0"* && "$out" == *"0.8.6"* ]]; then
  ok "el rechazo nombra la version instalada y la pedida"
else
  bad "el rechazo no nombro las dos versiones: '$out'"
fi
if [[ "$out" == *THYROX_INSTALL_PGVECTOR* ]]; then
  ok "el rechazo nombra la variable de opt-in"
else
  bad "el rechazo no nombra THYROX_INSTALL_PGVECTOR: '$out'"
fi
rm -f "$CONTROL"

# Caso 3 — ausente (sin archivo) y sin opt-in: exit 2, nombra la variable de
# opt-in y las dos versiones (ninguna instalada / la pedida).
out="$(THYROX_INSTALL_PGVECTOR='' thyrox_toolchain_require_pgvector 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi
if [[ "$out" == *THYROX_INSTALL_PGVECTOR* && "$out" == *"0.8.6"* ]]; then
  ok "el rechazo nombra la variable de opt-in y la version pedida"
else
  bad "el rechazo no nombra THYROX_INSTALL_PGVECTOR ni 0.8.6: '$out'"
fi

# Caso — el instalador por defecto es la funcion que compila desde el fuente,
# no el paquete de Ubuntu ni PGDG.
cmd="$(thyrox_toolchain_pgvector_install_cmd)"
if [[ "$cmd" == "thyrox_toolchain_pgvector_install_default" ]]; then
  ok "el instalador por defecto es la funcion que compila desde el fuente"
else bad "instalador por defecto inesperado: '$cmd'"; fi

# Caso — el instalador declarado gana sobre el derivado.
cmd="$(THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD='echo propio' thyrox_toolchain_pgvector_install_cmd)"
if [[ "$cmd" == "echo propio" ]]; then ok "el instalador declarado gana"
else bad "el instalador declarado no gano: '$cmd'"; fi

# Caso 4 — con la version pedida YA presente, pasa sin invocar el instalador
# (marcador: un instalador declarado que nunca deberia correr).
printf "default_version = '0.8.6'\n" > "$CONTROL"
MARKER="$WORK/no-deberia-correr"
if THYROX_INSTALL_PGVECTOR='' \
   THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD="touch $MARKER" \
   thyrox_toolchain_require_pgvector >/dev/null 2>&1; then
  ok "con la version pedida ya presente pasa sin instalar"
else
  bad "con la version pedida ya presente deberia pasar"
fi
if [[ ! -e "$MARKER" ]]; then
  ok "no invoca el instalador cuando la version pedida ya esta"
else
  bad "invoco el instalador aunque la version pedida ya estaba"
fi
rm -f "$CONTROL"

# Caso 7 — EL QUE DISCRIMINA: instalador que sale 0 sin dejar la version
# pedida (deja OTRA version, o nada).
THYROX_INSTALL_PGVECTOR=1 THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD=true \
  thyrox_toolchain_require_pgvector >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then ok "un instalador que miente (no deja nada) NO se acepta"
else bad "esperaba exit 2 con instalador mentiroso (nada), dio $rc"; fi

cat > "$WORK/fake-installer-otra-version" <<STUB
#!/usr/bin/env bash
printf "default_version = '0.6.0'\n" > "$CONTROL"
STUB
chmod +x "$WORK/fake-installer-otra-version"
THYROX_INSTALL_PGVECTOR=1 THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD="$WORK/fake-installer-otra-version" \
  thyrox_toolchain_require_pgvector >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then ok "un instalador que deja OTRA version NO se acepta: se re-comprueba la version, no el exit"
else bad "esperaba exit 2 con instalador que deja otra version, dio $rc"; fi
rm -f "$CONTROL"

# Caso 8 — un instalador que SI deja la version pedida se acepta (exit 0).
cat > "$WORK/fake-installer-version-pedida" <<STUB
#!/usr/bin/env bash
printf "default_version = '0.8.6'\n" > "$CONTROL"
STUB
chmod +x "$WORK/fake-installer-version-pedida"
THYROX_INSTALL_PGVECTOR=1 THYROX_TOOLCHAIN_PGVECTOR_INSTALL_CMD="$WORK/fake-installer-version-pedida" \
  thyrox_toolchain_require_pgvector >/dev/null 2>&1; rc=$?
if [[ $rc -eq 0 ]]; then ok "un instalador que deja la version 0.8.6 pedida se acepta"
else bad "esperaba exit 0 con instalador que deja 0.8.6, dio $rc"; fi
rm -f "$CONTROL"


# --- El instalador por defecto compila desde el fuente, no apt-get pgvector -
FAKEBIN="$WORK/fakebin"; mkdir -p "$FAKEBIN"
export TRACE="$WORK/trace.log"; : > "$TRACE"
cat > "$FAKEBIN/sudo" <<'STUB'
#!/usr/bin/env bash
exec "$@"
STUB
cat > "$FAKEBIN/apt-get" <<'STUB'
#!/usr/bin/env bash
echo "apt-get $*" >> "$TRACE"
STUB
cat > "$FAKEBIN/git" <<'STUB'
#!/usr/bin/env bash
echo "git $*" >> "$TRACE"
STUB
cat > "$FAKEBIN/make" <<'STUB'
#!/usr/bin/env bash
echo "make $*" >> "$TRACE"
STUB
chmod +x "$FAKEBIN"/sudo "$FAKEBIN"/apt-get "$FAKEBIN"/git "$FAKEBIN"/make

( PATH="$FAKEBIN:$PATH" THYROX_PGVECTOR_VERSION=0.8.6 \
  THYROX_TOOLCHAIN_PG_CONFIG_BIN="$WORK/pg_config" \
  thyrox_toolchain_pgvector_install_default )
rc=$?
if [[ $rc -eq 0 ]]; then ok "el instalador por defecto termina 0 con herramientas simuladas"
else bad "el instalador por defecto fallo con herramientas simuladas: rc=$rc, trace='$(cat "$TRACE" 2>/dev/null)'"; fi

trace="$(cat "$TRACE" 2>/dev/null)"
if [[ "$trace" == *"postgresql-server-dev-16"* ]]; then
  ok "el instalador por defecto pide postgresql-server-dev-<mayor>, no postgresql-<mayor>-pgvector"
else bad "no se pidio postgresql-server-dev-16: '$trace'"; fi
if [[ "$trace" == *"--branch v0.8.6"* ]]; then
  ok "el instalador por defecto clona la etiqueta v<version>"
else bad "no se clono la etiqueta v0.8.6: '$trace'"; fi
if [[ "$trace" == *"PG_CONFIG=$WORK/pg_config"* ]]; then
  ok "make (build e install) se invoca con el pg_config declarado"
else bad "make no llevo PG_CONFIG declarado: '$trace'"; fi

# --- .env.example declara las dos variables nuevas -------------------------
if grep -q '^THYROX_PGVECTOR_VERSION=' "$ROOT/.env.example"; then
  ok "THYROX_PGVECTOR_VERSION esta en .env.example"
else
  bad "falta THYROX_PGVECTOR_VERSION en .env.example"
fi
if grep -q '^THYROX_PGVECTOR_SOURCE_URL=' "$ROOT/.env.example"; then
  ok "THYROX_PGVECTOR_SOURCE_URL esta en .env.example"
else
  bad "falta THYROX_PGVECTOR_SOURCE_URL en .env.example"
fi

thyrox_summary
