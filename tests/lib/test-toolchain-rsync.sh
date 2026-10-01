#!/usr/bin/env bash
# test-toolchain-rsync.sh — contrato de la adquisicion de `rsync`.
#
# `rsync` no viene en este contenedor (medido: `command -v rsync` vacio), y
# copiar un paquete para compararlo sin él obligaba a rodearlo a mano. Esta
# funcion lo hace pedible desde el arbol, con el mismo contrato que
# `test-toolchain-parallel.sh`; el caso que DISCRIMINA es el 6: un instalador
# que sale 0 sin instalar nada.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — la funcion existe.
if type thyrox_toolchain_require_rsync &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_rsync en $SUBJECT"
  thyrox_summary; exit 1
fi

MISSING="thyrox-binario-que-no-existe-$$"

# Caso 2 — ausente y sin opt-in: REHUSA con exit 2.
out="$(THYROX_TOOLCHAIN_RSYNC_BIN="$MISSING" THYROX_INSTALL_RSYNC='' \
       thyrox_toolchain_require_rsync 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi

# Caso 3 — el rechazo nombra la variable de opt-in y el paquete.
if [[ "$out" == *THYROX_INSTALL_RSYNC* && "$out" == *"paquete rsync"* ]]; then
  ok "el rechazo nombra la variable de opt-in y el paquete"
else
  bad "el rechazo no nombra THYROX_INSTALL_RSYNC ni el paquete rsync: '$out'"
fi

# Caso 4 — el rechazo NO emite un conteo (se descuentan los digitos legitimos).
residue="${out//THYROX_INSTALL_RSYNC=1/}"
residue="${residue//$MISSING/}"
if [[ "$residue" =~ [0-9] ]]; then
  bad "el rechazo emite una cifra y no debe: '$residue'"
else
  ok "el rechazo no emite ningun conteo"
fi

# Caso 5 — control positivo: un binario presente pasa sin instalar nada.
if THYROX_TOOLCHAIN_RSYNC_BIN=sh THYROX_INSTALL_RSYNC='' \
   thyrox_toolchain_require_rsync >/dev/null 2>&1; then
  ok "un binario presente pasa sin opt-in"
else
  bad "un binario presente deberia pasar"
fi

# Caso 6 — EL QUE DISCRIMINA: instalador que sale 0 sin instalar.
THYROX_TOOLCHAIN_RSYNC_BIN="$MISSING" \
THYROX_INSTALL_RSYNC=1 \
THYROX_TOOLCHAIN_RSYNC_INSTALL_CMD=true \
  thyrox_toolchain_require_rsync >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un instalador que miente NO se acepta: se re-comprueba el binario"
else
  bad "esperaba exit 2 con instalador mentiroso, dio $rc"
fi

# Caso 7 — el instalador por defecto pide el paquete rsync.
if [[ "${THYROX_TOOLCHAIN_RSYNC_INSTALL_CMD:-}" == *"install -y rsync"* ]]; then
  ok "el instalador por defecto pide el paquete rsync"
else
  bad "el instalador por defecto no pide rsync: '${THYROX_TOOLCHAIN_RSYNC_INSTALL_CMD:-}'"
fi

thyrox_summary
