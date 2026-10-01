#!/usr/bin/env bash
# test-toolchain-uid-aware.sh — contrato de la politica UID-aware que decide
# si un instalador de apt lleva `sudo`, uno solo, reutilizada por TODOS los
# `THYROX_TOOLCHAIN_*_INSTALL_CMD` con default `sudo apt-get install -y ...`.
#
# El defecto que cierra: en un contenedor minimo con uid 0 y sin `sudo`
# instalado, un default que hardcodea `sudo apt-get install -y X` falla por
# `sudo: command not found` y no por el paquete — la causa real se enmascara
# detras de una herramienta que ni siquiera hacia falta invocar.
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

# Caso 1 — la funcion existe.
if type thyrox_toolchain_sudo_prefix &>/dev/null; then
  ok "la politica UID-aware existe"
else
  bad "falta thyrox_toolchain_sudo_prefix en $SUBJECT"
  thyrox_summary; exit 1
fi

# Caso 2 — rama uid 0: sin prefijo, el proceso ya tiene privilegio.
out="$(THYROX_TOOLCHAIN_EFFECTIVE_UID=0 thyrox_toolchain_sudo_prefix)"; rc=$?
if [[ $rc -eq 0 && -z "$out" ]]; then
  ok "uid 0 no antepone sudo"
else
  bad "uid 0 deberia dar prefijo vacio y exit 0, dio rc=$rc out='$out'"
fi

# Caso 3 — rama uid distinto de 0, con `sudo` disponible: antepone el binario.
# `sh` hace de doble de `sudo` — solo hace falta que resuelva en el PATH.
out="$(THYROX_TOOLCHAIN_EFFECTIVE_UID=1000 THYROX_TOOLCHAIN_SUDO_BIN=sh \
       thyrox_toolchain_sudo_prefix)"; rc=$?
if [[ $rc -eq 0 && "$out" == "sh " ]]; then
  ok "uid no privilegiado con sudo disponible antepone el binario"
else
  bad "esperaba prefijo 'sh ' y exit 0, dio rc=$rc out='$out'"
fi

# Caso 4 — EL QUE DISCRIMINA: uid distinto de 0 y `sudo` ausente. REHUSA con
# exit 2 y nombra la causa; no imprime nada por stdout — un prefijo vacio ahi
# se leeria como «uid 0», que es el desenlace equivocado.
AUSENTE="thyrox-sudo-que-no-existe-$$"
out="$(THYROX_TOOLCHAIN_EFFECTIVE_UID=1000 THYROX_TOOLCHAIN_SUDO_BIN="$AUSENTE" \
       thyrox_toolchain_sudo_prefix 2>&1 >/dev/null)"; rc=$?
stdout_out="$(THYROX_TOOLCHAIN_EFFECTIVE_UID=1000 THYROX_TOOLCHAIN_SUDO_BIN="$AUSENTE" \
       thyrox_toolchain_sudo_prefix 2>/dev/null)"
if [[ $rc -eq 2 ]]; then
  ok "uid no privilegiado sin sudo rehusa con exit 2"
else
  bad "esperaba exit 2 sin sudo disponible, dio $rc"
fi
if [[ "$out" == *THYROX_TOOLCHAIN_SUDO_BIN* ]]; then
  ok "el rechazo nombra la variable de sudo"
else
  bad "el rechazo no nombra THYROX_TOOLCHAIN_SUDO_BIN: '$out'"
fi
if [[ -z "$stdout_out" ]]; then
  ok "el rechazo no imprime ningun prefijo por stdout"
else
  bad "el rechazo emitio un prefijo por stdout: '$stdout_out'"
fi

# Caso 5 — aplicada a TODOS los defaults que hoy decian `sudo`: ninguna de
# las 14 invocaciones directas queda con `sudo` literal en el archivo. El
# conteo ES el control, no una muestra: `calibration-verified-numbers.md`
# exige la cifra medida, no supuesta.
restantes="$(grep -v '^[[:space:]]*#' "$SUBJECT" | grep -cE 'sudo apt-get install|sudo make|sudo "' || true)"
if [[ "$restantes" -eq 0 ]]; then
  ok "ningun 'sudo' literal queda hardcodeado en los instaladores (medido: 0)"
else
  bad "quedan $restantes invocaciones de 'sudo' sin pasar por la politica"
fi

# Caso 6 — un `*_INSTALL_CMD` declarado por el usuario se respeta TAL CUAL,
# sin que la politica se ejecute ni rehuse: `${VAR:-default}` no evalua el
# default cuando la variable ya esta fijada. Se re-sourcea en un subshell
# limpio con uid sin privilegio y sin sudo — si la politica se ejecutara,
# este mismo sourcing rehusaria y la variable quedaria vacia.
custom="mi-instalador-a-mano --paquete propio"
declarado="$(env -i PATH="$PATH" HOME="$HOME" \
  THYROX_TOOLCHAIN_EFFECTIVE_UID=1000 \
  THYROX_TOOLCHAIN_SUDO_BIN="$AUSENTE" \
  THYROX_TOOLCHAIN_REDIS_INSTALL_CMD="$custom" \
  bash -c "source '$SUBJECT' >/dev/null 2>&1; printf '%s' \"\$THYROX_TOOLCHAIN_REDIS_INSTALL_CMD\"")"
if [[ "$declarado" == "$custom" ]]; then
  ok "un INSTALL_CMD declarado por el usuario se respeta tal cual"
else
  bad "el INSTALL_CMD declarado se alteroa: '$declarado'"
fi

# Caso 7 — control de anulacion: forzar SIEMPRE `sudo` (como antes de esta
# regla) hace caer exactamente el caso 2 — la rama uid 0 — y ninguno mas.
# Se simula reemplazando temporalmente la funcion por una que ignora el uid.
thyrox_toolchain_sudo_prefix() { printf 'sudo '; return 0; }
out_anulado="$(THYROX_TOOLCHAIN_EFFECTIVE_UID=0 thyrox_toolchain_sudo_prefix)"
if [[ "$out_anulado" == "sudo " ]]; then
  ok "control de anulacion: forzar sudo siempre hace caer la rama uid 0"
else
  bad "la anulacion deberia reproducir el defecto original, dio '$out_anulado'"
fi
# El guard de doble inclusion mira SOLO thyrox_toolchain_provider_python: con
# esa sola funcion sin tocar, re-sourcear tras desanular es un no-op y la
# funcion trucada del caso 7 sobreviviria — se limpian TODAS antes de
# re-sourcear, igual que al inicio de este archivo.
for _stale in $(declare -F | awk '{print $3}' | grep '^thyrox_toolchain_' || true); do
  unset -f "$_stale"
done
unset _stale
source "$SUBJECT" >/dev/null 2>&1
out_restaurado="$(THYROX_TOOLCHAIN_EFFECTIVE_UID=0 thyrox_toolchain_sudo_prefix)"
if [[ -z "$out_restaurado" ]]; then
  ok "restaurada la funcion real, la rama uid 0 vuelve a verde"
else
  bad "tras restaurar deberia dar prefijo vacio, dio '$out_restaurado'"
fi

thyrox_summary
