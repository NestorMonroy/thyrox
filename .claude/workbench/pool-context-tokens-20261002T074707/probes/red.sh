#!/usr/bin/env bash
# Rojo de TASK-THYROX-0781: inserta los casos antes del resumen final de la suite y la corre.
set -u
B=/home/user/thyrox/.claude/workbench/pool-context-tokens-20261002T074707
T=/home/user/thyrox/tests/session/test-headless-pool-model-policy.sh
python3 - "$T" "$B/probes/cases.sh" <<'PY'
import sys
from pathlib import Path
test, cases = Path(sys.argv[1]), Path(sys.argv[2]).read_text()
text = test.read_text()
anchor = '\necho; echo "$PASS ok'
assert text.count(anchor) == 1
test.write_text(text.replace(anchor, cases + anchor))
PY
bash "$T" > "$B/outputs/red.txt" 2>&1; echo "exit=$?"; grep -E "FALLA|ok ·" "$B/outputs/red.txt"
