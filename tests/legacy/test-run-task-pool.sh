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
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# El ledger se AÍSLA: sin esto la suite registra en el de la sesión viva y un
# caso que deja un trabajo colgado bloquearía el turno de quien la corre.
export KX_TRABAJOS_DIR="$(mktemp -d)/ledger"
POOL="$AQUI/../session/run-task-pool.sh"
WAIT_JOBS="$AQUI/../session/wait-jobs.sh"
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

echo "test-run-task-pool: $((OK+FALLA)) aserciones — $OK ok, $FALLA falla(s)"
[ "$FALLA" -eq 0 ]
