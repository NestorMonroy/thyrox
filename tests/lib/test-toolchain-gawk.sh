#!/usr/bin/env bash
# test-toolchain-gawk.sh — contrato de los DOS ejes de la adquisicion de awk.
#
# El defecto que cierra no es «falta gawk»: es que gawk puede estar instalado
# y el nombre `awk` seguir resolviendo a mawk por /etc/alternatives/awk. Un
# guard que midiera `command -v gawk` pasaria en verde con la maquina
# exactamente igual de rota — el sub-patron C de
# `metrica-decide-la-conclusion.md`: medir el significante (esta el paquete) y
# concluir sobre el significado (responde a mi expresion).
#
# El caso que DISCRIMINA es el 6: mawk PRESENTE. Una implementacion que
# colapsara los dos ejes en uno —o que midiera solo presencia— pasa los casos
# 1-5 y falla el 6. Y el 7 mide que los dos rechazos son DISTINTOS: sin eso,
# un guard que dijera «instala con THYROX_INSTALL_GAWK=1» ante un mawk
# presente pasaria el 6 mandando al operador a un remedio que no arregla nada.
#
# El control positivo del eje de conducta NO es fabricado: mawk esta instalado
# en este contenedor y el constructo es el del episodio real que lo origina
# (h-docs-1068), no uno inventado para la sonda.
#
# Ciega a: la sonda separa gawk de mawk sobre UN constructo. Un awk que no sea
# gawk pero compile intervalos —busybox awk, nawk— pasa, y debe pasar: lo que
# el arbol necesita es que la expresion no reviente, no que el binario se
# llame de una manera. Y es ciega a cualquier otra divergencia de dialecto
# entre implementaciones (gensub, asorti, RS multi-caracter) que este arbol no
# ha medido usar.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/toolchain.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

source "$SUBJECT" 2>/dev/null || true

# Caso 1 — las dos piezas existen: la sonda por separado y el guard que la usa.
if type thyrox_toolchain_require_gawk &>/dev/null \
   && type thyrox_toolchain_awk_supports_intervals &>/dev/null; then
  ok "el guard y su sonda existen"
else
  bad "faltan thyrox_toolchain_require_gawk / _awk_supports_intervals en $SUBJECT"
  thyrox_summary; exit 1
fi

MISSING="thyrox-awk-que-no-existe-$$"

# Caso 2 — EJE 1, presencia: ausente y sin opt-in REHUSA con exit 2.
presence_out="$(THYROX_TOOLCHAIN_AWK_BIN="$MISSING" THYROX_INSTALL_GAWK= \
                thyrox_toolchain_require_gawk 2>&1)"; rc=$?
if [[ $rc -eq 2 ]]; then ok "rehusa con exit 2 cuando el nombre no resuelve"
else bad "esperaba exit 2 sin opt-in, dio $rc"; fi

# Caso 3 — el rechazo de presencia NOMBRA su variable de opt-in. El codigo de
# salida por si solo no discrimina: los dos ejes salen 2.
if [[ "$presence_out" == *THYROX_INSTALL_GAWK* ]]; then
  ok "el rechazo de presencia nombra su variable de opt-in"
else
  bad "no nombra THYROX_INSTALL_GAWK: '$presence_out'"
fi

# Caso 4 — el rechazo NO emite un CONTEO. Un cero aqui seria un verde falso.
# Se descuentan los dos digitos legitimos —el `1` de la propia variable y el
# PID del nombre inyectado— y se mide el resto, no «contiene un digito»: esa
# forma es el sub-patron C cometido DENTRO del control escrito para vigilar D.
residue="${presence_out//THYROX_INSTALL_GAWK=1/}"
residue="${residue//$MISSING/}"
if [[ "$residue" =~ [0-9] ]]; then
  bad "el rechazo de presencia emite una cifra y no debe: '$residue'"
else
  ok "el rechazo de presencia no emite ningun conteo"
fi

# Caso 5 — opt-in encendido y un instalador que sale 0 sin instalar nada. El
# exito se prueba RE-COMPROBANDO el binario, nunca leyendo el exit del
# instalador.
THYROX_TOOLCHAIN_AWK_BIN="$MISSING" \
THYROX_INSTALL_GAWK=1 \
THYROX_TOOLCHAIN_GAWK_INSTALL_CMD=true \
  thyrox_toolchain_require_gawk >/dev/null 2>&1; rc=$?
if [[ $rc -eq 2 ]]; then
  ok "un instalador que miente NO se acepta: se re-comprueba el binario"
else
  bad "esperaba exit 2 con instalador mentiroso, dio $rc"
fi

# Caso 6 — EL QUE DISCRIMINA. mawk esta PRESENTE: el eje de presencia pasa y
# el de conducta tiene que rehusar igual. Un guard de un solo eje da verde
# aqui con la maquina rota.
if command -v mawk >/dev/null 2>&1; then
  conduct_out="$(THYROX_TOOLCHAIN_AWK_BIN=mawk THYROX_INSTALL_GAWK= \
                 thyrox_toolchain_require_gawk 2>&1)"; rc=$?
  if [[ $rc -eq 2 ]]; then
    ok "un awk PRESENTE que no compila intervalos rehusa igual"
  else
    bad "mawk presente deberia rehusar por conducta, dio $rc"
  fi

  # Caso 7 — los dos rechazos son DISTINTOS. Sin esto, un guard que ante mawk
  # dijera «instala con THYROX_INSTALL_GAWK=1» pasaria el caso 6 mandando al
  # operador a un remedio que no arregla nada: el paquete ya esta, lo que
  # decide el nombre es el enlace de alternativas.
  # `-n` NO es decorativo: sin el, retirar el eje 2 deja conduct_out vacio y
  # esta asercion NEGATIVA pasa por vacuidad — el control dejaria de
  # discriminar justo bajo la anulacion escrita para medirlo.
  if [[ -n "$conduct_out" && "$conduct_out" != *THYROX_INSTALL_GAWK* ]]; then
    ok "el rechazo de conducta NO manda a instalar"
  else
    bad "el rechazo de conducta manda a instalar, que no lo arregla"
  fi

  # Caso 8 — y nombra las DOS salidas reales: la per-invocacion y la global,
  # esta ultima declarada como decision del ejecutor y no ejecutada por el
  # guard. Mutar /etc/alternatives por su cuenta cambiaria el comportamiento
  # de todo lo que corra en la maquina, no solo de este arbol.
  if [[ "$conduct_out" == *THYROX_TOOLCHAIN_AWK_BIN* \
     && "$conduct_out" == *update-alternatives* ]]; then
    ok "el rechazo de conducta nombra las dos salidas"
  else
    bad "el rechazo de conducta no nombra ambas salidas: '$conduct_out'"
  fi

  # Caso 9 — el rechazo de conducta tampoco emite conteo. Se descuenta el
  # unico digito legitimo: el propio constructo de la sonda, que se cita del
  # modulo y no se transcribe aqui — una copia seria la segunda fuente de
  # verdad que este arbol prohibe para una cadena que vive en codigo.
  residue="${conduct_out//$THYROX_TOOLCHAIN_AWK_PROBE_PROGRAM/}"
  if [[ -z "$conduct_out" ]]; then
    bad "no hubo rechazo de conducta que medir: el eje 2 no emitio nada"
  elif [[ "$residue" =~ [0-9] ]]; then
    bad "el rechazo de conducta emite una cifra: '$residue'"
  else
    ok "el rechazo de conducta no emite ningun conteo"
  fi

  # Caso 10 — la sonda mide CONDUCTA, no nombre. Los dos sentidos, porque uno
  # solo no discrimina: una sonda que siempre fallara pasaria el de mawk.
  if ! thyrox_toolchain_awk_supports_intervals mawk 2>/dev/null; then
    ok "la sonda ve que mawk no compila el constructo"
  else
    bad "la sonda deberia fallar sobre mawk"
  fi
else
  bad "mawk no esta instalado: el control positivo de conducta NO se pudo correr"
fi

# Caso 11 — control positivo de la sonda. Sin este, una sonda rota a `return 1`
# incondicional pasaria el caso 10 y el arbol entero quedaria rehusando.
if command -v gawk >/dev/null 2>&1; then
  if thyrox_toolchain_awk_supports_intervals gawk; then
    ok "la sonda ve que gawk SI compila el constructo"
  else
    bad "la sonda deberia pasar sobre gawk"
  fi
else
  bad "gawk no esta instalado: el control positivo de la sonda NO se pudo correr"
fi

# Caso 12 — el default es `awk`, no `gawk`, y es el nucleo del diseno: lo que
# hay que proteger es el nombre que los guiones ESCRIBEN. Un default `gawk`
# mediria un binario que nadie invoca y dejaria pasar la maquina rota.
# El hijo corre con `env -i` A PROPOSITO, y esa precaucion la costo medirla:
# `toolchain.sh:35` lleva una guarda de idempotencia —«si la primera funcion ya
# esta definida, return 0»— y las funciones viajan al hijo por `export -f`. Un
# `bash -c 'source ...'` lanzado desde esta suite, que YA sourceo el sujeto,
# re-sourcea en no-op: la traza del hijo da TRES lineas y ninguna asignacion.
# Medido asi, la primera version de este caso publico '' y leyo el entorno
# heredado creyendo leer el archivo — el sub-patron C con el propio control
# como sujeto. `env -i` retira las funciones heredadas y el sujeto se ejecuta.
default_bin="$(env -i PATH="$PATH" THYROX_TOOLCHAIN_AWK_BIN= bash -c \
  'source '"$SUBJECT"' 2>/dev/null; printf "%s" "$THYROX_TOOLCHAIN_AWK_BIN"')"
if [[ "$default_bin" == "awk" ]]; then
  ok "el binario por defecto es 'awk': el eje es cual responde"
else
  bad "el default deberia ser 'awk', dio '$default_bin'"
fi

# Caso 13 — el guard pasa sobre el awk que ESTE arbol tiene hoy. Es el control
# que separa «el mecanismo funciona» de «el mecanismo rehusa siempre».
if thyrox_toolchain_require_gawk >/dev/null 2>&1; then
  ok "el awk de este arbol pasa los dos ejes"
else
  bad "el awk de este arbol NO pasa: $(thyrox_toolchain_require_gawk 2>&1 | head -2)"
fi

thyrox_summary
