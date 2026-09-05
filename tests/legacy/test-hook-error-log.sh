#!/usr/bin/env bash
# Pruebas de hook_error_log.run_and_log (.claude/hooks/hook_error_log.py).
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
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

HOOKS=.claude/hooks
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

echo "== 0. sintaxis =="
for f in hook_error_log.py inject_auto_recall.py register_agent_session.py; do
    python3 -c "import ast; ast.parse(open('$HOOKS/$f').read())"
    afirmar "$f parsea" 0 $?
done

TMP=$(mktemp -d)
LOG="$TMP/errores-hooks.md"

# El destino ya NO se fija reasignando una constante del modulo: `LOG_PATH` paso
# a ser `log_path()`, que deriva del directorio que el consumidor inyecta. El
# fixture usa ese mismo canal —`KAUPAMEX_RESULTS_DIR`— en vez de parchear el
# simbolo. Las aserciones no cambian: lo que cambia es por donde entra la ruta.
#
# Y NO se exporta global: los casos 6-9 copian el stub a $PUENTE_DIR y miden
# precisamente que DERIVA su destino de su propio __file__. Un export global
# ganaria sobre ese `setdefault` y el puente escribiria en $LOG en vez de en
# $LOG_PUENTE — el fixture mediria el fenomeno equivocado. Va por invocacion.
# Y la raiz del dueno, por la copia a $PUENTE_DIR del caso 6 (ver ahi).
export THYROX_ROOT="${THYROX_ROOT:-$(cd "$HOOKS/../.." && pwd)/../thyrox}"

run_contra_log_temporal() {  # ejecuta el snippet con el directorio inyectado
    KAUPAMEX_RESULTS_DIR="$TMP" python3 -c "
import sys
sys.path.insert(0, '$HOOKS')
import hook_error_log
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
python3 .claude/scripts/agents/agent_store.py init --claude-dir "$TMP/.claude/agent-results" >/dev/null
SALIDA_CLI=$(python3 .claude/scripts/agents/agent_store.py actualizar-sesion \
    --claude-dir "$TMP/.claude/agent-results" --agent-id "no-existe-nunca" --status completed 2>&1)
EXIT_CLI=$?
afirmar "actualizar-sesion con agent_id inexistente falla de verdad (exit 1)" "1" "$EXIT_CLI"
afirmar "el mensaje de error es el esperado" "1" "$(grep -qc 'no existe' <<<"$SALIDA_CLI" && echo 1 || echo 0)"

# --- El puente para hooks en bash (#709) ---------------------------------
#
# `LOG_PATH` no es redirigible por entorno (a diferencia de `spool_path()`),
# así que el fixture reubica el MÓDULO: `_RESULTS_DIR` se resuelve relativo a
# `__file__`, de modo que una copia en `$TMP/hooks/` escribe en
# `$TMP/agent-results/`. Es la misma técnica que usa la suite del hook del
# tablero, y evita contaminar el artefacto real de la sesión.
PUENTE_DIR="$TMP/hooks"
mkdir -p "$PUENTE_DIR"
cp "$HOOKS/hook_error_log.py" "$PUENTE_DIR/hook_error_log.py"
LOG_PUENTE="$TMP/agent-results/errores-hooks.md"

echo "== 6. puente CLI: un comando que falla propaga su returncode y deja rastro =="
python3 "$PUENTE_DIR/hook_error_log.py" prueba-puente -- \
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
SALIDA_PUENTE=$(python3 "$PUENTE_DIR/hook_error_log.py" prueba-puente-ok -- \
    python3 -c 'print("resultado del comando")' 2>/dev/null)
afirmar "el puente devuelve 0 cuando el comando tuvo éxito" "0" "$?"
afirmar "el puente reemite el stdout del comando" "resultado del comando" "$SALIDA_PUENTE"
afirmar "el éxito NO crea el log" "0" "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"

echo "== 8. puente CLI: el comando ni siquiera se lanza — 127, como un shell =="
rm -f "$LOG_PUENTE"
python3 "$PUENTE_DIR/hook_error_log.py" prueba-puente-ausente -- \
    /no/existe/binario-de-prueba >/dev/null 2>&1
afirmar "binario ausente devuelve 127" "127" "$?"
afirmar "y aun así deja rastro" "1" "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"

echo "== 9. puente CLI: uso incorrecto (sin --) devuelve 2 y no ejecuta nada =="
rm -f "$LOG_PUENTE"
python3 "$PUENTE_DIR/hook_error_log.py" solo-la-etiqueta >/dev/null 2>&1
afirmar "sin separador -- devuelve 2" "2" "$?"
afirmar "y no registra nada (no llegó a ejecutar un comando)" "0" \
        "$(test -f "$LOG_PUENTE" && echo 1 || echo 0)"

rm -rf "$TMP"

echo
printf '%d ok, %d fallos\n' "$OK" "$FALLO"
exit $(( FALLO > 0 ))
