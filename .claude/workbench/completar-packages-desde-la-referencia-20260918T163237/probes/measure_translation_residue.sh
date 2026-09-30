#!/usr/bin/env bash
# Mide el residuo de comentario SIN traducir por paquete compartido.
#
# El discriminador es la identidad byte a byte: una linea de comentario que
# aparece igual en la fuente y en el puerto no se tradujo. Una traducida no
# puede coincidir.
#
# NO escribe en el arbol: emite por stdout. Verificado por conducta con
# `bin/assert_no_writes`.
set -uo pipefail

THYROX=/home/user/thyrox
CCNMT=/home/user/claude-code-nestor-monroy-tools

# Se descartan las lineas que son solo delimitador de bloque: coinciden
# siempre y no dicen nada sobre el idioma.
solo_delimitador='^(\*|\*/|/\*\*?|//)$'

for package_dir in "$CCNMT"/packages/*/; do
  name=$(basename "$package_dir")
  port="$THYROX/src/packages/$name"
  [ -d "$port" ] || continue

  untranslated=0
  clean=0
  while read -r rel; do
    [ -f "$package_dir/$rel" ] || continue
    shared=$( comm -12 \
      <(grep -hE '^[[:space:]]*(//|\*|/\*)' "$package_dir/$rel" 2>/dev/null \
          | sed 's/^[ \t]*//' | sort -u) \
      <(grep -hE '^[[:space:]]*(//|\*|/\*)' "$port/$rel" 2>/dev/null \
          | sed 's/^[ \t]*//' | sort -u) \
      | grep -vcE "$solo_delimitador" )
    if [ "${shared:-0}" -gt 0 ]; then
      untranslated=$((untranslated + 1))
    else
      clean=$((clean + 1))
    fi
  done < <(cd "$port" && find . \( -name '*.ts' -o -name '*.tsx' \) \
             | sed 's|^\./||' | sort)

  printf '%5s sin traducir  %5s limpios  %s\n' "$untranslated" "$clean" "$name"
done | sort -rn
