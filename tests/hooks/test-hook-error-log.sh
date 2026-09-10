#!/usr/bin/env bash
# Pruebas de hook_error_log.run_and_log (src/hooks/error_log.py).
#
# Adaptación del patrón `report("tool_call", {...})` de TencentDB Agent
# Memory: index.ts:352-480 (envuelve tdai_memory_search/conversation_search
# con try/catch-a-texto + telemetría de éxito/fallo). Antes de esto,
# inject_auto_recall.py y register_agent_session.py hacían
# `subprocess.run(..., capture_output=True)` sin inspeccionar jamás
# `returncode` — un fallo real (agent_id inexistente, timeout, binario
# ausente) se descartaba en silencio, indistinguible de un éxito. Ver
# H-DOCS-165.

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
cd "$(thyrox_root)" || exit 1

HOOKS=src/hooks
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

echo "== 0. sintaxis =="
# `inject_auto_recall.py` NUNCA se portó a thyrox (hook especifico del
# consumidor; sólo cmd_auto_recall de agent_store.py viajó) — se cae de
# este barrido. Los otros dos SÍ tienen forma en thyrox, con nombre nuevo.
for f in "$HOOKS/error_log.py" "src/agents/register_session.py"; do
    python3 -c "import ast; ast.parse(open('$f').read())"
    afirmar "$(basename "$f") parsea" 0 $?
done

TMP=$(mktemp -d)
LOG="$TMP/errores-hooks.md"

# El destino ya NO se fija reasignando una constante del modulo: `LOG_PATH` paso
# a ser `log_path()`, que deriva del directorio que el consumidor inyecta. El
# fixture usa ese mismo canal —`KAUPAMEX_RESULTS_DIR`— en vez de parchear el
# simbolo. Las aserciones no cambian: lo que cambia es por donde entra la ruta.
#
# NO se exporta global: cada caso lo declara por invocacion, para que el
# valor de $TMP de los casos 1-4 nunca se filtre al puente de los casos 6-9
# (que usa su PROPIO temporal, via $LOG_PUENTE). Ambos bloques necesitan la
# variable declarada explicitamente — el port CORRIGIO la fuente (H-DOCS-1080):
# `results_dir()` ya NO deriva de `__file__` (eso escribia en el arbol de
# THYROX); REHUSA si RESULTS_DIR_VARS no esta declarada. El comentario viejo
# de esta suite decia lo contrario porque describia la fuente sin portar.
export THYROX_ROOT="${THYROX_ROOT:-$(thyrox_root)}"

run_contra_log_temporal() {  # ejecuta el snippet con el directorio inyectado
    KAUPAMEX_RESULTS_DIR="$TMP" python3 -c "
import sys
sys.path.insert(0, '$HOOKS')
import error_log as hook_error_log
$1
"
}

echo "== 1. returncode != 0 (fallo real, no fabricado: exit 1) SÍ se registra =="
run_contra_log_temporal "
r = hook_error_log.run_and_log('test-hook', [sys.executable, '-c', 'import sys; sys.exit(1)'])
print('returncode:', r.returncode)
"
afirmar "log existe tras un fallo real" "1" "$(test -f "$LOG" && echo 1 || echo 0)"
afirmar "el log nombra el hook que falló" "1" "$(grep -qc 'test-hook' "$LOG" 2>/dev/null && echo 1 || echo 0)"
afirmar "el log trae el returncode" "1" "$(grep -qc 'returncode: 1' "$LOG" 2>/dev/null && echo 1 || echo 0)"

echo "== 2. returncode == 0 (éxito) NO ensucia el log =="
rm -f "$LOG"
run_contra_log_temporal "
r = hook_error_log.run_and_log('test-hook-ok', [sys.executable, '-c', 'print(\"hola\")'])
print('stdout:', r.stdout.strip())
"
afirmar "éxito no crea el log" "0" "$(test -f "$LOG" && echo 1 || echo 0)"

echo "== 3. el comando ni siquiera puede lanzarse (binario ausente) — se registra y devuelve None =="
rm -f "$LOG"
SALIDA=$(run_contra_log_temporal "
r = hook_error_log.run_and_log('test-hook-missing', ['/no/existe/binario-de-prueba'])
print('resultado:', r)
")
afirmar "run_and_log devuelve None si no pudo lanzar" "resultado: None" "$SALIDA"
afirmar "el binario ausente igual se registra" "1" "$(test -f "$LOG" && echo 1 || echo 0)"

echo "== 4. nunca lanza — timeout se atrapa y registra, no propaga =="
rm -f "$LOG"
run_contra_log_temporal "
r = hook_error_log.run_and_log('test-hook-timeout', [sys.executable, '-c', 'import time; time.sleep(2)'], timeout=0.1)
print('resultado:', r)
"
afirmar "timeout se registra (no excepción sin atrapar)" "1" "$(test -f "$LOG" && echo 1 || echo 0)"

echo "== 5. control positivo real: el fallo que register_agent_session.py --stop puede pisar =="
# El hook envuelve exactamente este subcomando (actualizar-sesion) con
# run_and_log. Este bloque reproduce el fallo real que antes se descartaba
# en silencio (returncode 1 nunca inspeccionado) — no es un fallo fabricado
# a mano, es cmd_update_session's sys.exit(1) real ante un agent_id ausente.
python3 src/agents/agent_store.py init --claude-dir "$TMP/.claude/agent-results" >/dev/null
SALIDA_CLI=$(python3 src/agents/agent_store.py actualizar-sesion \
    --claude-dir "$TMP/.claude/agent-results" --agent-id "no-existe-nunca" --status completed 2>&1)
EXIT_CLI=$?
afirmar "actualizar-sesion con agent_id inexistente falla de verdad (exit 1)" "1" "$EXIT_CLI"
afirmar "el mensaje de error es el esperado" "1" "$(grep -qc 'no existe' <<<"$SALIDA_CLI" && echo 1 || echo 0)"

# --- El puente para hooks en bash (#709) ---------------------------------
#
# Verifica que error_log.py funciona igual COPIADO a otra ubicación (el
# patrón real: el hook vive junto a otros hooks del consumidor, no en
# src/hooks/ de thyrox). El destino del log sigue entrando por
# KAUPAMEX_RESULTS_DIR (results_dir() rehúsa sin ella, H-DOCS-1080) — lo
# que aquí se prueba es que la copia sigue pudiendo importar paths.reach
# desde su nueva ubicación (ver el `cp -r .../paths` de arriba).
PUENTE_DIR="$TMP/hooks"
mkdir -p "$PUENTE_DIR"
cp "$HOOKS/error_log.py" "$PUENTE_DIR/hook_error_log.py"
# error_log.py compone su propio sys.path como `parents[1]` de SU PROPIA
# ubicación física (no vía THYROX_ROOT) para poder importar `paths.reach`
# tanto en invocación directa como empaquetada. La copia necesita, pues, un
# `paths/` hermano — no basta con exportar THYROX_ROOT.
cp -r "$(thyrox_root)/src/paths" "$TMP/paths"
# results_dir() usa el VALOR de KAUPAMEX_RESULTS_DIR directamente (no le
# concatena "agent-results"); log_path() = results_dir()/LOG_NAME.
PUENTE_RESULTS="$TMP/puente-results"
LOG_PUENTE="$PUENTE_RESULTS/errores-hooks.md"

echo "== 6. puente CLI: un comando que falla propaga su returncode y deja rastro =="
KAUPAMEX_RESULTS_DIR="$PUENTE_RESULTS" python3 "$PUENTE_DIR/hook_error_log.py" prueba-puente -- \
    python3 -c 'import sys; sys.stderr.write("se rompio\n"); sys.exit(3)' >/dev/null 2>&1
afirmar "el puente propaga el returncode del comando" "3" "$?"
afirmar "el fallo dejó rastro en el log" "1" "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"
afirmar "el rastro nombra la etiqueta que pasó el hook" "1" \
        "$(grep -qc 'prueba-puente' "$LOG_PUENTE" 2>/dev/null && echo 1 || echo 0)"
afirmar "el rastro trae el stderr real del comando" "1" \
        "$(grep -qc 'se rompio' "$LOG_PUENTE" 2>/dev/null && echo 1 || echo 0)"

echo "== 7. contra-control: el éxito NO deja rastro, y reemite el stdout =="
# Sin este caso, un puente que registrara SIEMPRE pasaría el caso 6 igual: el
# verde no distinguiría «registra el fallo» de «registra todo». Sub-patrón D.
rm -f "$LOG_PUENTE"
SALIDA_PUENTE=$(KAUPAMEX_RESULTS_DIR="$PUENTE_RESULTS" python3 "$PUENTE_DIR/hook_error_log.py" prueba-puente-ok -- \
    python3 -c 'print("resultado del comando")' 2>/dev/null)
afirmar "el puente devuelve 0 cuando el comando tuvo éxito" "0" "$?"
afirmar "el puente reemite el stdout del comando" "resultado del comando" "$SALIDA_PUENTE"
afirmar "el éxito NO crea el log" "0" "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"

echo "== 8. puente CLI: el comando ni siquiera se lanza — 127, como un shell =="
rm -f "$LOG_PUENTE"
KAUPAMEX_RESULTS_DIR="$PUENTE_RESULTS" python3 "$PUENTE_DIR/hook_error_log.py" prueba-puente-ausente -- \
    /no/existe/binario-de-prueba >/dev/null 2>&1
afirmar "binario ausente devuelve 127" "127" "$?"
afirmar "y aun así deja rastro" "1" "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"

echo "== 9. puente CLI: uso incorrecto (sin --) devuelve 2 y no ejecuta nada =="
rm -f "$LOG_PUENTE"
KAUPAMEX_RESULTS_DIR="$PUENTE_RESULTS" python3 "$PUENTE_DIR/hook_error_log.py" solo-la-etiqueta >/dev/null 2>&1
afirmar "sin separador -- devuelve 2" "2" "$?"
afirmar "y no registra nada (no llegó a ejecutar un comando)" "0" \
        "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"

rm -rf "$TMP"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
