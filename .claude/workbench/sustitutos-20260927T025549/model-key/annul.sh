#!/usr/bin/env bash
# Anulación: sin --item-model en el pool tienen que caer exactamente los tres
# casos que dependen de él (fila nombra el modelo; otro modelo: no deriva; lo dice).
set -uo pipefail
cd /home/user/thyrox
B=.claude/workbench/sustitutos-20260927T025549/model-key
sed -i 's/ --item-model "\$MODEL"//; /--item-model "\$MODEL")/{s/.*/             )/}' src/session/headless-pool.sh
grep -c 'item-model' src/session/headless-pool.sh
timeout 600 bash tests/session/test-headless-pool.sh > $B/annul.log 2>&1
cp $B/pool.orig src/session/headless-pool.sh
grep -E 'FALLA|aserciones' $B/annul.log
