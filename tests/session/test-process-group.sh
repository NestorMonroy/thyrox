#!/bin/bash
# =============================================================================
# test-process-group.sh — a quién alcanza la señal: GRUPO, no líder
# =============================================================================
# Nació como mitad ROJA de TASK-THYROX-0014: el árbol lanzaba sin `setsid` y
# `cmd_kill` señalaba sólo al líder, así que un trabajo que forkea hijos
# —`uv run pytest -n 4` abre cuatro workers— dejaba huérfanos reparentados a
# init al vencer el plazo. Esa mitad ya está en verde; la suite se queda como
# el control de regresión de a quién alcanza la señal.
#
# El caso 7 cierra TASK-THYROX-0015, que aquella dejó abierto: la rama `Z*` de
# `job_alive` no tenía control porque la ventana de cosecha real dura segundos
# y una aserción sobre ella sería intermitente.
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
# murió» de «nunca hubo hijos que matar». El caso 7 lleva su propio par de
# controles por la misma razón y en la dirección contraria: el grupo del zombi
# no está vacío, y el instrumento ingenuo habría dicho «vivo».
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
#    matado sale del ledger. Verde hoy; si se pone rojo, la corrección de
#    TASK-THYROX-0014 rompió la escotilla del Stop gate.
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

# -----------------------------------------------------------------------------
# 7. EL ZOMBI ESTABLE — el control que la rama `Z*` de `job_alive` no tenia.
#
#    Un zombi responde que SI a `kill -0 -- -$pgid`: el grupo «existe» aunque su
#    unico miembro sea una fila que espera cosecha. Con el instrumento ingenuo,
#    `cmd_kill` diria «NO murio» y NO soltaria el ledger — el turno bloqueado por
#    un cadaver, que es el fallo en la direccion contraria a la del caso 4 y
#    igual de real.
#
#    Por que hasta hoy no habia asercion: la ventana de cosecha real dura
#    segundos (medido, `process_api` cosecha los tres a los 3 s), asi que una
#    asercion sobre ella seria intermitente. El fixture la hace DETERMINISTA: el
#    hijo se hace lider de su propio grupo y muere; el padre vive y NO llama
#    `waitpid`, asi que nadie lo cosecha y el `Z` dura lo que el padre dure.
#
#    Que haria FALLAR este caso (sub-patron D): quitar `Z*` del `case` de
#    `job_alive`. Medido en el banco: caen EXACTAMENTE las dos aserciones de
#    abajo que dependen de ella —el veredicto «ya no corria» y la liberacion del
#    ledger— y ninguna de las otras. Los dos controles previos no dependen de la
#    rama: miden que el grupo no esta vacio y que el instrumento ingenuo habria
#    dicho «vivo».
# -----------------------------------------------------------------------------
cat > "$T/zombi.py" <<'EOZOMBI'
"""Deja un ZOMBI estable y lo nombra por la salida estandar.

Tres propiedades a la vez, y las tres hacen falta:

  1. ser el UNICO miembro de su grupo — si no, `job_alive` ve al vivo y el caso
     no llega a interrogar la rama `Z*`;
  2. estar en `Z` de forma SOSTENIDA, no durante la ventana de cosecha;
  3. conservar su PGID en la tabla de procesos, que es por donde `job_alive`
     selecciona.
"""
import os
import signal
import sys
import time

leido, escrito = os.pipe()
pid = os.fork()
if pid == 0:
    os.close(leido)
    os.setpgid(0, 0)              # lider de su propio grupo: pgid == su pid
    os.write(escrito, b"listo")
    os.close(escrito)
    os._exit(0)                   # muere de inmediato -> Z, ppid = el padre

os.close(escrito)
os.read(leido, 5)                 # el hijo ya hizo setpgid y ya murio
os.close(leido)
print(pid, flush=True)

# El padre NO cosecha. El zombi dura lo que el padre dure.
signal.signal(signal.SIGTERM, lambda *_: os._exit(0))
time.sleep(float(sys.argv[1]) if len(sys.argv) > 1 else 120.0)
EOZOMBI

python3 "$T/zombi.py" 60 > "$T/zombi.pid" 2>/dev/null &
ZPADRE=$!
echo "$ZPADRE" >> "$T/leaders"
ZOMBI=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
    ZOMBI="$(tr -d ' \n' < "$T/zombi.pid" 2>/dev/null)"
    [ -n "$ZOMBI" ] && break
    sleep 0.3
done

# Control a — el grupo NO esta vacio y su unico miembro es un zombi. Sin esto,
# un «soltado» no distinguiria «job_alive discrimina» de «no habia nada».
af "control: el grupo del zombi tiene 1 miembro, en estado Z" "1 Z" \
    "$(ps -eo pgid=,state= | awk -v g="$ZOMBI" '$1==g {n++; s=$2} END{print (n+0), (s==""?"-":s)}')"

# Control b — el instrumento ingenuo habria dicho «vivo». Es la razon de ser de
# la rama: `kill -0` sobre el grupo no separa un proceso de un cadaver.
af "control: kill -0 sobre el grupo dice SI (el ingenuo se equivoca)" "si" \
    "$(kill -0 -- -"$ZOMBI" 2>/dev/null && echo si || echo no)"

: > "$T/zombi.log"
bash "$WAIT_JOBS" register zombi-001 "$T/zombi.log" "$ZOMBI" >/dev/null 2>&1
KILL_SALIDA="$(bash "$WAIT_JOBS" kill zombi-001 3 2>&1)"

af "cmd_kill lee el cadaver como muerto, no lo señala" "ya no corria" \
    "$(printf '%s' "$KILL_SALIDA" | grep -q 'ya no corr' && echo "ya no corria" \
       || printf '%s' "$KILL_SALIDA" | head -1)"
af "el ledger se suelta: el turno no queda bloqueado por un cadaver" "no" \
    "$([ -f "$THYROX_JOBS_DIR/zombi-001.job" ] && echo si || echo no)"

kill -TERM "$ZPADRE" 2>/dev/null || true
bash "$WAIT_JOBS" forget zombi-001 >/dev/null 2>&1 || true

echo "test-process-group: $((OK+FALLA)) aserciones — $OK ok, $FALLA falla(s)"
[ "$FALLA" -eq 0 ]
