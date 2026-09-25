#!/bin/bash
# El hogar del ledger se declara con su PROPIA clave, THYROX_JOBS_LEDGER_DIR,
# y se lee tambien del `.env` que THYROX_ENV_FILE nombra (H-THYROX-179).
#
# El defecto que cierra: `wait-jobs.sh` leia THYROX_JOBS_DIR solo del proceso,
# y esa misma clave nombra en `job_runs.py` el hogar de los RUNS. Un consumer
# que la declara con ese significado en su `.env` no podia llevar el ledger a
# su arbol: exportarla mezclaria los `.job` con los runs y perderia el
# subdirectorio por sesion.
#
# EL CONTROL QUE DISCRIMINA (caso 5): un `.env` que declara solo
# THYROX_JOBS_DIR NO debe convertirse en el ledger. Una correccion que leyera
# esa clave del `.env` pasaria los casos 1 a 4 y fallaria aqui.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$ROOT/src/session/wait-jobs.sh"
T="$(mktemp -d)"
SID="ledger-home-test-$$"
PASSED=0; FAILED=0

assert_eq() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; (( PASSED++ ))
    else printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"; (( FAILED++ )); fi
}

# Cada invocacion parte de un entorno sin ninguna clave del ledger: el
# resultado no puede depender de lo que exporte quien ejecuta la suite.
run_clean() {
    env -u THYROX_JOBS_DIR -u KX_TRABAJOS_DIR -u THYROX_JOBS_LEDGER_DIR \
        -u THYROX_ENV_FILE CLAUDE_CODE_SESSION_ID="$SID" "$@"
}

echo "== 1. el .env del consumer declara THYROX_JOBS_LEDGER_DIR =="
printf 'THYROX_JOBS_LEDGER_DIR=%s\n' "$T/ledgers" > "$T/consumer.env"
assert_eq "ledger-home es la raiz declarada" "$T/ledgers" \
    "$(run_clean THYROX_ENV_FILE="$T/consumer.env" bash "$SCRIPT" ledger-home 2>&1)"
touch "$T/job.log"
run_clean THYROX_ENV_FILE="$T/consumer.env" bash "$SCRIPT" register probe "$T/job.log" >/dev/null 2>&1
assert_eq "register escribe el .job bajo <raiz>/<sesion>/" "si" \
    "$([[ -f "$T/ledgers/$SID/probe.job" ]] && echo si || echo no)"

echo "== 2. dos sesiones, dos ledgers =="
env -u THYROX_JOBS_DIR -u KX_TRABAJOS_DIR THYROX_ENV_FILE="$T/consumer.env" \
    CLAUDE_CODE_SESSION_ID="$SID-b" bash "$SCRIPT" register probe "$T/job.log" >/dev/null 2>&1
assert_eq "la segunda sesion no pisa el .job de la primera" "2" \
    "$(find "$T/ledgers" -name probe.job | wc -l | tr -d ' ')"

echo "== 3. la clave nueva exportada en el proceso, sin .env =="
assert_eq "ledger-home sale del proceso" "$T/from-process" \
    "$(run_clean THYROX_JOBS_LEDGER_DIR="$T/from-process" bash "$SCRIPT" ledger-home 2>&1)"

echo "== 4. THYROX_JOBS_DIR exportada (forma heredada) conserva su precedencia =="
assert_eq "el ledger heredado gana" "$T/legacy" \
    "$(run_clean THYROX_JOBS_DIR="$T/legacy" THYROX_ENV_FILE="$T/consumer.env" \
        bash "$SCRIPT" ledger-home 2>&1)"

echo "== 5. CONTROL — THYROX_JOBS_DIR en el .env NO es el ledger =="
printf 'THYROX_JOBS_DIR=%s\n' "$T/runs" > "$T/runs-only.env"
assert_eq "sin la clave nueva, el ledger queda en su default" "$ROOT/.claude/jobs-ledger" \
    "$(run_clean THYROX_ENV_FILE="$T/runs-only.env" bash "$SCRIPT" ledger-home 2>&1)"
assert_eq "y el hogar de runs no recibe un ledger" "no" \
    "$([[ -e "$T/runs/$SID" ]] && echo si || echo no)"

echo "== 6. un valor relativo se rechaza =="
printf 'THYROX_JOBS_LEDGER_DIR=relative/ledgers\n' > "$T/relative.env"
out="$(run_clean THYROX_ENV_FILE="$T/relative.env" bash "$SCRIPT" ledger-home 2>&1)"; code=$?
assert_eq "sale 2" "2" "$code"
assert_eq "y nombra la clave" "si" \
    "$(grep -q THYROX_JOBS_LEDGER_DIR <<<"$out" && echo si || echo no)"

# El caso 5 crea el subdirectorio de sesion en el default del PROVIDER; se
# retira para no dejar estado de prueba en el arbol.
rmdir "$ROOT/.claude/jobs-ledger/$SID" 2>/dev/null
rm -rf "$T"
echo "resultado: $PASSED ok · $FAILED falla(s)"
(( FAILED == 0 ))
