#!/usr/bin/env bash
# test-toolchain-parallel.sh — contrato de la adquisicion idempotente de un
# binario externo, con GNU parallel como primer sujeto.
#
# El defecto que cierra: un guion que necesita una herramienta ausente tiene
# dos salidas malas y una buena. Las dos malas son caer en silencio a otra
# cosa —la divergencia que `toolchain.sh` ya cierra para el interprete— y
# publicar un 0 que no distingue «no hay incumplidores» de «no pude medir»,
# que es el sub-patron D de `metrica-decide-la-conclusion.md`.
#
# El caso que DISCRIMINA es el 6: un instalador que sale 0 SIN instalar nada.
# Una implementacion que lea el codigo de salida de `apt` pasa los casos 1-5 y
# falla el 6, que es justo la diferencia entre medir el significante —el exit
# code— y el significado —que el binario se pueda invocar.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — la funcion existe.
if type thyrox_toolchain_require_parallel &>/dev/null; then
  ok "la adquisicion existe"
else
  bad "falta thyrox_toolchain_require_parallel en $SUBJECT"
  thyrox_summary; exit 1
fi

AUSENTE="thyrox-binario-que-no-existe-$$"

# Caso 2 — ausente y sin opt-in: REHUSA con exit 2.
out="$(THYROX_TOOLCHAIN_PARALLEL_BIN="$AUSENTE" THYROX_INSTALL_PARALLEL= \
       thyrox_toolchain_require_parallel 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando falta y no hay opt-in"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi

# Caso 3 — el mensaje NOMBRA la variable de opt-in. Sin eso el operador sabe
# que fallo y no como seguir; `argparse` tambien sale 2 ante un argumento
# invalido, asi que el codigo de salida por si solo no discrimina.
if [[ "$out" == *THYROX_INSTALL_PARALLEL* ]]; then
  ok "el rechazo nombra la variable de opt-in"
else
  bad "el rechazo no nombra THYROX_INSTALL_PARALLEL: '$out'"
fi

# Caso 4 — el rechazo NO emite un CONTEO. Un cero aqui seria un verde falso.
#
# La primera version de este caso medía «contiene un digito» y concluía sobre
# «emite un conteo»: fallo por el PID del binario inyectado y por el `1` de la
# propia variable de opt-in. Es el sub-patron C —medir el significante y
# concluir sobre el significado— cometido DENTRO del control escrito para
# vigilar el D. Se descuentan los dos digitos legitimos y se mide el resto.
residuo="${out//THYROX_INSTALL_PARALLEL=1/}"
residuo="${residuo//$AUSENTE/}"
if [[ "$residuo" =~ [0-9] ]]; then
  bad "el rechazo emite una cifra y no debe: '$residuo'"
else
  ok "el rechazo no emite ningun conteo"
fi

# Caso 5 — control positivo: un binario que SI existe pasa sin instalar nada.
if THYROX_TOOLCHAIN_PARALLEL_BIN=sh THYROX_INSTALL_PARALLEL= \
   thyrox_toolchain_require_parallel >/dev/null 2>&1; then
  ok "un binario presente pasa sin opt-in"
else
  bad "un binario presente deberia pasar"
fi

# Caso 6 — EL QUE DISCRIMINA: opt-in encendido y un instalador que sale 0 sin
# instalar. El exito se prueba RE-COMPROBANDO el binario, nunca leyendo el
# codigo de salida del instalador.
THYROX_TOOLCHAIN_PARALLEL_BIN="$AUSENTE" \
THYROX_INSTALL_PARALLEL=1 \
THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD=true \
  thyrox_toolchain_require_parallel >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un instalador que miente NO se acepta: se re-comprueba el binario"
else
  bad "esperaba exit 2 con instalador mentiroso, dio $rc"
fi


# Caso 7 — tras adquirirlo, la CITA queda reconocida. Sin esto la primera
# invocacion real BLOQUEA esperando que alguien teclee el reconocimiento en un
# prompt, que es lo que ocurrio al medir: un `$(parallel --version)` dentro de
# un heredoc colgo el comando hasta el timeout. Un guion no interactivo no
# puede conducir ese prompt: el marcador se escribe.
CASA="$(mktemp -d)"
if PARALLEL_HOME="$CASA" thyrox_toolchain_require_parallel >/dev/null 2>&1 \
   && [[ -f "$CASA/will-cite" ]]; then
  ok "la adquisicion deja la cita reconocida"
else
  bad "falta $CASA/will-cite: la primera invocacion real bloquearia"
fi
rm -rf "$CASA"

# Caso 8 — el hogar de la cita es del PROVEEDOR, no de /tmp ni de $HOME.
# `PARALLEL_HOME` sin declarar cae por defecto a `$HOME/.parallel`, que es
# estado del contenedor y no del arbol: se pierde al reciclarlo y no lo ve
# ningun clon. thyrox es el proveedor, asi que su estado vive bajo el hogar
# que `THYROX_STATE_DIR` ya declara — no se inventa raiz nueva.
hogar="$(THYROX_TOOLCHAIN_PARALLEL_BIN=sh thyrox_toolchain_parallel_home 2>/dev/null || echo '')"
if [[ "$hogar" == "$ROOT/"* ]]; then
  ok "el hogar de la cita esta dentro del proveedor"
else
  bad "el hogar deberia colgar de $ROOT, dio '$hogar'"
fi
if [[ -n "$hogar" && "$hogar" != *"/tmp/"* && "$hogar" != "$HOME/.parallel" ]]; then
  ok "el hogar no es /tmp ni el del contenedor"
else
  bad "el hogar es efimero: '$hogar'"
fi

thyrox_summary
