#!/usr/bin/env bash
# Imprime el contexto (N antes, M después) de cada archivo:línea leído de stdin.
# Uso: printf 'ruta:linea\n' … | bash ctx.sh [antes] [despues]
before="${1:-2}"; after="${2:-5}"
while IFS=: read -r file line _; do
  [[ -f "$file" ]] || continue
  echo "=== $file:$line"
  start=$(( line > before ? line - before : 1 ))
  sed -n "${start},$(( line + after ))p" "$file"
done
