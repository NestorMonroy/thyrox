#!/usr/bin/env bash
# Verify del ítem canario de TASK-THYROX-0665 (test-pool-calibrate.sh): la
# sintaxis sigue válida, el gate de identificadores pasa contra el baseline
# DEL WORKTREE —el de .env apunta al árbol principal— y la deuda del archivo
# salió del baseline. Corre en la raíz del worktree del ítem.
set -uo pipefail
subject=tests/session/test-pool-calibrate.sh
baseline="$PWD/.claude/baselines/identifier_language_baseline.txt"
bash -n "$subject" || { echo "verify: sintaxis inválida en $subject"; exit 1; }
if grep -q "^$subject::" "$baseline"; then echo "verify: $subject sigue en el baseline"; exit 1; fi
IDENTIFIER_LANGUAGE_BASELINE="$baseline" bash bin/check_identifier_language "$subject" || { echo "verify: el gate rehúsa $subject"; exit 1; }
echo "verify: OK"
