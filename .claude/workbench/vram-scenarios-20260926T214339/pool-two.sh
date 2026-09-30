#!/usr/bin/env bash
# Suite del pool en verde, y después con cada pool en su propio registro.
cd /home/user/thyrox
B=.claude/workbench/vram-scenarios-20260926T214339; P=src/session/headless-pool.sh
echo "## verde"; bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|dos pools|aserciones"
bash bin/replace_literal --old-file $B/pool-own-ledger-old.txt --new-file $B/pool-own-ledger-new.txt $P >/dev/null || echo "NO APLICÓ"
echo "## anulación: un registro por pool"; bash tests/session/test-headless-pool.sh 2>&1 | grep -E "FALLA|aserciones"
cp $B/headless-pool.pre-annulment.sh $P && cmp $P $B/headless-pool.pre-annulment.sh && echo restaurado
