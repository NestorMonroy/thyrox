#!/usr/bin/env bash
# test-toolchain-podman.sh — contrato de la adquisicion de `podman`.
#
# `podman` no viene en este contenedor (medido: `command -v podman` vacio).
# Mismo contrato que `test-toolchain-redis.sh`: instalar es opt-in, el
# rechazo no instala, y el exito se RE-COMPRUEBA. La diferencia con redis es
# la re-comprobacion en si: `podman info` inicializa el runtime OCI y el
# almacenamiento, asi que un `command -v` o un `--version` que respondan no
# prueban que un contenedor pueda arrancar — un runtime roto (runc ausente,
# cgroups mal montados) resuelve en el PATH y responde --version igual.
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

if type thyrox_toolchain_require_podman &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_podman en $SUBJECT"
  thyrox_summary; exit 1
fi

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
MISSING="thyrox-podman-que-no-existe-$$"

# Un `podman` falso cuyo `info` responde 0: runtime y almacenamiento sanos.
cat > "$WORK/podman-real" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  info) echo "host: {} (fake)"; exit 0;;
  --version) echo "podman version 4.9.3 (fake)"; exit 0;;
esac
exit 1
STUB
chmod +x "$WORK/podman-real"

# Un `podman` falso que RESUELVE en el PATH y hasta responde --version, pero
# cuyo `info` falla: runtime u almacenamiento rotos.
cat > "$WORK/podman-roto" <<'STUB'
#!/usr/bin/env bash
case "$1" in
  --version) echo "podman version 4.9.3 (fake)"; exit 0;;
  info) exit 1;;
esac
exit 1
STUB
chmod +x "$WORK/podman-roto"

# Caso a — binario presente y `podman info` responde: pasa sin instalar, y
# THYROX_TOOLCHAIN_PODMAN_BIN queda resuelto a su ruta absoluta.
out="$(THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-real" THYROX_INSTALL_PODMAN='' \
       bash -c "source '$SUBJECT'; thyrox_toolchain_require_podman && printf '%s' \"\$THYROX_TOOLCHAIN_PODMAN_BIN\"")"
if [[ "$out" == "$WORK/podman-real" ]]; then
  ok "un binario presente cuyo info responde pasa y resuelve THYROX_TOOLCHAIN_PODMAN_BIN"
else
  bad "esperaba THYROX_TOOLCHAIN_PODMAN_BIN='$WORK/podman-real', dio '$out'"
fi

# Caso b — ausente y sin opt-in: REHUSA con exit 2, nombra la variable, no
# instala nada y no emite conteo.
out="$(THYROX_TOOLCHAIN_PODMAN_BIN="$MISSING" THYROX_INSTALL_PODMAN='' \
       THYROX_TOOLCHAIN_PODMAN_INSTALL_CMD="touch $WORK/instalo-sin-permiso" \
       thyrox_toolchain_require_podman 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi
if [[ -e "$WORK/instalo-sin-permiso" ]]; then
  bad "sin opt-in NO debia instalar, y lo hizo"
else
  ok "sin opt-in no ejecuta el instalador"
fi
if [[ "$out" == *THYROX_INSTALL_PODMAN* ]]; then
  ok "el rechazo nombra THYROX_INSTALL_PODMAN=1"
else
  bad "el rechazo no nombra THYROX_INSTALL_PODMAN: '$out'"
fi
if [[ "$out" != *[0-9]" hits"* && "$out" != *"encontrados"* ]]; then
  ok "el rechazo no emite conteo"
else
  bad "el rechazo emitio algo que parece un conteo: '$out'"
fi

# Caso c — ausente, con opt-in, y un instalador que SI deja un podman sano
# (su `info` responde 0): se acepta.
INSTALLER="$WORK/instala-sano.sh"
cat > "$INSTALLER" <<STUB
#!/usr/bin/env bash
cp "$WORK/podman-real" "$WORK/podman-instalado"
chmod +x "$WORK/podman-instalado"
STUB
chmod +x "$INSTALLER"
THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-instalado" \
THYROX_INSTALL_PODMAN=1 \
THYROX_TOOLCHAIN_PODMAN_INSTALL_CMD="$INSTALLER" \
  thyrox_toolchain_require_podman >/dev/null 2>&1; rc=$?
if [[ $rc -eq 0 ]]; then
  ok "un instalador que deja un podman sano se acepta"
else
  bad "esperaba exit 0 con instalador sano, dio $rc"
fi
rm -f "$WORK/podman-instalado"

# Caso d — EL QUE DISCRIMINA: ausente, con opt-in, e instalador que MIENTE:
# sale 0 y deja un binario que RESUELVE en el PATH (como haria un apt real,
# incluso con runc o cgroups rotos), pero cuyo `podman info` sigue fallando.
# NO se acepta: el exito del instalador no se lee de su exit ni de que el
# nombre resuelva, sino de que el runtime realmente inicialice.
INSTALADOR_MENTIROSO="$WORK/instala-roto.sh"
cat > "$INSTALADOR_MENTIROSO" <<STUB
#!/usr/bin/env bash
cp "$WORK/podman-roto" "$WORK/podman-instalado-roto"
chmod +x "$WORK/podman-instalado-roto"
STUB
chmod +x "$INSTALADOR_MENTIROSO"
THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-instalado-roto" \
THYROX_INSTALL_PODMAN=1 \
THYROX_TOOLCHAIN_PODMAN_INSTALL_CMD="$INSTALADOR_MENTIROSO" \
  thyrox_toolchain_require_podman >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un instalador que miente dejando un binario que resuelve pero no arranca NO se acepta"
else
  bad "esperaba exit 2 con instalador mentiroso que deja un binario roto, dio $rc"
fi
rm -f "$WORK/podman-instalado-roto"

# Caso e — presente (resuelve y hasta responde --version) pero `podman info`
# falla: runtime u almacenamiento rotos. NO se acepta: `command -v` y
# `--version` no bastan.
THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-roto" \
THYROX_INSTALL_PODMAN='' \
  thyrox_toolchain_require_podman >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un binario que resuelve y responde --version pero cuyo info falla NO se acepta"
else
  bad "esperaba exit 2 con podman roto, dio $rc"
fi

# Caso f — el instalador por defecto pide el paquete podman.
if [[ "${THYROX_TOOLCHAIN_PODMAN_INSTALL_CMD:-}" == *"install -y podman"* ]]; then
  ok "el instalador por defecto pide el paquete podman"
else
  bad "el instalador por defecto no pide podman: '${THYROX_TOOLCHAIN_PODMAN_INSTALL_CMD:-}'"
fi

thyrox_summary
