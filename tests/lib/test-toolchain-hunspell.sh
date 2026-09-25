#!/usr/bin/env bash
# test-toolchain-hunspell.sh — contrato de la adquisición de hunspell, con los
# mismos ejes que GNU parallel y poppler: presencia opt-in, re-comprobación
# del binario tras instalar y sonda de conducta.
#
# El defecto que cierra: un consumidor que revisa ortografía (ai-course-notes,
# prosa es-MX con tildes y eñe) instalaba hunspell por su cuenta, sin el
# contrato del proveedor.
#
# El proveedor no supone un idioma: el consumidor declara su diccionario y un
# par de sonda, una palabra que tiene que aceptar y otra que tiene que
# rechazar. Los casos que DISCRIMINAN son el 5 y el 6: un diccionario que
# acepta todo y uno que rechaza todo resuelven como binario y no miden nada.
# El control positivo (caso 7) es el binario real con un diccionario mínimo
# escrito por la propia prueba.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — el guard, su sonda y la sonda del preflight existen.
if type thyrox_toolchain_require_hunspell &>/dev/null \
   && type thyrox_toolchain_hunspell_works &>/dev/null \
   && type thyrox_toolchain_probe_hunspell &>/dev/null; then
  ok "el guard y sus sondas existen"
else
  bad "faltan thyrox_toolchain_require_hunspell / _hunspell_works / _probe_hunspell en $SUBJECT"
  thyrox_summary; exit 1
fi

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
MISSING="thyrox-hunspell-que-no-existe-$$"
printf 'SET UTF-8\n' > "$T/mini.aff"
printf '1\nseñal\n' > "$T/mini.dic"
export THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY="$T/mini"
export THYROX_TOOLCHAIN_HUNSPELL_PROBE_ACCEPT="señal"
export THYROX_TOOLCHAIN_HUNSPELL_PROBE_REJECT="senal"

# Caso 2 — presencia: ausente y sin opt-in rehúsa con exit 2 y nombra el
# binario y la variable de opt-in.
out="$(THYROX_TOOLCHAIN_HUNSPELL_BIN="$MISSING" THYROX_INSTALL_HUNSPELL= \
       thyrox_toolchain_require_hunspell 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *"$MISSING"* && "$out" == *THYROX_INSTALL_HUNSPELL* ]]; then
  ok "rehúsa con exit 2 nombrando el binario ausente y el opt-in"
else bad "esperaba exit 2 con nombre y opt-in; dio $rc: '$out'"; fi

# Caso 3 — el rechazo de presencia no emite un conteo.
residue="${out//THYROX_INSTALL_HUNSPELL=1/}"; residue="${residue//$MISSING/}"
if [[ "$residue" =~ [0-9] ]]; then bad "el rechazo emite una cifra: '$residue'"
else ok "el rechazo de presencia no emite ningún conteo"; fi

# Caso 4 — un instalador que miente (sale 0 sin instalar) no cuenta.
out="$(THYROX_TOOLCHAIN_HUNSPELL_BIN="$MISSING" THYROX_INSTALL_HUNSPELL=1 \
       THYROX_TOOLCHAIN_HUNSPELL_INSTALL_CMD=true \
       thyrox_toolchain_require_hunspell 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *"sigue sin resolver"* ]]; then
  ok "un instalador que sale 0 sin instalar no cuenta como éxito"
else bad "esperaba exit 2 tras re-comprobar; dio $rc: '$out'"; fi

# Caso 5 — un hunspell que acepta todo (no lista nada con -l) falla la sonda.
mkdir -p "$T/lax"; printf '#!/bin/bash\ncat >/dev/null\n' > "$T/lax/hunspell"; chmod +x "$T/lax/hunspell"
out="$(THYROX_TOOLCHAIN_HUNSPELL_BIN="$T/lax/hunspell" thyrox_toolchain_require_hunspell 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *senal* ]]; then ok "un diccionario que acepta todo no pasa la sonda"
else bad "esperaba exit 2 nombrando la palabra que debió rechazar; dio $rc: '$out'"; fi

# Caso 6 — uno que rechaza todo (lista lo que recibe) también falla.
mkdir -p "$T/strict"; printf '#!/bin/bash\ncat\n' > "$T/strict/hunspell"; chmod +x "$T/strict/hunspell"
out="$(THYROX_TOOLCHAIN_HUNSPELL_BIN="$T/strict/hunspell" thyrox_toolchain_require_hunspell 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *señal* ]]; then ok "un diccionario que rechaza todo no pasa la sonda"
else bad "esperaba exit 2 nombrando la palabra que debió aceptar; dio $rc: '$out'"; fi

# Caso 7 — control positivo: el binario real con el diccionario mínimo.
if command -v hunspell >/dev/null 2>&1; then
  out="$(thyrox_toolchain_require_hunspell 2>&1)"; rc=$?
  if [[ $rc -eq 0 ]]; then ok "hunspell real con el diccionario declarado pasa la sonda"
  else bad "el binario real no pasó la sonda: $rc '$out'"; fi
else
  bad "hunspell no está instalado; el control positivo no puede correr (THYROX_INSTALL_HUNSPELL=1)"
fi

# Caso 8 — sin diccionario declarado la sonda del preflight se omite (exit 3).
out="$(THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY= thyrox_toolchain_probe_hunspell 2>&1)"; rc=$?
if [[ $rc -eq 3 && "$out" == *THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY* ]]; then
  ok "sin diccionario declarado la sonda se omite con exit 3 y nombra la llave"
else bad "esperaba exit 3 nombrando la llave; dio $rc: '$out'"; fi

thyrox_summary
