#!/usr/bin/env bash
# Copia los archivos que la medicion por .ts/.tsx dejo fuera del universo.
# La referencia es SOLO LECTURA: se lee con cp, nunca se escribe en ella.
set -euo pipefail
REF=/home/user/claude-code-nestor-monroy-tools/packages
DST=/home/user/thyrox/src/packages
LISTA="$1"
copiados=0
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  src="$REF/$rel"; dst="$DST/$rel"
  [ -f "$src" ] || { echo "AUSENTE EN LA FUENTE: $rel" >&2; exit 1; }
  [ -e "$dst" ] && { echo "YA EXISTE, no se pisa: $rel" >&2; continue; }
  mkdir -p "$(dirname "$dst")"
  cp -p "$src" "$dst"
  copiados=$((copiados + 1))
done < "$LISTA"
echo "copiados=$copiados"
