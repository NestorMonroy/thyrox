#!/usr/bin/env bash
# Regenera el avance del porte de permission DERIVÁNDOLO del árbol.
# Ninguna cifra de este archivo se escribe a mano.
set -euo pipefail
BANCO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REF="${PERMISSION_REF:-/home/user/claude-code-nestor-monroy-tools/packages/permission}"
THY="${PERMISSION_PORT:-/home/user/thyrox/src/packages/permission}"
CACHE="${THYROX_CACHE_DIR:-/home/user/thyrox/.claude/cache}"

(cd "$REF" && find . -type f -not -path './node_modules/*' -not -path './.git/*' | sed 's|^\./||' | sort) > "$CACHE/perm_ref2.txt"
(cd "$THY" && find . -type f -not -path './node_modules/*' -not -path './.git/*' | sed 's|^\./||' | sort) > "$CACHE/perm_thy2.txt"
faltan=$(comm -23 "$CACHE/perm_ref2.txt" "$CACHE/perm_thy2.txt" | wc -l)
sobran=$(comm -13 "$CACHE/perm_ref2.txt" "$CACHE/perm_thy2.txt" | wc -l)
ref=$(wc -l < "$CACHE/perm_ref2.txt"); thy=$(wc -l < "$CACHE/perm_thy2.txt")

cd "$THY"
resumen=$(node "$BANCO/probes/translation_progress.mjs" $(cat "$CACHE/perm_ts_copiados.txt") \
  > "$CACHE/perm_pendientes.tsv" 2>&1; tail -1 "$CACHE/perm_pendientes.tsv")
sed -i '$d' "$CACHE/perm_pendientes.tsv"

{
  printf '# Avance del porte de permission — %s\n' "$(date -u +%Y-%m-%dT%H:%M:%S)"
  printf '# Regenerado por avance.sh. Ninguna cifra se escribe a mano.\n\n'
  printf 'FASE 1 — COPIA\n'
  printf '  referencia            %s archivos\n' "$ref"
  printf '  puerto                %s archivos\n' "$thy"
  printf '  faltan                %s\n' "$faltan"
  printf '  sobran                %s (propios del puerto, no de la referencia)\n\n' "$sobran"
  printf 'FASE 2 — TRADUCCION DE COMENTARIOS (universo: los 97 .ts/.tsx copiados)\n'
  printf '  %s\n\n' "$resumen"
  printf '  Pendientes por densidad (lineas de comentario, medidas por AST):\n'
  head -12 "$CACHE/perm_pendientes.tsv" | sed 's/^/    /'
  printf '\nFASE 3 — TESTS   bloqueada hasta que FASE 2 cierre (directiva del ejecutor)\n'
} > "$BANCO/avance.txt"
cat "$BANCO/avance.txt"
