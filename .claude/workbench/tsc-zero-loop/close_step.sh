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
# Gate 3b (plan v2.2.0): un paso que avanzó no se commitea sin una entrada de
# memoria cuya señal case sus objetivos y cuyo `applied` nombre sus archivos.
if [ "$STATUS" = progress ]; then
  bash bin/tsc_reflect gate-memory --run "$R" --step "$R/$S" || exit 4
  # Gate 4 (plan v2.2.0): con patrones abiertos, el paso revisó patrones
  # (gate4.json) y su log final no deja instancias vivas sin salida.
  bash bin/tsc_reflect gate-sweep --run "$R" --step "$R/$S" ${SWEEP_LOG:+--log "$SWEEP_LOG"} || exit 5
fi
test -e "$R/patterns.jsonl" && EXTRA="${EXTRA:-} $R/patterns.jsonl"
# Reflexion: un paso que no avanzó no se cierra sin su lección escrita.
if [ "$STATUS" != progress ]; then
  for P in $(python3 -c "import json,sys;print(' '.join(json.load(open(sys.argv[1]))['outcomes']))" "$REPORT"); do
    python3 -c "import json,sys;sys.exit(0 if any(json.loads(l)['proposal_id']==sys.argv[2] for l in open(sys.argv[1])) else 1)" "$R/reflections.jsonl" "$P" 2>/dev/null \
      || { echo "falta la reflexión de $P: bin/tsc_reflect add --run $R --id $P --step $R/$S ..." >&2; exit 3; }
  done
  EXTRA="${EXTRA:-} $R/reflections.jsonl"
  test -e "$R/residual.jsonl" && EXTRA="$EXTRA $R/residual.jsonl"
fi
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
