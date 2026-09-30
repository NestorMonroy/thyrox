#!/usr/bin/env bash
# Verde, las tres anulaciones de la calibración y dos de los arreglos
# destapados por el primer intento (directorio del registro, error ≠ vencido).
cd /home/user/thyrox
B=.claude/workbench/vram-calibration-20260926T220529
bash $B/annul.sh
G=src/session/gpu_monitor.py; P=src/session/headless-pool.sh
echo "## anulación: admit no crea el directorio del registro"
OLD='    book.path.parent.mkdir(parents=True, exist_ok=True)
    deadline' NEW='    deadline' bash bin/replace_literal $G >/dev/null
PYTHONPATH=src python3 tests/session/test_gpu_monitor.py 2>&1 | grep -E "FALLA|Error|falla\(s\)" | head -3
bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"
cp $B/gpu_monitor.pre-annulment.py $G
echo "## anulación: todo fallo de admit se lee como vencido"
OLD='        if [[ "$admit_rc" -eq 3 ]]; then' NEW='        if true; then' bash bin/replace_literal $P >/dev/null
bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"
cp $B/headless-pool.pre-annulment.sh $P
cmp $G $B/gpu_monitor.pre-annulment.py && cmp $P $B/headless-pool.pre-annulment.sh && echo restaurados
