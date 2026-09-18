#!/bin/bash
# =============================================================================
# test-run-task-pool-aislamiento.sh — dos despachos no se pisan
# =============================================================================
# Publica su conteo de aserciones al correr (`calibration-verified-numbers.md`).
#
# EL DEFECTO, medido por conducta antes de escribir esto: `run-task-pool.sh`
# componia la etiqueta como `<prefijo>-<ordinal>` y el log como
# `$DIR/<etiqueta>.log`, los dos PLANOS en el hogar global. Dos despachos que
# compartieran `--prefix` reusaban `cifras-001` y el segundo SOBREESCRIBIA el
# log del primero — la evidencia del primero desaparecia sin un byte de aviso.
# Y la etiqueta es la CLAVE del ledger (`job_ledger._path_for`), cuyo
# `register` «sobrescribe si la etiqueta ya existia»: la colision no era solo
# del archivo, era de la identidad del trabajo.
#
# LA FORMA, derivada de dos precedentes MEDIDOS, no inventada:
#   - el cliente organiza por DIRECTORIO POR SUJETO —`projects/<slug>/<uuid>/`,
#     `tasks/<uuid>/`—, nunca por ordinal plano;
#   - este arbol ya lo ejerce en `.claude/build-logs/rojo-…-20260917T090330/`,
#     con nombres DESCRIPTIVOS dentro.
# Y `convention-naming.md` prohibe el prefijo numerico: un ordinal fabrica un
# orden que no existe y no dice que contiene el archivo.
#
# EL CONTROL QUE DISCRIMINA es el caso 1: es el defecto real reproducido, no
# uno fabricado por quien escribio el arreglo.
# =============================================================================

set -uo pipefail

_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2

# El ledger se AISLA: sin esto la suite registra en el de la sesion viva.
export THYROX_JOBS_DIR="$(mktemp -d)/ledger"
POOL="$RAIZ/src/session/run-task-pool.sh"
WAIT_JOBS="$RAIZ/src/session/wait-jobs.sh"
OK=0; FALLA=0
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

af() { # af <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then OK=$((OK+1)); printf '  ok   %s\n' "$1"
    else FALLA=$((FALLA+1)); printf '  FALLA %s — esperado «%s», obtenido «%s»\n' "$1" "$2" "$3"; fi
}

despachar() { # despachar <archivo-de-comandos> [args...]
    bash "$POOL" --prefix cifras "$@" >/dev/null 2>&1
    bash "$WAIT_JOBS" wait --timeout 30 >/dev/null 2>&1
}

echo "test-run-task-pool-aislamiento:"

# -------------------------------------------------------------------------
# 1. EL CONTROL POSITIVO — dos despachos, mismo prefijo, la evidencia del
#    primero SOBREVIVE. Es el defecto real: hoy `cifras-001.log` pasaba de
#    PRIMER-DESPACHO a SEGUNDO-DESPACHO y quedaba UN archivo.
# -------------------------------------------------------------------------
export BG_DIR="$T/logs"
printf 'echo PRIMER-DESPACHO\n'  > "$T/a.txt"
printf 'echo SEGUNDO-DESPACHO\n' > "$T/b.txt"
despachar "$T/a.txt"
despachar "$T/b.txt"

_primero="$(grep -rl 'PRIMER-DESPACHO'  "$T/logs" 2>/dev/null | wc -l)"
_segundo="$(grep -rl 'SEGUNDO-DESPACHO' "$T/logs" 2>/dev/null | wc -l)"
af "la evidencia del PRIMER despacho sobrevive" 1 "$_primero"
af "la del SEGUNDO tambien esta"                1 "$_segundo"

# Y los dos logs son archivos DISTINTOS: si el segundo hubiera reusado el
# nombre, los dos greps darian 1 y 1 sobre el MISMO archivo. Este par es lo
# que separa «sobrevive» de «hay dos archivos».
af "y son dos archivos distintos" 2 \
   "$(find "$T/logs" -name '*.log' -type f | wc -l)"

# -------------------------------------------------------------------------
# 2. Cada despacho tiene su propio DIRECTORIO — la forma del cliente y la que
#    este arbol ya ejerce en build-logs/rojo-…/.
# -------------------------------------------------------------------------
af "cada despacho abrio su directorio" 2 \
   "$(find "$T/logs" -mindepth 1 -maxdepth 1 -type d | wc -l)"

# El nombre del directorio lleva el prefijo Y una marca temporal ISO, que es
# lo que lo hace unico entre despachos y ordenable cronologicamente.
af "el directorio lleva prefijo e ISO" si \
   "$(find "$T/logs" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' \
      | grep -qE '^cifras-[0-9]{8}T[0-9]{6}$' && echo si || echo no)"

# -------------------------------------------------------------------------
# 3. La ETIQUETA tambien es unica — la colision del ledger, que es la mitad
#    que un control de archivos no ve. `register` sobreescribe por etiqueta.
# -------------------------------------------------------------------------
#    El pool espera en SU PROPIA barrera, asi que al retornar el ledger ya
#    esta vacio: la colision solo es observable MIENTRAS corren. Por eso los
#    dos despachos van en segundo plano y se cuenta entre medias.
export THYROX_JOBS_DIR="$T/ledger-vivo"
export BG_DIR="$T/logs-vivo"
printf 'sleep 4\n' > "$T/lento-a.txt"
printf 'sleep 4\n' > "$T/lento-b.txt"
bash "$POOL" --prefix cifras "$T/lento-a.txt" >/dev/null 2>&1 &
_pa=$!
bash "$POOL" --prefix cifras "$T/lento-b.txt" >/dev/null 2>&1 &
_pb=$!
sleep 2
af "dos despachos dejan DOS trabajos en el ledger" 2 \
   "$(find "$T/ledger-vivo" -name '*.job' -type f 2>/dev/null | wc -l)"
wait "$_pa" "$_pb" 2>/dev/null

# -------------------------------------------------------------------------
# 4. Un NOMBRE descriptivo por trabajo — `nombre<TAB>comando`. El ordinal
#    fabrica un orden y no dice que contiene el archivo
#    (`convention-naming.md`).
# -------------------------------------------------------------------------
export THYROX_JOBS_DIR="$T/ledger-nom"
export BG_DIR="$T/logs-nom"
printf 'prefijos-por-raiz\techo HOLA\nmediana-de-lineas\techo ADIOS\n' > "$T/nombrados.txt"
despachar "$T/nombrados.txt"
af "el log lleva el nombre declarado, no el ordinal" si \
   "$(find "$T/logs-nom" -name 'prefijos-por-raiz.log' -type f | grep -q . && echo si || echo no)"
af "y el segundo tambien"                            si \
   "$(find "$T/logs-nom" -name 'mediana-de-lineas.log' -type f | grep -q . && echo si || echo no)"
af "ninguno quedo con nombre de ordinal"             0 \
   "$(find "$T/logs-nom" -name 'cifras-0*.log' -type f | wc -l)"

# -------------------------------------------------------------------------
# 5. RETROCOMPATIBILIDAD — una linea SIN tabulador sigue funcionando, y cae
#    al ordinal dentro de su propio directorio, que ya es inambiguo.
# -------------------------------------------------------------------------
export THYROX_JOBS_DIR="$T/ledger-sin"
export BG_DIR="$T/logs-sin"
printf 'echo SIN-NOMBRE\n' > "$T/sin-nombre.txt"
despachar "$T/sin-nombre.txt"
af "una linea sin tabulador sigue corriendo" 1 \
   "$(grep -rl 'SIN-NOMBRE' "$T/logs-sin" 2>/dev/null | wc -l)"

# -------------------------------------------------------------------------
# 6. Un comando que CONTIENE un tabulador no se parte por error: el nombre es
#    el primer campo SOLO si no tiene espacios ni barras — o sea, si parece un
#    nombre y no un comando. Lo que haria fallar: partir `awk '{print $1\t$2}'`
#    y lanzar `awk` con la mitad del cuerpo.
# -------------------------------------------------------------------------
export THYROX_JOBS_DIR="$T/ledger-tab"
export BG_DIR="$T/logs-tab"
printf 'printf "A\\tB\\n"\n' > "$T/con-tab.txt"
despachar "$T/con-tab.txt"
af "un comando con tabulador no se parte" 1 \
   "$(grep -rlP 'A\tB' "$T/logs-tab" 2>/dev/null | wc -l)"

echo
echo "resultado: $OK de $((OK+FALLA)) aserciones en verde"
[ "$FALLA" -eq 0 ] || exit 1
