#!/usr/bin/env bash
# test-toolchain-gnu-time.sh — contrato de la adquisicion de GNU Time.
#
# Para que se quiere: la memoria pico (max RSS) de cada `claude -p` del pool y
# de cada `tsc`. El `time` de bash da pared y CPU, no memoria, y el pool lanza
# con `--memfree 3G` sin medida detras.
#
# La trampa propia de este binario: `time` es tambien una palabra reservada de
# bash, asi que `command -v time` responde `time` aunque /usr/bin/time no
# exista (medido el 2026-09-26). Por eso el binario por defecto es la ruta
# absoluta y se exige que se identifique como GNU: los casos 8 y 9 discriminan.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — la funcion existe.
if type thyrox_toolchain_require_gnu_time &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_gnu_time en $SUBJECT"
  thyrox_summary; exit 1
fi

F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
MISSING="$F/thyrox-binario-que-no-existe"
# La identidad real, verbatim: medida el 2026-09-26 sobre el paquete time
# 1.9-0.2build1, que se declara "UNKNOWN" como version. Un falso con la
# cadena supuesta ("GNU time 1.9") aprobo una comprobacion que el binario
# real no pasaba.
printf '#!/bin/sh\necho "time (GNU Time) UNKNOWN"\n' > "$F/gnu-time"; chmod +x "$F/gnu-time"
printf '#!/bin/sh\necho "BusyBox v1.36 multi-call binary"\n' > "$F/busybox-time"; chmod +x "$F/busybox-time"

# Caso 2 — ausente y sin opt-in: REHUSA con exit 2.
out="$(THYROX_TOOLCHAIN_TIME_BIN="$MISSING" THYROX_INSTALL_GNU_TIME= \
       thyrox_toolchain_require_gnu_time 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi

# Caso 3 — el rechazo nombra la variable de opt-in y el paquete.
if [[ "$out" == *THYROX_INSTALL_GNU_TIME* && "$out" == *"paquete time"* ]]; then
  ok "el rechazo nombra la variable de opt-in y el paquete"
else
  bad "el rechazo no nombra THYROX_INSTALL_GNU_TIME ni el paquete time: '$out'"
fi

# Caso 4 — control positivo: un GNU time presente pasa sin instalar nada.
if THYROX_TOOLCHAIN_TIME_BIN="$F/gnu-time" THYROX_INSTALL_GNU_TIME= \
   thyrox_toolchain_require_gnu_time >/dev/null 2>&1; then
  ok "un GNU time presente pasa sin opt-in"
else
  bad "un GNU time presente deberia pasar"
fi

# Caso 5 — un instalador que sale 0 sin instalar no se acepta.
THYROX_TOOLCHAIN_TIME_BIN="$MISSING" THYROX_INSTALL_GNU_TIME=1 \
THYROX_TOOLCHAIN_TIME_INSTALL_CMD=true \
  thyrox_toolchain_require_gnu_time >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then ok "un instalador que miente NO se acepta"
else bad "esperaba exit 2 con instalador mentiroso, dio $rc"; fi

# Caso 6 — el instalador por defecto pide el paquete `time`.
if [[ "${THYROX_TOOLCHAIN_TIME_INSTALL_CMD:-}" == *"install -y time"* ]]; then
  ok "el instalador por defecto pide el paquete time"
else
  bad "el instalador por defecto no pide el paquete time: '${THYROX_TOOLCHAIN_TIME_INSTALL_CMD:-}'"
fi

# Caso 7 — el binario por defecto es la ruta absoluta, no la palabra `time`.
if [[ "$(thyrox_toolchain_gnu_time_bin)" == /* ]]; then
  ok "el binario por defecto es una ruta absoluta"
else
  bad "el binario por defecto no es absoluto: '$(thyrox_toolchain_gnu_time_bin)'"
fi

# Caso 8 — EL QUE DISCRIMINA: la palabra reservada `time` no cuenta como binario.
THYROX_TOOLCHAIN_TIME_BIN=time THYROX_INSTALL_GNU_TIME= PATH="$F/empty:/usr/local/nada" \
  thyrox_toolchain_require_gnu_time >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then ok "la palabra reservada time no se acepta como GNU time"
else bad "la palabra reservada time paso como binario: exit $rc"; fi

# Caso 9 — un `time` que no es GNU (busybox) no da el formato que se consume.
THYROX_TOOLCHAIN_TIME_BIN="$F/busybox-time" THYROX_INSTALL_GNU_TIME= \
  thyrox_toolchain_require_gnu_time >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then ok "un time que no es GNU rehusa"
else bad "un time que no es GNU paso: exit $rc"; fi

thyrox_summary
