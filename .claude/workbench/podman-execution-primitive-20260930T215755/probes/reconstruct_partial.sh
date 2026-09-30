#!/usr/bin/env bash
# Demuestra que la evidencia preservada basta: item_base + patch reconstruye el
# árbol parcial del worktree muerto. Aplica el patch sobre un índice temporal
# del commit base (sin checkout) y compara, por cada ruta tocada, el blob y el
# modo reconstruidos contra los del worktree preservado.
# Uso: reconstruct_partial.sh <manifest>
# Métrica: rutas cuyo blob o modo difieren. Ciega a: rutas fuera de las
# cuatro vistas del manifest.
set -uo pipefail
manifest="$1"
field() { grep "^$1: " "$manifest" | cut -d' ' -f2-; }
wt=$(field worktree); base=$(field base_commit); patch=$(field patch)
index=$(mktemp); trap 'rm -f "${index:?}"' EXIT
GIT_INDEX_FILE="$index" git read-tree "$base" || { echo "no-medido: read-tree"; exit 2; }
if ! GIT_INDEX_FILE="$index" git apply --cached --binary "$patch" 2> "$index.err"; then
  echo "NO-APLICA: $(head -2 "$index.err" | tr '\n' ' ')"; rm -f "$index.err"; exit 1
fi
rm -f "$index.err"
paths=$(gawk '/^## /{s=1;next} s' "$manifest" | sed -E 's/^.. //' | sort -u)
diffs=0; checked=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  [ -d "$wt/$p" ] && continue
  checked=$((checked+1))
  rebuilt=$(GIT_INDEX_FILE="$index" git ls-files -s -- "$p" | gawk '{print $1" "$2}')
  if [ -e "$wt/$p" ] || [ -L "$wt/$p" ]; then
    mode=100644; [ -x "$wt/$p" ] && mode=100755; [ -L "$wt/$p" ] && mode=120000
    actual="$mode $(git hash-object --no-filters "$wt/$p")"
  else actual=""; fi
  [ "$rebuilt" = "$actual" ] || { diffs=$((diffs+1)); echo "DIFIERE $p | reconstruido=[$rebuilt] preservado=[$actual]"; }
done <<< "$paths"
echo "resultado: $diffs ruta(s) difieren de $checked comprobadas"
[ "$diffs" -eq 0 ]
