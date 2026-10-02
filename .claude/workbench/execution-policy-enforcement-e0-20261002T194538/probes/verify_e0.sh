#!/usr/bin/env bash
# Verificación de E0 en un solo trabajo gestionado, para que nadie edite los árboles mientras corre:
#   RED   — las pruebas del cambio, copiadas al worktree base, tienen que FALLAR allí;
#   GREEN — en el worktree del cambio tienen que PASAR;
#   ANULACIÓN — retirada cada mitad de juicio en el cambio, tiene que caer su caso; se restaura por copia.
# Uso: verify_e0.sh <worktree-base> <worktree-cambio> <salida>
set -uo pipefail
BASE="$1"; CHANGE="$2"; OUT="$3"; MAIN=/home/user/thyrox
mkdir -p "$OUT"
export PYTHONDONTWRITEBYTECODE=1
TESTS=(tests/hooks/test_execution_policy_enforcement.py tests/hooks/test_detect_client_background.py
       tests/hooks/test_detect_agent_dispatch.py src/packages/provider/__tests__/recommendExecution.test.ts
       tests/agents/test_recommend_cli.py tests/session/test-headless-pool-model-policy.sh
       tests/hooks/test_tool_use_preflight.py tests/session/test_user_wiring.py)
SUPPORT=(tests/fixtures/execution_policy_unrestricted.json)

run_test() { # <árbol> <prueba> → salida por stdout, código como retorno
  local tree="$1" test="$2"
  case "$test" in
    *.test.ts) (cd "$tree/$(dirname "$(dirname "$test")")" && bun test "${test#*/__tests__/}" 2>&1; exit "${PIPESTATUS[0]}") ;;
    *test_detect_agent_dispatch.py)
      # Sus casos son funciones test_*; sin pytest en la unidad, se llaman una a una.
      (cd "$tree" && THYROX_ROOT="$tree" PYTHONPATH="$tree/src" python3 - "$test" <<'PY' 2>&1; exit "${PIPESTATUS[0]}")
import importlib.util, sys, traceback
spec = importlib.util.spec_from_file_location("suite", sys.argv[1]); suite = importlib.util.module_from_spec(spec); spec.loader.exec_module(suite)
cases = [name for name in dir(suite) if name.startswith("test_")]; failed = []
for name in cases:
    try: getattr(suite, name)()
    except Exception: failed.append(name); traceback.print_exc()
print(f"{len(cases) - len(failed)} passed, {len(failed)} failed: {failed}")
sys.exit(1 if failed else 0)
PY
      ;;
    *test_user_wiring.py)
      (cd "$MAIN" && THYROX_ROOT="$tree" PYTHONPATH="$tree/src" uv run --no-sync python "$tree/$test" 2>&1 | grep -E "FALLO|ok,"; exit "${PIPESTATUS[0]}") ;;
    *.py) (cd "$tree" && THYROX_ROOT="$tree" PYTHONPATH="$tree/src" python3 "$test" 2>&1; exit "${PIPESTATUS[0]}") ;;
    *.sh) (cd "$tree" && THYROX_ROOT="$tree" bash "$test" 2>&1; exit "${PIPESTATUS[0]}") ;;
  esac
}

{
  echo "# RED: pruebas del cambio sobre la base ($(git -C "$BASE" rev-parse --short HEAD))"
  for f in "${TESTS[@]}" "${SUPPORT[@]}"; do mkdir -p "$BASE/$(dirname "$f")"; cp "$CHANGE/$f" "$BASE/$f"; done
  for t in "${TESTS[@]}"; do out="$(run_test "$BASE" "$t")"; printf '%s\texit=%s\t%s\n' "$t" "$?" "$(tail -1 <<<"$out")"; done
  git -C "$BASE" checkout -q -- . && git -C "$BASE" clean -qfd -- tests
} > "$OUT/e0-red.log" 2>&1

{
  echo "# GREEN: sobre el cambio"
  for t in "${TESTS[@]}"; do out="$(run_test "$CHANGE" "$t")"; printf '%s\texit=%s\t%s\n' "$t" "$?" "$(tail -1 <<<"$out")"; done
} > "$OUT/e0-green.log" 2>&1

annul() { # <nombre> <archivo> <prueba> <OLD> <NEW>
  local name="$1" file="$CHANGE/$2" test="$3" saved; saved="$(mktemp)"; cp "$file" "$saved"
  OLD="$4" NEW="$5" bash "$MAIN/bin/replace_literal" "$file" >/dev/null || { echo "## $name: NO APLICÓ"; return; }
  echo "## $name ($2)"; run_test "$CHANGE" "$test" | grep -E 'FALLA|FALLO|\(fail\)|ok,|pass|aprobada|ok ·'
  cp "$saved" "$file"; rm -f "$saved"
}
{
  annul subagents src/hooks/detect_agent_dispatch.py tests/hooks/test_execution_policy_enforcement.py \
    '    if not subagents_allowed():' '    if False:'
  annul foreground-payload src/hooks/detect_client_background.py tests/hooks/test_execution_policy_enforcement.py \
    '(background or bool(payload_families(command)))' '(background)'
  annul override-opens src/session/execution_policy.py tests/hooks/test_execution_policy_enforcement.py \
    '    return all(value is True for value in values)' '    return values[-1] is True if values else True'
  annul fail-open-missing src/session/execution_policy.py tests/hooks/test_execution_policy_enforcement.py \
    '    if declared:
        layers.append(_read(Path(declared)))' '    if declared and Path(declared).exists():
        layers.append(_read(Path(declared)))'
  annul controller-mutation src/hooks/detect_controller_mutation.py tests/hooks/test_execution_policy_enforcement.py \
    '    if path is None or controller_may_implement():' '    if path is None or True:'
  annul ts-controller src/packages/provider/src/cost/executionPolicy.ts src/packages/provider/__tests__/recommendExecution.test.ts \
    '  return controller === undefined ? parsed : { ...parsed, controller: controllerOf(controller) }' '  return parsed'
  annul recommend-default src/packages/agent/bin/recommend.ts tests/agents/test_recommend_cli.py \
    '  if (explicit !== undefined) return explicit
  const declared' '  return explicit
  const declared'
  annul pool-default src/session/headless-pool.sh tests/session/test-headless-pool-model-policy.sh \
    'if [[ -z "$MODEL_POLICY" ]]; then
    if' 'if false; then
    if'
  echo "## árbol del cambio tras restaurar: $(git -C "$CHANGE" status --short | wc -l) rutas cambiadas"
} > "$OUT/e0-annulments.log" 2>&1
grep -c . "$OUT/e0-red.log" "$OUT/e0-green.log" "$OUT/e0-annulments.log"
