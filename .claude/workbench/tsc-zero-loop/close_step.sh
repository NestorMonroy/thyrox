#!/usr/bin/env bash
# Cierra un paso del lazo tsc cero: commitea por pathspec lo que el paso
# conservó (o sólo su banco si se revirtió), baja el trinquete del cli si el
# gate lo pide, y publica.
# Uso: close_step.sh <run-dir> <step-NNN> <job-dir>
set -euo pipefail
R=$1; S=$2; J=$3
A=(env GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL='46802445+NestorMonroy@users.noreply.github.com'
   git -c user.name=jcg-admin -c user.email=169318663+jcg-admin@users.noreply.github.com)
REPORT="$R/$S/report.json"
STATUS=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['status'])" "$REPORT")
FILES=$(python3 -c "import json,sys;print(' '.join(json.load(open(sys.argv[1]))['files_kept']))" "$REPORT")
test -s "$R/$S/commit.txt" || { echo "falta $R/$S/commit.txt" >&2; exit 2; }
git add -N "$R/$S" "$J"
OUT=$("${A[@]}" commit -q -F "$R/$S/commit.txt" -- $FILES ${EXTRA:-} "$R/$S" "$R/ledger.jsonl" "$J" 2>&1) || { echo "$OUT" | tail -20; exit 1; }
LOW=$(echo "$OUT" | grep -oE "tsconfig.json baja: [0-9]+" | grep -oE "[0-9]+$" | head -1 || true)
if [ -n "$LOW" ]; then
  B=.claude/baselines/cli_typecheck_baseline.txt
  sed -i -E "s/ [0-9]+\$/ $LOW/" "$B"
  "${A[@]}" commit -q -m "Lower the cli typecheck ratchet to $LOW

Loop $S dropped both measured cli projects; the ratchet follows so
the count cannot climb back." -- "$B" >/dev/null 2>&1
fi
git push -q origin "$(git branch --show-current)"
echo "$S $STATUS $(git log --oneline -1) trinquete=${LOW:-igual}"
