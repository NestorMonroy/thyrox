#!/usr/bin/env bash
# Mide qué falta para cada TASK abierta de esta iniciativa. NO escribe en el
# árbol: sólo lee y emite por stdout. Verificado por conducta con
# `bin/assert_no_writes`, no por su docstring.
set -uo pipefail

THYROX=/home/user/thyrox
CCNMT=/home/user/claude-code-nestor-monroy-tools

echo "=== TASK-THYROX-0171 — cronTasksCore, el hermano de loopSentinelCore ==="
PORT="$THYROX/src/packages/agent/internal/cronTasksCore.ts"
SRC="$CCNMT/packages/agent/internal/cronTasksCore.ts"
for f in "$PORT" "$SRC"; do
  if [ -e "$f" ]; then printf '  %6s lineas  %s\n' "$(wc -l < "$f")" "$f"
  else printf '  AUSENTE        %s\n' "$f"; fi
done
if [ -e "$PORT" ] && [ -e "$SRC" ]; then
  echo "  --- exports de la fuente que el puerto NO tiene ---"
  comm -23 \
    <(grep -oE '^export (async )?(function|const|class) [A-Za-z_][A-Za-z0-9_]*' "$SRC" | awk '{print $NF}' | sort -u) \
    <(grep -oE '^export (async )?(function|const|class) [A-Za-z_][A-Za-z0-9_]*' "$PORT" | awk '{print $NF}' | sort -u) \
    | sed 's/^/    /'
  echo "  --- lo que el puerto declara ausente ---"
  grep -nE 'no existe en este .rbol|PORTE PARCIAL|ausente en' "$PORT" | head -6 | sed 's/^/    /'
fi

echo
echo "=== TASK-THYROX-0173 — las dos colisiones de stem ==="
# Un .js/.jsx junto a un .ts/.tsx del mismo stem: el resolutor elige el primero.
find "$THYROX/src/packages" -type f \( -name '*.js' -o -name '*.jsx' \) -not -path '*/node_modules/*' \
  | while read -r j; do
      base="${j%.*}"
      for ext in ts tsx; do
        [ -e "$base.$ext" ] && printf '  %s  <-- ensombrece a  %s\n' "$j" "$base.$ext"
      done
    done

echo
echo "=== TASK-THYROX-0170 — los cuatro identificadores de marketplace ==="
grep -rn '@claude-code-how-works' "$THYROX/src/packages" --include='*.ts' --include='*.tsx' \
  --include='*.js' --include='*.json' -l 2>/dev/null | head -20 | sed 's/^/  /'
echo "  --- total de ocurrencias que quedan ---"
grep -rn '@claude-code-how-works' "$THYROX/src/packages" 2>/dev/null | wc -l | sed 's/^/  /'

echo
echo "=== TASK-THYROX-0174 — scripts/ y bun-demincer de ccnmt ==="
for d in scripts bun-demincer; do
  if [ -d "$CCNMT/$d" ]; then
    printf '  ccnmt/%-14s %5s archivos\n' "$d" "$(find "$CCNMT/$d" -type f -not -path '*/node_modules/*' | wc -l)"
    printf '  thyrox/%-13s %s\n' "$d" "$([ -d "$THYROX/$d" ] && echo presente || echo AUSENTE)"
  else
    printf '  ccnmt/%-14s AUSENTE\n' "$d"
  fi
done

echo
echo "=== TASK-THYROX-0172 — los dos rg.exe que .gitignore veta ==="
find "$THYROX/src/packages" -name 'rg.exe' 2>/dev/null | while read -r r; do
  printf '  %10s bytes  %s\n' "$(stat -c%s "$r")" "$r"
done
echo "  --- y en la fuente ---"
find "$CCNMT/packages" -name 'rg.exe' 2>/dev/null | while read -r r; do
  printf '  %10s bytes  %s\n' "$(stat -c%s "$r")" "$r"
done
