#!/usr/bin/env bash
# Anulaciones del cableado de headless-pool: cada una retira una pieza y
# corre la suite; se restaura siempre.
set -uo pipefail
cd /home/user/thyrox
P=src/session/headless-pool.sh; G=.claude/workbench/sustitutos-20260927T025549/pool.good
cp "$P" "$G"
annul() { echo "--- $1"; sed -i "$2" "$P"; bash tests/session/test-headless-pool.sh 2>&1 | grep -E "^FALLA|^aserciones"; cp "$G" "$P"; }
annul "A: ejecutor por defecto claude" 's|^CLAUDE_BIN="${HEADLESS_POOL_CLAUDE:-.*|CLAUDE_BIN="${HEADLESS_POOL_CLAUDE:-claude}"|'
annul "B: sin --template en record" 's| --template "$PROMPT" >/dev/null| >/dev/null|'
annul "C: sin --min-items" 's|--template "$PROMPT" --min-items "$MIN_ITEMS"|--template "$PROMPT"|'
cmp "$P" "$G" && echo restaurado
