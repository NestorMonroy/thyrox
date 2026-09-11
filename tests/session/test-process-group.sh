#!/bin/bash
# =============================================================================
# test-process-group.sh — el control de TASK-THYROX #327: matar por GRUPO
# =============================================================================
# Mitad ROJA. Hoy falla, y esa es su razón de existir: el árbol lanza sin
# `setsid` y `wait-jobs.sh cmd_kill` señala sólo al líder, así que un trabajo
# que forkea hijos —`uv run pytest -n 4` abre cuatro workers— deja huérfanos
# reparentados a init al vencer el plazo.
#
# La premisa del enunciado de la tarea decía «bg.sh mata por $pid (:209,
# :236)». Medido: `bg.sh` **no mata nunca** — ese `timeout` acota al `tail`,
# no al trabajo, y `cmd_wait` devuelve 124 dejándolo vivo. El único sitio de
# la familia que envía una señal es `wait-jobs.sh:561/:565`, y es el que esta
# suite interroga.
#
# Qué lo hace un control y no un adorno (sub-patrón D de
# `metrica-decide-la-conclusion.md`): el caso 3 mide los MISMOS pid ANTES del
# kill y exige 3 vivos. Sin él, un 0 tras el kill no distinguiría «el grupo
# murió» de «nunca hubo hijos que matar».
#
# Publica su conteo de aserciones al correr — `calibration-verified-numbers.md`
# prohíbe transcribirlo a prosa.
# =============================================================================

set -uo pipefail

# Arranque — DOS entradas de entorno (DEC-04): el VALOR de la raíz y la RUTA a
# su declaración. Copiado de `test-run-task-pool.sh`, que es el hermano.
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
export THYROX_JOBS_DIR="$(mktemp -d)/ledger"
BG="$RAIZ/src/session/bg.sh"
POOL="$RAIZ/src/session/run-task-pool.sh"
WAIT_JOBS="$RAIZ/src/session/wait-jobs.sh"
OK=0; FALLA=0
T="$(mktemp -d)"

af() { # af <descripcion> <esperado> <obtenido>
    if [ "$2" = "$3" ]; then OK=$((OK+1)); printf '  ok   %s\n' "$1"
    else FALLA=$((FALLA+1)); printf '  FALLA %s — esperado «%s», obtenido «%s»\n' "$1" "$2" "$3"; fi
}

group_of() { ps -o pgid= -p "$1" 2>/dev/null | tr -d ' '; }
session_of() { ps -o sid= -p "$1" 2>/dev/null | tr -d ' '; }

# Cuántos de los pid dados siguen vivos. El universo se declara: son los pid
# que el propio trabajo anotó más su líder, no «los del grupo» — con el árbol
# de hoy el grupo del trabajo ES el de esta suite, y contarlo mediría a la
# suite, no al sujeto.
# Universo declarado: los pid que el trabajo anotó + su líder. Cuenta por
# ESTADO, no con `kill -0`, y la razón está medida: un ZOMBI responde que sí a
# `kill -0` y NO es un superviviente — no corre, no retiene nada, y desaparece
# en cuanto su padre lo cosecha.
#
# Medido en este árbol tras `wait-jobs.sh kill`: los tres pid daban `kill -0=sí`
# con `ps` diciendo `Z 1 bash` / `Z 1 sleep` / `Z 1 sleep`, y a los 3 s el PID 1
# —`process_api`— los había cosechado y ya no existían. Con `kill -0`, este caso
# publicaba «3 supervivientes» sobre un grupo que estaba muerto.
#
# NO debilita el control: con el kill SÓLO al líder los hijos siguen corriendo
# en estado S —no zombis, porque nadie los mató— así que el conteo por estado
# sigue dando 2 y la aserción sigue en rojo. Lo que el cambio quita es un falso
# rojo por la ventana de cosecha, no el rojo real.
alive_among() {
    local n=0 p st
    for p in "$@"; do
        [ -n "$p" ] || continue
        st="$(ps -o state= -p "$p" 2>/dev/null | tr -d ' ')"
        case "$st" in ''|Z*) continue ;; esac
        n=$((n+1))
    done
    echo "$n"
}

# El trabajo que forkea: dos hijos que sobreviven al líder si nadie barre el
# grupo. Anota sus pid para que el control pueda interrogarlos después.
cat > "$T/forker.sh" <<'EOS'
#!/bin/bash
sleep 60 & echo "$!" >> "$1"
sleep 60 & echo "$!" >> "$1"
wait
EOS
chmod +x "$T/forker.sh"

limpieza() {
    local p
    for p in $(cat "$T"/kids-* 2>/dev/null) $(cat "$T"/leaders 2>/dev/null); do
        kill -KILL "$p" 2>/dev/null || true
    done
    rm -rf "$T"
}
trap limpieza EXIT

echo "test-process-group:"

# -----------------------------------------------------------------------------
# 1. El sitio de lanzamiento de `bg.sh` deja al trabajo como LÍDER de su grupo.
#    Sin `setsid`, su pgid es el de quien lo lanzó y `kill -- -$pid` no nombra
#    ningún grupo propio: no hay a qué apuntar.
# -----------------------------------------------------------------------------
BG_OUT="$(BG_DIR="$T/bg" bash "$BG" start uno --grace 0 -- sleep 30 2>/dev/null)"
BG_PID="$(printf '%s' "$BG_OUT" | sed -n 's/^PID=//p')"
echo "$BG_PID" >> "$T/leaders"
af "bg.sh: el trabajo es lider de su grupo (pgid==pid)" "$BG_PID" "$(group_of "$BG_PID")"
kill -KILL "$BG_PID" 2>/dev/null || true

# -----------------------------------------------------------------------------
# 2. El sitio de lanzamiento del pool, igual. Se le da un plazo corto: el pool
#    espera en primer plano, así que devuelve 3 (timeout) y deja el trabajo
#    vivo y registrado — que es justo el estado que el caso 3 necesita.
# -----------------------------------------------------------------------------
printf '%s\n' "bash $T/forker.sh $T/kids-pool" \
    | bash "$POOL" - --width 1 --timeout 2 --dir "$T/pool" --prefix grp >/dev/null 2>&1
POOL_PID="$(sed -n 's/^pid=//p' "$THYROX_JOBS_DIR"/grp-001.job 2>/dev/null)"
echo "$POOL_PID" >> "$T/leaders"
af "run-task-pool: el trabajo es lider de su grupo (pgid==pid)" "$POOL_PID" "$(group_of "$POOL_PID")"

# -----------------------------------------------------------------------------
# 3. CONTROL DE DISCRIMINACIÓN — antes de matar, los tres están vivos.
#    Si esto no diera 3, el caso 4 sería un verde que no mide nada: un 0 de
#    supervivientes sobre un conjunto que ya estaba vacío.
# -----------------------------------------------------------------------------
KIDS="$(cat "$T/kids-pool" 2>/dev/null | tr '\n' ' ')"
af "control: lider + 2 hijos vivos ANTES del kill" 3 "$(alive_among "$POOL_PID" $KIDS)"

# -----------------------------------------------------------------------------
# 4. EL CASO ROJO — tras `wait-jobs.sh kill`, no sobrevive nadie del trabajo.
#    Hoy sobreviven los dos hijos, reparentados a init.
# -----------------------------------------------------------------------------
bash "$WAIT_JOBS" kill grp-001 3 >/dev/null 2>&1
sleep 1
af "kill barre el GRUPO: 0 supervivientes" 0 "$(alive_among "$POOL_PID" $KIDS)"

# -----------------------------------------------------------------------------
# 5. El contrato que ya existe y que el cambio NO debe romper: un trabajo
#    matado sale del ledger. Verde hoy; si se pone rojo, la corrección de #327
#    rompió la escotilla del Stop gate.
# -----------------------------------------------------------------------------
af "el ledger suelta la etiqueta matada" "no" \
    "$([ -f "$THYROX_JOBS_DIR/grp-001.job" ] && echo si || echo no)"

# -----------------------------------------------------------------------------
# 6. EL LIDER DE GRUPO QUE NO LIDERA SESION — la clase que los casos 1-5 no
#    podian alcanzar, porque `bg.sh` y el pool lanzan con `setsid` y ahi
#    sid == pgid: los dos selectores coinciden y ninguno delata al otro.
#
#    El fixture la produce con control de trabajos activo (`set -m`), que es
#    como nace un trabajo de fondo de un shell interactivo o adoptado de fuera.
#    Medido: pid 7363, pgid 7363, sid 7360.
#
#    Qué haria FALLAR este caso (sub-patron D): que `job_alive` seleccione por
#    SESION. Con `ps -o state= -g $pid` el conjunto sale VACIO, `cmd_kill` toma
#    la rama «ya no corria — soltado» y libera el ledger SIN senalar. El caso
#    6b mide exactamente eso: el proceso tiene que estar muerto DESPUES.
# -----------------------------------------------------------------------------
SETM_PID="$(bash -c 'set -m; sleep 300 >/dev/null 2>&1 & echo $!')"
sleep 0.3
: > "$T/setm.log"
af "control: el fixture LIDERA su grupo (pgid==pid)" "$SETM_PID" "$(group_of "$SETM_PID")"
af "control: y NO lidera su sesion (sid!=pid)" "distintos" \
    "$([ "$(session_of "$SETM_PID")" = "$SETM_PID" ] && echo iguales || echo distintos)"
bash "$WAIT_JOBS" register setm-001 "$T/setm.log" "$SETM_PID" >/dev/null 2>&1
bash "$WAIT_JOBS" kill setm-001 3 >/dev/null 2>&1
sleep 1
af "kill alcanza al lider de grupo sin sesion propia" 0 "$(alive_among "$SETM_PID")"
kill -KILL "$SETM_PID" 2>/dev/null || true
bash "$WAIT_JOBS" forget setm-001 >/dev/null 2>&1 || true

echo "test-process-group: $((OK+FALLA)) aserciones — $OK ok, $FALLA falla(s)"
[ "$FALLA" -eq 0 ]
