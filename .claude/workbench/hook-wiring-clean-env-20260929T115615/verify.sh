#!/usr/bin/env bash
# Verify del ítem, con cwd en el worktree; se invoca por ruta del árbol principal.
set -uo pipefail
git diff --quiet HEAD -- .claude || { echo "verify: el ítem tocó .claude"; exit 1; }
out="$(PYTHONPATH="$PWD/src" uv run --python 3.12 python tests/session/test_user_wiring.py 2>&1)"; rc=$?
echo "$out" | tail -15
[[ $rc -eq 0 ]] || { echo "verify: test_user_wiring.py sale $rc"; exit 1; }
grep -qE "python3 \{?[a-z]*\}?/src/(hooks|agents)/[a-z_]+\.py" src/session/user_wiring.py \
  && grep -nE "cmd\(f?\"python3 " src/session/user_wiring.py && { echo "verify: quedan comandos python3 <ruta>.py"; exit 1; }
exit 0
