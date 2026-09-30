#!/usr/bin/env bash
# test-toolchain-index-refresh.sh — un apt con indice viejo se refresca una vez.
#
# Medido en un contenedor recien creado: cinco instaladores de la cadena
# salieron 2 porque `apt-get install` pedia paquetes a un mirror que ya no los
# servia (404). El indice se refresca con `apt-get update`, y ningun instalador
# lo hacia. `thyrox_toolchain_acquire_binary` lo hace ahora una sola vez, y
# solo cuando el comando de instalacion es de apt y el binario sigue ausente.
#
# El caso que discrimina es el 1: sin el refresco, el binario no aparece.
# Control de anulacion: con el reintento retirado de acquire_binary cae
# exactamente el caso 1; los casos 2 y 3 no dependen de el.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

W="$(mktemp -d)"
trap 'rm -rf "${W:?}"' EXIT
mkdir -p "$W/bin" "$W/fakeapt"
BIN="thyrox-binario-de-prueba-$$"

# Un `apt-get` falso: `install` solo crea el binario si el indice se refresco;
# `update` marca el refresco. Cuenta sus llamadas en archivos.
cat > "$W/fakeapt/apt-get" <<EOF
#!/usr/bin/env bash
case "\$1" in
  update) echo x >> "$W/updates"; touch "$W/refreshed" ;;
  install) echo x >> "$W/installs"
           [[ -f "$W/refreshed" || -f "$W/fresh" ]] || exit 100
           printf '#!/bin/sh\n' > "$W/bin/$BIN"; chmod +x "$W/bin/$BIN" ;;
esac
EOF
chmod +x "$W/fakeapt/apt-get"
reset_state() { rm -f "$W/updates" "$W/installs" "$W/refreshed" "$W/fresh" "$W/bin/$BIN"; }
count() { [[ -f "$1" ]] && wc -l < "$1" | tr -d ' ' || echo 0; }

export THYROX_INSTALL_PROBE=1
export THYROX_TOOLCHAIN_INDEX_REFRESH_CMD="$W/fakeapt/apt-get update"
install_cmd="$W/fakeapt/apt-get install -y probe"

# Caso 1 — indice viejo: el primer install falla, se refresca UNA vez y el
# reintento instala.
reset_state
PATH="$W/bin:$PATH" thyrox_toolchain_acquire_binary "$BIN" THYROX_INSTALL_PROBE "$install_cmd" probe >/dev/null 2>&1; rc=$?
if [[ $rc -eq 0 && "$(count "$W/updates")" == 1 && "$(count "$W/installs")" == 2 ]]; then
  ok "indice viejo: refresca una vez y el reintento instala"
else
  bad "indice viejo: esperaba rc 0, 1 update, 2 installs; dio rc $rc, $(count "$W/updates") update, $(count "$W/installs") installs"
fi

# Caso 2 — indice al dia: instala a la primera y NO refresca.
reset_state; touch "$W/fresh"
PATH="$W/bin:$PATH" thyrox_toolchain_acquire_binary "$BIN" THYROX_INSTALL_PROBE "$install_cmd" probe >/dev/null 2>&1; rc=$?
if [[ $rc -eq 0 && "$(count "$W/updates")" == 0 && "$(count "$W/installs")" == 1 ]]; then
  ok "indice al dia: no refresca"
else
  bad "indice al dia: esperaba rc 0 sin update; dio rc $rc, $(count "$W/updates") update"
fi

# Caso 3 — un instalador que no es apt no dispara el refresco: un fallo suyo
# no se arregla con `apt-get update`, y refrescar seria una llamada de red de
# mas.
reset_state
PATH="$W/bin:$PATH" thyrox_toolchain_acquire_binary "$BIN" THYROX_INSTALL_PROBE "true" probe >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 && "$(count "$W/updates")" == 0 ]]; then
  ok "un instalador que no es apt no refresca el indice"
else
  bad "instalador no apt: esperaba rc 2 sin update; dio rc $rc, $(count "$W/updates") update"
fi

thyrox_summary
