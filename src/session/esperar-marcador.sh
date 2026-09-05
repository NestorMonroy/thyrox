#!/bin/bash
# =============================================================================
# esperar-marcador.sh — esperar el marcador terminal de un trabajo, y ABORTAR
# con el error real si el trabajo muere antes de escribirlo
# =============================================================================
#
# Por qué existe
# --------------
# El patrón R-2.0 de `long-running-commands.md:114` espera así:
#
#     until grep -qE "^EXIT=" "$LOG"; do sleep 2; done && tail -5 "$LOG"
#
# Ese `until` **no tiene guarda de muerte**. Si el comando revienta antes de
# escribir su `EXIT=` —OOM, `set -e` en una línea temprana, un `kill`— el bucle
# gira hasta el timeout del harness. `test-execution-protocol.md` ya lo tenía
# escrito como anti-patrón: *"sin marcador `EXIT=` garantizado en el log → el
# `until` queda esperando para siempre"*. Estaba diagnosticado y sin mecanismo.
#
# El costo no es la espera: es **qué se aprende al final**. Un timeout no dice
# si el trabajo murió, si sigue corriendo, o si el marcador nunca iba a llegar.
# Las tres se ven igual, y es exactamente el caso de `bash-background-tasks.md`
# que ERR-12 registró en otro plano.
#
# De dónde sale — y la corrección de rango que lo produjo
# --------------------------------------------------------
# `ccb: bgDaemon.ts:462-469`, el manejador de `dispatch`:
#
#     vm.on('settled', (outcome) => {
#       // ant respawn_unconfirmed_bail: if dispatch settled before ack
#       // budget elapsed, mark failed so await-ack returns the real
#       // error instead of timing out.
#       if (!pending.acked) {
#         pending.failed = { code: 'ECRASHED', error: `... settled before ack` }
#
# Ése es el mecanismo: **quien espera recibe el error real, no un timeout**.
#
# El capítulo 21 de `hccw` (rango 3, leído de cadenas) lo describía como
# "confirmar la muerte antes de respawnear" — anti-duplicación. Es otra cosa,
# y el propio capítulo había declarado esa ceguera: los nombres son verbatim,
# las condiciones de disparo no tienen fuente detrás. Ver :ref:`h-docs-140`.
#
# Uso
# ---
#   esperar-marcador.sh <log> [--pid N] [--patron RE] [--timeout SEGUNDOS]
#
#     exit 0 — apareció el marcador (imprime las últimas líneas)
#     exit 2 — BAIL: el proceso murió sin escribirlo (imprime la cola real)
#     exit 3 — timeout sin marcador y sin poder decidir por qué
#
# `--pid` es lo que separa el exit 2 del exit 3. Sin él sólo se puede esperar,
# y el guion lo dice en vez de fingir que decidió.
# =============================================================================

set -uo pipefail

LOG="${1:?uso: esperar-marcador.sh <log> [--pid N] [--patron RE] [--timeout S]}"
shift

PID=""
PATRON='^EXIT=[0-9]+'
TIMEOUT=1800
INTERVALO="${ESPERAR_INTERVALO:-2}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pid)     PID="${2:?--pid exige un número}"; shift 2 ;;
    --patron)  PATRON="${2:?--patron exige una expresión}"; shift 2 ;;
    --timeout) TIMEOUT="${2:?--timeout exige segundos}"; shift 2 ;;
    *) echo "argumento no reconocido: $1" >&2; exit 64 ;;
  esac
done

INICIO=$(date +%s)

# El marcador se busca con `grep` sobre el ARCHIVO, no por tubería: `grep -q`
# cierra la tubería al primer match y bajo `pipefail` el pipeline sale 141
# aunque el patrón haya coincidido (H-DOCS-120). Leyendo el archivo directo
# no hay productor al que matar.
tiene_marcador() { grep -qE "$PATRON" "$LOG" 2>/dev/null; }

# `kill -0` pregunta por la existencia del proceso sin señalarlo. Devuelve
# falso también si el proceso existe pero es de otro usuario — por eso el
# mensaje de BAIL dice "no responde a kill -0", no "murió": es lo que se midió.
sigue_vivo() { [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; }

while true; do
  if tiene_marcador; then
    echo "== marcador presente =="
    tail -5 "$LOG" 2>/dev/null
    exit 0
  fi

  if [[ -n "$PID" ]] && ! sigue_vivo; then
    # Carrera real: el proceso puede escribir el marcador y morir entre las
    # dos comprobaciones. Se vuelve a mirar antes de declarar el BAIL.
    sleep 1
    if tiene_marcador; then
      echo "== marcador presente (escrito al salir) =="
      tail -5 "$LOG" 2>/dev/null
      exit 0
    fi
    echo "BAIL — el proceso $PID no responde a kill -0 y el log no tiene '$PATRON'."
    echo "       El trabajo murió sin escribir su marcador. Esto NO es un"
    echo "       timeout: es el error real, disponible ahora y no en $((TIMEOUT))s."
    echo
    echo "       últimas líneas de $LOG:"
    tail -15 "$LOG" 2>/dev/null | sed 's/^/       | /'
    [[ -s "$LOG" ]] || echo "       | (vacío — murió antes de emitir nada)"
    exit 2
  fi

  if (( $(date +%s) - INICIO >= TIMEOUT )); then
    echo "TIMEOUT — ${TIMEOUT}s sin '$PATRON' en $LOG."
    if [[ -z "$PID" ]]; then
      echo "          Sin --pid no se puede distinguir 'sigue corriendo' de"
      echo "          'murió callado'. Relanzar la espera con --pid lo decide."
    else
      echo "          El proceso $PID sigue vivo: el trabajo no terminó."
    fi
    exit 3
  fi

  sleep "$INTERVALO"
done
