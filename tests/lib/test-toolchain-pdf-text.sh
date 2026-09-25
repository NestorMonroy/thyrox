#!/usr/bin/env bash
# test-toolchain-pdf-text.sh — contrato de la adquisicion de `pdftotext`.
#
# El defecto que cierra: `src/corpus/pdf_to_text.py` citaba
# `thyrox_toolchain_require_pdf_text` como el remedio de su precondicion, y la
# funcion no existia en ningun arbol (medido: `git grep` en thyrox y en el
# consumidor, 0 archivos). Sin ella, un clon sin poppler no tiene como pedir
# el extractor y la instalacion se hace a mano, fuera del instrumento.
#
# Mismo contrato que `test-toolchain-parallel.sh`; el caso que DISCRIMINA es
# el 6: un instalador que sale 0 sin instalar nada.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — la funcion existe.
if type thyrox_toolchain_require_pdf_text &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_pdf_text en $SUBJECT"
  thyrox_summary; exit 1
fi

MISSING="thyrox-binario-que-no-existe-$$"

# Caso 2 — ausente y sin opt-in: REHUSA con exit 2.
out="$(THYROX_TOOLCHAIN_PDFTOTEXT_BIN="$MISSING" THYROX_INSTALL_PDF_TEXT= \
       thyrox_toolchain_require_pdf_text 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi

# Caso 3 — el rechazo nombra la variable de opt-in y el paquete.
if [[ "$out" == *THYROX_INSTALL_PDF_TEXT* && "$out" == *poppler-utils* ]]; then
  ok "el rechazo nombra la variable de opt-in y el paquete"
else
  bad "el rechazo no nombra THYROX_INSTALL_PDF_TEXT ni poppler-utils: '$out'"
fi

# Caso 4 — el rechazo NO emite un conteo (se descuentan los digitos legitimos).
residue="${out//THYROX_INSTALL_PDF_TEXT=1/}"
residue="${residue//$MISSING/}"
if [[ "$residue" =~ [0-9] ]]; then
  bad "el rechazo emite una cifra y no debe: '$residue'"
else
  ok "el rechazo no emite ningun conteo"
fi

# Caso 5 — control positivo: un binario presente pasa sin instalar nada.
if THYROX_TOOLCHAIN_PDFTOTEXT_BIN=sh THYROX_INSTALL_PDF_TEXT= \
   thyrox_toolchain_require_pdf_text >/dev/null 2>&1; then
  ok "un binario presente pasa sin opt-in"
else
  bad "un binario presente deberia pasar"
fi

# Caso 6 — EL QUE DISCRIMINA: instalador que sale 0 sin instalar.
THYROX_TOOLCHAIN_PDFTOTEXT_BIN="$MISSING" \
THYROX_INSTALL_PDF_TEXT=1 \
THYROX_TOOLCHAIN_PDF_TEXT_INSTALL_CMD=true \
  thyrox_toolchain_require_pdf_text >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un instalador que miente NO se acepta: se re-comprueba el binario"
else
  bad "esperaba exit 2 con instalador mentiroso, dio $rc"
fi

# Caso 7 — el instalador por defecto pide el paquete que trae `pdftotext`.
if [[ "${THYROX_TOOLCHAIN_PDF_TEXT_INSTALL_CMD:-}" == *poppler-utils* ]]; then
  ok "el instalador por defecto pide poppler-utils"
else
  bad "el instalador por defecto no pide poppler-utils"
fi

thyrox_summary
