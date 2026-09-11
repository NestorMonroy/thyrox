#!/bin/bash
# =============================================================================
# test-run-task-pool.sh — suite de `run-task-pool.sh`
# =============================================================================
# Publica su conteo de aserciones al correr (`calibration-verified-numbers.md`:
# una cifra que vive en código no se transcribe a prosa).
#
# Los dos casos que importan NO son los verdes: son (4) la cota de anchura, que
# es lo único que distingue un pool de un lanzamiento suelto, y (5) el trabajo
# que muere sin marcador, que es el control que tiene que fallar —sub-patrón D
# de `metrica-decide-la-conclusion.md`—.
# =============================================================================

set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
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
# El ledger se AÍSLA: sin esto la suite registra en el de la sesión viva y un
# caso que deja un trabajo colgado bloquearía el turno de quien la corre.
export KX_TRABAJOS_DIR="$(mktemp -d)/ledger"
POOL="$RAIZ/src/session/run-task-pool.sh"
WAIT_JOBS="$RAIZ/src/session/wait-jobs.sh"
OK=0; FALLA=0
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT

# `pendientes` y `estado` salen 1 CUANDO HAY TRABAJOS — es su contrato, para
# que el Stop hook no parsee. Con `set -o pipefail` ese 1 informativo se propaga
# y tumba el pipeline aunque el `grep` acierte, así que la salida se captura
# ANTES de interrogarla. Es el mismo defecto que la suite existe para atrapar:
# un control que falla por su instrumento, no por su sujeto.
contiene() { # contiene <texto> <patron> -> si|no
    printf '%s' "$1" | grep -qE "$2" && echo si || echo no
}

af() { # af <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then OK=$((OK+1)); printf '  ok   %s\n' "$1"
    else FALLA=$((FALLA+1)); printf '  FALLA %s — esperado «%s», obtenido «%s»\n' "$1" "$2" "$3"; fi
}

echo "test-run-task-pool:"

# 1. sin argumentos → exit 4, no un cuelgue silencioso
BG_DIR="$T/a" bash "$POOL" >/dev/null 2>&1; af "sin archivo sale 4" 4 $?

# 1-bis. sin hogar declarado → 4, y NO un default a /tmp.
# EL QUE DISCRIMINA de este par: el guion componia
# `${TMPDIR:-/tmp}/kaupamex-pool`, asi que una tanda sin declaracion escribia
# sus logs fuera del arbol del consumidor y se perdia con el contenedor. Un
# caso que solo mirara el codigo de salida pasaria igual con el default —los
# dos salen != 0 por otras razones—, asi que se comprueba TAMBIEN que el
# directorio no nacio.
#
# Que lo haria fallar: devolver el default a `DIR`. Entonces el guion llega a
# `mkdir -p` y el segundo `af` cae.
echo 'true' > "$T/uno-decl.txt"
# `TMPDIR` apunta a un directorio VACIO y propio: asi el segundo `af` mide lo
# que esta invocacion crea, no un residuo de una corrida anterior con el
# default viejo — que es lo que la primera version de este control midio.
_tmp_limpio="$T/tmpdir-limpio"; mkdir -p "$_tmp_limpio"
env -u BG_DIR -u THYROX_BACKGROUND_LOG_DIR TMPDIR="$_tmp_limpio" \
    THYROX_ENV_FILE=/dev/null bash "$POOL" "$T/uno-decl.txt" >/dev/null 2>&1
af "sin hogar declarado sale 4" 4 $?
af "y NO nacio un hogar bajo TMPDIR" no \
   "$([ -n "$(ls -A "$_tmp_limpio")" ] && echo si || echo no)"

# 2. archivo con 0 comandos → 4, y NO un 0 que se leería como «todo bien»
: > "$T/vacio.txt"
BG_DIR="$T/b" bash "$POOL" "$T/vacio.txt" >/dev/null 2>&1; af "0 comandos sale 4" 4 $?

# 3. --width no numérico → 4 antes de lanzar nada
printf 'true\n' > "$T/uno.txt"
BG_DIR="$T/c" bash "$POOL" --width 0 "$T/uno.txt" >/dev/null 2>&1; af "--width 0 sale 4" 4 $?

# 4. LA COTA SE EJERCE — 4 trabajos de 2 s: con anchura 2 son dos tandas.
#    Sin esta aserción, un pool roto que lanza todo a la vez pasaría igual.
printf 'sleep 2\nsleep 2\nsleep 2\nsleep 2\n' > "$T/c4.txt"
S=$(date +%s); BG_DIR="$T/d2" bash "$POOL" --width 2 --timeout 60 "$T/c4.txt" >/dev/null 2>&1; W2=$(( $(date +%s) - S ))
S=$(date +%s); BG_DIR="$T/d4" bash "$POOL" --width 4 --timeout 60 "$T/c4.txt" >/dev/null 2>&1; W4=$(( $(date +%s) - S ))
af "anchura 2 tarda mas que anchura 4 (${W2}s vs ${W4}s)" si "$([ "$W2" -gt "$W4" ] && echo si || echo no)"

# 5. CONTROL NEGATIVO — un trabajo vivo que nunca escribe su marcador: la
#    barrera NO puede darlo por bueno.
printf 'sleep 45\n' > "$T/lento.txt"
BG_DIR="$T/e" bash "$POOL" --width 1 --timeout 5 --prefix ctl "$T/lento.txt" >/dev/null 2>&1
af "trabajo sin marcador sale 3 (timeout)" 3 $?
PEND="$(bash "$WAIT_JOBS" pending 2>/dev/null)"
af "y sigue en el ledger" si "$(contiene "$PEND" 'ctl-001')"
EST="$(bash "$WAIT_JOBS" status 2>/dev/null)"
af "estado lo clasifica VIVO" si "$(contiene "$EST" 'ctl-001 +VIVO')"

# 5-bis. `matar` termina el proceso Y suelta la anotación — que es lo que
#        `olvidar` NO hace (deja el trabajo huérfano, medido 2026-09-04).
bash "$WAIT_JOBS" kill ctl-001 >/dev/null 2>&1
PEND2="$(bash "$WAIT_JOBS" pending 2>/dev/null)"
af "matar suelta el ledger" no "$(contiene "$PEND2" 'ctl-001')"

# 6. camino feliz: el codigo de salida de cada trabajo llega al log
printf 'exit 7\n' > "$T/siete.txt"
BG_DIR="$T/f" bash "$POOL" --width 1 --timeout 30 --prefix sal "$T/siete.txt" >/dev/null 2>&1
af "el marcador conserva el codigo real del trabajo" "EXIT=7" "$(grep -h '^EXIT=' "$T"/f/*.log 2>/dev/null | head -1)"

# 7. los comentarios y las lineas vacias no se lanzan
printf '# comentario\n\ntrue\n' > "$T/mix.txt"
BG_DIR="$T/g" bash "$POOL" --width 1 --timeout 30 --prefix mix "$T/mix.txt" >/dev/null 2>&1
af "solo se lanza el comando real" 1 "$(ls "$T"/g/*.log 2>/dev/null | wc -l)"

# =============================================================================
# TASK-THYROX-0013 — las dos formas de `--jobs` que la referencia admite
# =============================================================================
# GNU Parallel acepta cuatro formas de anchura; `--width` portaba una. Los
# casos de abajo cubren las dos que se portan (porcentaje y archivo releido) y
# la que se DECLARA divergente (`0`), con su razon medida en la cabecera del
# guion: de 4 a 16 trabajadores se gana 0.4x.
#
# El que DISCRIMINA es el 12: un porcentaje resuelto una sola vez al arrancar
# pasaria los casos 8 a 11 sin releer nada. Solo el 12 distingue «lee el
# archivo» de «relee el archivo en cada vuelta», que es la forma cuyo valor
# entero esta en cambiar la anchura sin matar el despacho.

NUCLEOS="$(nproc 2>/dev/null || echo 4)"

# 8. porcentaje — la mitad de los nucleos, piso 1
printf 'true\n' > "$T/pct.txt"
SAL="$(BG_DIR="$T/pct" bash "$POOL" --width 50% --timeout 30 --prefix pct "$T/pct.txt" 2>&1)"
af "50%% resuelve a la mitad de nproc" "$(( NUCLEOS / 2 > 0 ? NUCLEOS / 2 : 1 ))" \
   "$(printf '%s' "$SAL" | sed -n 's/.*anchura \([0-9]*\).*/\1/p' | head -1)"

# 9. porcentaje por encima de 100 — la referencia lo admite (`--jobs 200%`)
SAL="$(BG_DIR="$T/pct2" bash "$POOL" --width 200% --timeout 30 --prefix pct2 "$T/pct.txt" 2>&1)"
af "200%% resuelve al doble de nproc" "$(( NUCLEOS * 2 ))" \
   "$(printf '%s' "$SAL" | sed -n 's/.*anchura \([0-9]*\).*/\1/p' | head -1)"

# 10. `0%` cae en la DIVERGENCIA declarada, igual que `--width 0`: la
#     saturacion esta medida en nproc, asi que «tantos como sea posible» no se
#     porta. Que lo haria fallar: resolver `0%` a 0 y colgar el bucle.
BG_DIR="$T/pct0" bash "$POOL" --width 0% --timeout 30 "$T/pct.txt" >/dev/null 2>&1
af "0%% sale 4 como --width 0" 4 $?

# 11. archivo — la anchura se lee de su contenido
echo 2 > "$T/anchura.conf"
SAL="$(BG_DIR="$T/arch" bash "$POOL" --width "$T/anchura.conf" --timeout 30 --prefix arch "$T/pct.txt" 2>&1)"
af "el archivo aporta la anchura" 2 \
   "$(printf '%s' "$SAL" | sed -n 's/.*anchura \([0-9]*\).*/\1/p' | head -1)"

# 12. EL QUE DISCRIMINA — el archivo se RELEE al liberarse un hueco.
#     Cuatro durmientes con anchura 1: el primero corre mientras el archivo
#     pasa de 1 a 3, asi que los tres restantes entran juntos. Si la anchura
#     se resolviera una sola vez, entrarian de uno en uno y el reloj de pared
#     seria ~4 veces el de un durmiente.
echo 1 > "$T/vivo.conf"
printf 'sleep 2\nsleep 2\nsleep 2\nsleep 2\n' > "$T/cuatro.txt"
( sleep 1; echo 3 > "$T/vivo.conf" ) &
_SUBIDOR=$!
_INICIO="$(date +%s)"
BG_DIR="$T/relee" bash "$POOL" --width "$T/vivo.conf" --timeout 30 --prefix rel "$T/cuatro.txt" >/dev/null 2>&1
_LAPSO=$(( $(date +%s) - _INICIO ))
wait "$_SUBIDOR" 2>/dev/null
# El reloj SOLO no discrimina: si el guion rehusa la ruta, no lanza nada y el
# lapso es 0 — verde por no haber medido. Se exige TAMBIEN que los cuatro
# trabajos existan, que es lo que separa «rapido» de «no corrio».
af "los cuatro trabajos se lanzaron" 4 "$(ls "$T"/relee/*.log 2>/dev/null | wc -l)"
af "releer el archivo admite los cuatro en menos de 3 vueltas" si \
   "$([ "$_LAPSO" -lt 6 ] && echo si || echo no)"

# 13. EL DRENAJE — `0` en el archivo A MITAD del despacho: se deja de admitir
#     trabajos nuevos y los vivos terminan. Es lo que la forma de archivo
#     compra y que hoy no se podia hacer: frenar sin matar.
#
#     Que lo haria fallar: ignorar el 0 (se lanzarian los seis) o tratarlo como
#     el `--width 0` de lanzamiento (saldria 4 y no terminaria ninguno). Los
#     dos `af` de abajo separan esos dos modos: uno cuenta lo lanzado, el otro
#     comprueba que lo lanzado LLEGO A SU MARCADOR.
echo 2 > "$T/drena.conf"
printf 'sleep 2\nsleep 2\nsleep 2\nsleep 2\nsleep 2\nsleep 2\n' > "$T/seis.txt"
( sleep 1; echo 0 > "$T/drena.conf" ) &
_DRENADOR=$!
BG_DIR="$T/drena" bash "$POOL" --width "$T/drena.conf" --timeout 30 --prefix dre "$T/seis.txt" >/dev/null 2>&1
wait "$_DRENADOR" 2>/dev/null
_LANZADOS="$(ls "$T"/drena/*.log 2>/dev/null | wc -l)"
af "el drenaje corta antes de los seis" si \
   "$([ "$_LANZADOS" -ge 1 ] && [ "$_LANZADOS" -lt 6 ] && echo si || echo no)"
af "y los vivos llegaron a su marcador" "$_LANZADOS" \
   "$(grep -l '^EXIT=' "$T"/drena/*.log 2>/dev/null | wc -l)"

echo "test-run-task-pool: $((OK+FALLA)) aserciones — $OK ok, $FALLA falla(s)"
[ "$FALLA" -eq 0 ]
