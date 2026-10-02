#!/usr/bin/env bash
# Verificación completa del worktree e0b, sin nada más corriendo: el plazo de
# admittedChat (GREEN, typecheck y sus dos anulaciones) y el conjunto E0 entero
# (detectores, lint, suites del pool, wiring, recomendador). Cada paso deja su
# log y su código real.
# Uso: verify_e0b_full.sh <worktree> <salida-e0> <salida-a6>
set -uo pipefail
W="$1" E="$2" A="$3"
mkdir -p "$E" "$A"
B="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RL=/home/user/thyrox/bin/replace_literal
status=0
step() { local name="$1" log="$2"; shift 2; "$@" > "$log" 2>&1; local rc=$?; (( rc == 0 )) || status=1; printf '%s rc=%s %s\n' "$name" "$rc" "$(tail -1 "$log")"; }

LM="$W/src/packages/local-models"
step chat-green "$A/chat-deadline-green.log" bash -c "cd '$LM' && bun test __tests__/admittedChat.test.ts __tests__/qualifyModel.test.ts __tests__/qualifyCommand.test.ts"
step chat-typecheck "$A/chat-deadline-typecheck.log" bash -c "cd '$LM' && bunx tsc --noEmit -p tsconfig.test.json"

annul_chat() {
    local name="$1" old="$2" new="$3" copy log="$A/chat-annul-$1.log"
    cp "$LM/admittedChat.ts" "$LM/admittedChat.ts.orig"
    OLD="$old" NEW="$new" bash "$RL" "$LM/admittedChat.ts" > /dev/null
    (cd "$LM" && bun test __tests__/admittedChat.test.ts) > "$log" 2>&1
    mv "$LM/admittedChat.ts.orig" "$LM/admittedChat.ts"
    printf 'annul %s: %s\n' "$name" "$(grep -E '^\(fail\)' "$log" | paste -sd ';' -)"
}
annul_chat runtime-deadline '    timeout: false,
' ''
annul_chat declared-deadline '{ signal: AbortSignal.timeout(options.deadlineMs) }' '{}'

bash "$B/verify_e0b.sh" "$W" "$E/verify-r6" green || status=1
bash "$B/pool_suites.sh" "$W" "$E/pool-suites-r6" || status=1
cd "$W" || exit 2
step user_wiring "$E/pool-suites-r6/test_user_wiring.log" python3 tests/session/test_user_wiring.py
step recommend_cli "$E/pool-suites-r6/test_recommend_cli.log" python3 tests/agents/test_recommend_cli.py
step recommendExecution "$E/pool-suites-r6/recommendExecution.log" bash -c "cd src/packages/provider && bun test __tests__/recommendExecution.test.ts"
exit "$status"
