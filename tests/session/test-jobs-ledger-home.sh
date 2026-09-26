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
source "$_thyrox_root/src/lib/fixture.sh"
cd "$(thyrox_root)" || exit 1

# El ledger de `wait-jobs` y las corridas de `job_runs` son dos hogares
# distintos, y compartían variable: `THYROX_JOBS_DIR`. El `.env` la fija al
# hogar de las CORRIDAS (`.claude/jobs`), así que quien lo exportara movía el
# ledger ahí —medido: `THYROX_JOBS_DIR=.claude/jobs wait-jobs ledger-home`
# respondía `.claude/jobs`—, entre directorios que el gate del banco trata
# como bancos. El ledger tiene ahora su propia variable.
#
# Qué lo haría fallar: volver a leer THYROX_JOBS_DIR en el ledger cae el
# primer caso y el segundo (el .job cae en las corridas).

GUION=src/session/wait-jobs.sh
OK=0; FALLO=0
afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK+1)); echo "  ok    $1"
    else FALLO=$((FALLO+1)); echo "  FALLA $1 — esperado '$2', obtenido '$3'"; fi
}

RUNS=$(fixture_dir); LEDGER_X=$(fixture_dir)
unset THYROX_JOBS_LEDGER_DIR
afirmar "el hogar de las corridas NO mueve el ledger" "no" \
    "$( [[ "$(THYROX_JOBS_DIR="$RUNS" bash "$GUION" ledger-home 2>/dev/null | tail -1)" == "$RUNS" ]] && echo si || echo no)"
# `THYROX_JOBS_LEDGER_DIR` ya existía: es la RAÍZ de los ledgers
# (`job_ledger.ledger_root()`), y cada sesión cuelga su subdirectorio.
L=$(fixture_file); nohup bash -c "echo EXIT=0" >"$L" 2>&1 & P=$!; disown $P
THYROX_JOBS_DIR="$RUNS" THYROX_JOBS_LEDGER_DIR="$LEDGER_X" CLAUDE_CODE_SESSION_ID=s1 \
    bash "$GUION" register uno "$L" "$P" >/dev/null 2>&1
afirmar "el .job cae bajo la raíz del ledger, en su sesión, y nada en las corridas" "si 0" \
    "$( [[ -f "$LEDGER_X/s1/uno.job" ]] && echo si || echo no) $(find "$RUNS" -name '*.job' | wc -l)"

# Quien necesita el ledger en un directorio concreto —una suite, el respaldo
# de `user_wiring`— lo declara con su nombre, no con el de las corridas.
DIRECTO=$(fixture_dir)
L2=$(fixture_file); nohup bash -c "echo EXIT=0" >"$L2" 2>&1 & P2=$!; disown $P2
THYROX_JOBS_DIR="$RUNS" THYROX_SESSION_LEDGER_DIR="$DIRECTO" bash "$GUION" register dos "$L2" "$P2" >/dev/null 2>&1
afirmar "THYROX_SESSION_LEDGER_DIR es el ledger de la sesión, tal cual" "si 0" \
    "$( [[ -f "$DIRECTO/dos.job" ]] && echo si || echo no) $(find "$RUNS" -name '*.job' | wc -l)"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
