#!/usr/bin/env bash
# EXPERIMENTAL — medición exploratoria escrita antes de cerrar Search Existing:
# no es autoridad, ni producto, ni evidencia de aceptación por sí sola.
# Censo de la identidad «thyrox» en todo lo versionado (git grep sobre el
# índice): por patrón y área, más la lista de nombres distintos de cada forma.
set -u
cd "${1:?raíz}"; OUT="${2:?salida}"
area='{f=$1; n=split(f,p,"/"); k=(p[1]=="src"&&p[2]=="packages")?p[1]"/"p[2]"/"p[3]:(p[1]==".claude"||p[1]=="src"||p[1]=="tests"||p[1]=="_references")?p[1]"/"p[2]:p[1]; c[k]+=$2} END{for(k in c) printf "%d\t%s\n",c[k],k}'
declare -A PAT=(
  [word]='[Tt]hyrox|THYROX'
  [env]='\bTHYROX_[A-Z0-9_]+'
  [pkg]='@thyrox/[a-z0-9-]+'
  [task]='TASK-THYROX-[0-9]+'
  [finding]='H-THYROX-[0-9]+'
  [dotdir]='\.thyrox/'
  [resource]='\bthyrox-[a-z0-9][a-z0-9.-]*'
  [registry]='th3rox/[a-z0-9._-]+'
)
: > "$OUT/census-totals.tsv"
for k in "${!PAT[@]}"; do
  git grep -cEI "${PAT[$k]}" -- . > "$OUT/census-$k-files.txt" || true
  gawk -F: '{s+=$NF; n++} END{printf "%s\t%d archivos\t%d líneas\n", "'"$k"'", n, s}' "$OUT/census-$k-files.txt" >> "$OUT/census-totals.tsv"
  gawk -F: '{l=$NF; sub(/:[0-9]+$/,""); print $0"\t"l}' "$OUT/census-$k-files.txt" | gawk -F'\t' "{print \$1\"\t\"\$2}" | gawk -F'\t' '{split($1,x,"\t"); print}' > /dev/null
  gawk -F: '{l=$NF; f=$0; sub(/:[0-9]+$/,"",f); print f" "l}' "$OUT/census-$k-files.txt" | gawk "$area" | sort -k1nr > "$OUT/census-$k-by-area.tsv"
done
for k in env pkg dotdir resource registry; do
  git grep -ohEI "${PAT[$k]}" -- . ':(exclude).claude/workbench' ':(exclude).claude/jobs' ':(exclude).claude/build-logs' ':(exclude)_references' ':(exclude)_archived' \
    | sort | uniq -c | sort -k1nr > "$OUT/census-$k-names-current.tsv"
done
git ls-files | grep -iE 'thyrox' > "$OUT/census-paths-with-thyrox.txt"
wc -l "$OUT"/census-*names-current.tsv "$OUT/census-paths-with-thyrox.txt"
cat "$OUT/census-totals.tsv"
