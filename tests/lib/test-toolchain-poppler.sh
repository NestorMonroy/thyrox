#!/usr/bin/env bash
# test-toolchain-poppler.sh — contrato de la adquisicion de poppler
# (`pdftotext` y `pdftoppm`), con los dos ejes de `require_gawk`.
#
# El defecto que cierra: thyrox declaraba el NOMBRE de `pdftotext`
# (THYROX_TOOLCHAIN_PDFTOTEXT_BIN) pero no lo instalaba ni lo sondeaba, y no
# sabia nada de `pdftoppm`, con el que un consumidor rinde paginas para el QA
# visual. Un consumidor sin poppler se enteraba a mitad de trabajo.
#
# Los casos que DISCRIMINAN son el 5 y el 6: binarios PRESENTES que no hacen
# lo que se les pide. Un guard que midiera solo presencia pasa del 1 al 4 y
# falla ahi. El 6 ademas mide que el exit de `pdftoppm` no decide: sale 0 sin
# escribir la imagen.
#
# El control positivo (caso 7) no es fabricado: son los binarios reales
# sobre el PDF que la propia biblioteca declara.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — las dos piezas existen.
if type thyrox_toolchain_require_poppler &>/dev/null \
   && type thyrox_toolchain_poppler_works &>/dev/null; then
  ok "el guard y su sonda existen"
else
  bad "faltan thyrox_toolchain_require_poppler / _poppler_works en $SUBJECT"
  thyrox_summary; exit 1
fi

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
MISSING="thyrox-pdftoppm-que-no-existe-$$"

# Caso 2 — EJE 1, presencia: un binario ausente y sin opt-in REHUSA con exit 2
# y nombra el binario y la variable de opt-in.
out="$(THYROX_TOOLCHAIN_PDFTOPPM_BIN="$MISSING" THYROX_INSTALL_POPPLER= \
       thyrox_toolchain_require_poppler 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *"$MISSING"* && "$out" == *THYROX_INSTALL_POPPLER* ]]; then
  ok "rehusa con exit 2 nombrando el binario ausente y el opt-in"
else bad "esperaba exit 2 con nombre y opt-in; dio $rc: '$out'"; fi

# Caso 3 — el rechazo de presencia NO emite un conteo.
residue="${out//THYROX_INSTALL_POPPLER=1/}"; residue="${residue//$MISSING/}"
if [[ "$residue" =~ [0-9] ]]; then bad "el rechazo emite una cifra: '$residue'"
else ok "el rechazo de presencia no emite ningun conteo"; fi

# Caso 4 — opt-in con un instalador que MIENTE (sale 0 sin instalar): el exito
# se prueba re-comprobando el binario.
out="$(THYROX_TOOLCHAIN_PDFTOPPM_BIN="$MISSING" THYROX_INSTALL_POPPLER=1 \
       THYROX_TOOLCHAIN_POPPLER_INSTALL_CMD=true \
       thyrox_toolchain_require_poppler 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *"sigue sin resolver"* ]]; then
  ok "un instalador que sale 0 sin instalar no cuenta como exito"
else bad "esperaba exit 2 tras re-comprobar; dio $rc: '$out'"; fi

# Caso 5 — EJE 2, conducta: `pdftotext` presente que no extrae el texto.
printf '#!/bin/sh\nexit 0\n' > "$T/fake-pdftotext"; chmod +x "$T/fake-pdftotext"
out="$(THYROX_TOOLCHAIN_PDFTOTEXT_BIN="$T/fake-pdftotext" THYROX_INSTALL_POPPLER= \
       thyrox_toolchain_require_poppler 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *fake-pdftotext* && "$out" != *"no resuelve"* ]]; then
  ok "un pdftotext presente que no extrae el texto rehusa por conducta"
else bad "esperaba rechazo de conducta de pdftotext; dio $rc: '$out'"; fi

# Caso 6 — `pdftoppm` que sale 0 y no escribe la imagen: el exit no decide.
printf '#!/bin/sh\nexit 0\n' > "$T/fake-pdftoppm"; chmod +x "$T/fake-pdftoppm"
out="$(THYROX_TOOLCHAIN_PDFTOPPM_BIN="$T/fake-pdftoppm" THYROX_INSTALL_POPPLER= \
       thyrox_toolchain_require_poppler 2>&1)"; rc=$?
if [[ $rc -eq 2 && "$out" == *fake-pdftoppm* ]]; then
  ok "un pdftoppm que sale 0 sin escribir la imagen rehusa"
else bad "esperaba rechazo de conducta de pdftoppm; dio $rc: '$out'"; fi

# Caso 7 — control positivo real: los binarios del sistema sobre el PDF de la
# biblioteca. Si poppler no esta, el caso se declara omitido, no aprobado.
if command -v pdftotext >/dev/null && command -v pdftoppm >/dev/null; then
  if thyrox_toolchain_require_poppler 2>/dev/null; then
    ok "poppler real extrae el texto y rinde la pagina"
  else bad "poppler real presente y el guard rehusa"; fi
else
  echo "  omitido: poppler no esta en este entorno (caso 7 sin medir)"
fi

# Caso 8 — el PDF de la sonda es un PDF, no una cadena cualquiera.
head="$(printf '%s' "$THYROX_TOOLCHAIN_POPPLER_PROBE_PDF_B64" | base64 -d 2>/dev/null | head -c 5)"
if [[ "$head" == "%PDF-" ]]; then ok "el PDF de la sonda decodifica a un PDF"
else bad "el PDF de la sonda no empieza con %PDF-: '$head'"; fi

# Caso 9 — la sonda funciona en un hijo: `export -f` promete que un hijo puede
# llamarla, y sin las constantes exportadas recibiria un PDF vacio.
if command -v pdftotext >/dev/null && command -v pdftoppm >/dev/null; then
  if bash -c 'thyrox_toolchain_poppler_works' 2>/dev/null; then
    ok "la sonda funciona en un proceso hijo"
  else bad "la sonda falla en un hijo: constantes sin exportar"; fi
else
  echo "  omitido: poppler no esta en este entorno (caso 9 sin medir)"
fi

thyrox_summary
