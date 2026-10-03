#!/usr/bin/env bash
# Anulaciones de la ronda e0b: cada mitad de juicio se retira en una copia del
# worktree y se corre la suite de la política. Tienen que caer EXACTAMENTE los
# casos que dependen de ella; la línea de cada anulación lista los que cayeron.
# Uso: annul_e0b.sh <worktree> <salida>
set -uo pipefail
W="$1" O="$2"
mkdir -p "$O"
RL=/home/user/thyrox/bin/replace_literal
SUITE=tests/hooks/test_execution_policy_enforcement.py

annul() {
    local name="$1" file="$2" old="$3" new="$4" copy
    copy="$(mktemp -d)"
    mkdir -p "$copy/src" "$copy/tests"
    cp -r "$W/src/hooks" "$W/src/session" "$copy/src/"
    cp -r "$W/tests/hooks" "$W/tests/fixtures" "$copy/tests/"
    if ! OLD="$old" NEW="$new" bash "$RL" "$copy/$file" > /dev/null; then
        echo "$name: la anulación no aplicó"
        rm -rf "${copy:?}"
        return
    fi
    (cd "$copy" && PYTHONDONTWRITEBYTECODE=1 python3 "$SUITE") > "$O/annul-$name.log" 2>&1
    printf '%s: %s | cayeron: %s\n' "$name" "$(tail -1 "$O/annul-$name.log")" \
        "$(grep -o 'FALLA [0-9]* [^—]*' "$O/annul-$name.log" | sed 's/ *$//' | paste -sd ';' -)"
    rm -rf "${copy:?}"
}

annul data-heredoc src/hooks/shell_text.py \
    '    return strip_heredoc_bodies(command)

' '    return command

'
annul shell-fed-heredoc src/hooks/shell_text.py \
    'if any(_SHELL_FED_HEREDOC.search(line) for line in command.split("\n")):' 'if False:'
annul data-quotes src/hooks/detect_client_background.py \
    'executed = mask_data_quotes(strip_data_heredoc_bodies(command))' 'executed = strip_data_heredoc_bodies(command)'
annul shell-code src/hooks/detect_client_background.py \
    'inner = [m.group(2) for m in _SHELL_CODE.finditer(executed)]' 'inner: list[str] = []'
annul worker-identity src/hooks/detect_controller_mutation.py \
    'return all(env.get(name) for name in WORKER_IDENTITY)' 'return False'
annul worker-scope src/hooks/detect_controller_mutation.py \
    'return path == Path(cwd) or Path(cwd) in path.parents' 'return True'
annul state-tops src/hooks/detect_controller_mutation.py \
    'STATE_TOPS = frozenset({".claude", ".thyrox", "agent-results"})' 'STATE_TOPS: frozenset[str] = frozenset()'
annul tree-containers src/hooks/detect_controller_mutation.py \
    'return [*_TREE_CONTAINERS, ' 'return ['
annul cp-last-operand src/hooks/detect_controller_mutation.py \
    '        targets += operands[-1:]' '        targets += operands'
