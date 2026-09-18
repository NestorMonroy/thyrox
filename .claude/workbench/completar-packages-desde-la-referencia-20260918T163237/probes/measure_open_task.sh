#!/usr/bin/env bash
# Mide UNA de las TASK abiertas de esta iniciativa. Un subcomando = un trabajo
# independiente, para que el pool acotado pueda despacharlos en paralelo.
# NO escribe en el arbol: emite por stdout. Verificado por conducta con
# `bin/assert_no_writes`.
set -uo pipefail

THYROX=/home/user/thyrox
CCNMT=/home/user/claude-code-nestor-monroy-tools

case "${1:-}" in

cron)
  # TASK-THYROX-0171 — el hermano que loopSentinelCore dejo abierto.
  PORT="$THYROX/src/packages/agent/internal/cronTasksCore.ts"
  SRC="$CCNMT/packages/agent/internal/cronTasksCore.ts"
  for f in "$PORT" "$SRC"; do
    if [ -e "$f" ]; then printf '%7s lineas  %s\n' "$(wc -l < "$f")" "$f"
    else printf 'AUSENTE         %s\n' "$f"; fi
  done
  [ -e "$PORT" ] && [ -e "$SRC" ] || exit 0
  echo "--- exports de la fuente que el puerto NO tiene ---"
  comm -23 \
    <(grep -oE '^export (async )?(function|const|class) [A-Za-z_][A-Za-z0-9_]*' "$SRC" | awk '{print $NF}' | sort -u) \
    <(grep -oE '^export (async )?(function|const|class) [A-Za-z_][A-Za-z0-9_]*' "$PORT" | awk '{print $NF}' | sort -u)
  echo "--- lo que el puerto declara ausente ---"
  grep -nE 'no existe en este .rbol|PORTE PARCIAL|ausente' "$PORT" | head -8
  ;;

collisions)
  # TASK-THYROX-0173 — un .js/.jsx junto a un .ts/.tsx del mismo stem.
  find "$THYROX/src/packages" -type f \( -name '*.js' -o -name '*.jsx' \) \
       -not -path '*/node_modules/*' \
    | while read -r j; do
        base="${j%.*}"
        for ext in ts tsx; do
          [ -e "$base.$ext" ] && printf '%s\n  ensombrece a  %s\n' "$j" "$base.$ext"
        done
      done
  ;;

scope)
  # TASK-THYROX-0170 — lo que queda del alcance viejo, por archivo.
  grep -rn '@claude-code-how-works' "$THYROX/src/packages" 2>/dev/null \
    | awk -F: '{print $1}' | sort | uniq -c | sort -rn
  echo "--- total de ocurrencias ---"
  grep -rn '@claude-code-how-works' "$THYROX/src/packages" 2>/dev/null | wc -l
  ;;

scripts)
  # TASK-THYROX-0174 — lo que queda fuera del alcance packages/.
  for d in scripts bun-demincer; do
    if [ -d "$CCNMT/$d" ]; then
      printf 'ccnmt/%-14s %5s archivos\n' "$d" \
        "$(find "$CCNMT/$d" -type f -not -path '*/node_modules/*' | wc -l)"
      printf 'thyrox/%-13s %s\n' "$d" \
        "$([ -d "$THYROX/$d" ] && echo presente || echo AUSENTE)"
    else
      printf 'ccnmt/%-14s AUSENTE\n' "$d"
    fi
  done
  ;;

ripgrep)
  # TASK-THYROX-0172 — los dos rg.exe que .gitignore veta.
  echo "--- en el puerto ---"
  find "$THYROX/src/packages" -name 'rg.exe' 2>/dev/null \
    | while read -r r; do printf '%10s bytes  %s\n' "$(stat -c%s "$r")" "$r"; done
  echo "--- en la fuente ---"
  find "$CCNMT/packages" -name 'rg.exe' 2>/dev/null \
    | while read -r r; do printf '%10s bytes  %s\n' "$(stat -c%s "$r")" "$r"; done
  ;;

burden)
  # TASK-THYROX-0168 — la carga de traduccion que queda, por paquete.
  for p in "$CCNMT"/packages/*/; do
    name=$(basename "$p")
    [ -d "$THYROX/src/packages/$name" ] || continue
    n=$(grep -rlE '^\s*(//|\*|/\*)' "$THYROX/src/packages/$name" \
          --include='*.ts' --include='*.tsx' 2>/dev/null | wc -l)
    printf '%5s archivos con comentario  %s\n' "$n" "$name"
  done | sort -rn
  ;;

*)
  echo "uso: measure_open_task.sh {cron|collisions|scope|scripts|ripgrep|burden}" >&2
  exit 2
  ;;
esac
