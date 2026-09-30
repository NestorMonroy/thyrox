#!/usr/bin/env bash
# Cierra un lote de copias: commitea por pathspec las copias que quedaron
# (<banco>/copiados.txt), el banco entero, los trabajos y los logs de pool que
# el lote dejó sin seguir; baja el trinquete del cli si el gate lo pide, y
# publica. Mismo contrato que `tsc-zero-loop/close_step.sh`.
# Uso: cerrar_lote.sh <banco-del-lote> <archivo-de-mensaje>
set -euo pipefail
B=$1; MSG=$2
A=(env GIT_AUTHOR_NAME='Nestor Monroy' GIT_AUTHOR_EMAIL='46802445+NestorMonroy@users.noreply.github.com'
   git -c user.name=jcg-admin -c user.email=169318663+jcg-admin@users.noreply.github.com)
sed 's|^|src/packages/|' "$B/copiados.txt" > "$B/copiados.paths"
# GATE del paso 3b (plan v2.2.0): un lote no se cierra sin la entrada de
# memoria que cubra cada archivo copiado. Sin esto los lotes 01 a 05 aplicaron
# el arreglo a 300 archivos sin dejar memoria que el lazo lea.
RUN=${RUN:-.claude/workbench/tsc-zero-loop/run-20260924T175031}
python3 - "$RUN/patterns.jsonl" "$B/copiados.paths" <<'PYGATE' || exit 4
import json, sys
rows = {json.loads(l)["name"]: json.loads(l) for l in open(sys.argv[1]) if l.strip()}
applied = set(rows.get("file-diverged-from-source", {}).get("applied", []))
missing = [p for p in open(sys.argv[2]).read().split() if p not in applied]
if missing:
    print(f"GATE 3b BLOQUEADO — {len(missing)} copia(s) sin memoria: corre "
          "registrar_memoria_lote.py antes de cerrar. Primera: " + missing[0], file=sys.stderr)
    sys.exit(4)
PYGATE
# Nada fuera de las copias puede quedar modificado en src: sería trabajo ajeno.
extra_src=$(git status --short src | gawk '{print $2}' | grep -vxF -f "$B/copiados.paths" || true)
[ -z "$extra_src" ] || { echo "cerrar_lote: cambios en src fuera del lote: $extra_src" >&2; exit 2; }
mapfile -t EXTRA < <(git status --short --untracked-files=normal .claude/jobs .claude/build-logs \
  | gawk '{print $2}' | sed 's|/$||' | gawk -F/ '{print $1"/"$2"/"$3}' | sort -u)
BENCH_ROOT=$(dirname "$B")
git add -N "$BENCH_ROOT" "${EXTRA[@]}"
PATHSPEC=$(mktemp -p .claude/cache pathspec.XXXXXX)
{ cat "$B/copiados.paths"; echo "$BENCH_ROOT"; echo "$RUN/patterns.jsonl"; printf '%s\n' "${EXTRA[@]}"; } > "$PATHSPEC"
OUT=$("${A[@]}" commit -q --pathspec-from-file="$PATHSPEC" -F "$MSG" 2>&1) || { rm -f "$PATHSPEC"; echo "$OUT" | tail -20; exit 1; }
rm -f "$PATHSPEC" "$MSG"
LOW=$(echo "$OUT" | grep -oE "tsconfig.json baja: [0-9]+" | grep -oE "[0-9]+$" | head -1 || true)
if [ -n "$LOW" ]; then
  R=.claude/baselines/cli_typecheck_baseline.txt
  sed -i -E "s/ [0-9]+\$/ $LOW/" "$R"
  "${A[@]}" commit -q -m "Lower the cli typecheck ratchet to $LOW" \
    -m "Copy batch $(basename "$B") dropped both measured cli projects; the ratchet
follows so the count cannot climb back." -- "$R" > /dev/null 2>&1
fi
git push -q origin "$(git branch --show-current)"
echo "$(basename "$B") $(git log --oneline -1) trinquete=${LOW:-igual}"
