#!/usr/bin/env bash
# Copia UN archivo de la referencia al puerto, creando su directorio.
#
# La referencia es de SOLO LECTURA (`referencia-odoo-gobierna-las-decisiones.md`
# aplica igual a ccnmt: un `checkout` ya es un cambio). Este guion escribe
# EXCLUSIVAMENTE bajo $DESTINO y nunca bajo $ORIGEN — la direccion se verifica
# por conducta con `bin/assert_no_writes`, no por este comentario.
#
# Uso: copy_missing_file.sh <ruta-relativa>
set -euo pipefail

ORIGEN="${PERMISSION_REF:-/home/user/claude-code-nestor-monroy-tools/packages/permission}"
DESTINO="${PERMISSION_PORT:-/home/user/thyrox/src/packages/permission}"

rel="${1:?falta la ruta relativa}"
src="$ORIGEN/$rel"
dst="$DESTINO/$rel"

[ -f "$src" ] || { echo "ORIGEN AUSENTE: $src" >&2; exit 2; }
if [ -e "$dst" ]; then
  echo "YA EXISTE, no se pisa: $rel" >&2
  exit 3
fi

mkdir -p "$(dirname "$dst")"
cat "$src" > "$dst"

# Verificacion de aterrizaje: el tamano tiene que coincidir byte a byte.
a=$(wc -c < "$src"); b=$(wc -c < "$dst")
[ "$a" = "$b" ] || { echo "TAMANO DISTINTO $rel: $a != $b" >&2; exit 4; }
echo "copiado $rel ($b B)"
