#!/usr/bin/env bash
# Copia UN archivo ausente de la referencia al puerto, con su cabecera de
# procedencia. La referencia es de SOLO LECTURA: este guion lee de ella y
# escribe unicamente bajo el puerto. Se verifica por conducta con
# ``assert_no_writes --allow <puerto>``, no por este comentario.
#
#   uso: copy_missing.sh <paquete>/<ruta-relativa>
set -euo pipefail
REF="${CCNMT_PACKAGES:?falta CCNMT_PACKAGES}"
PORT="${THYROX_PACKAGES:?falta THYROX_PACKAGES}"
rel="$1"
pkg="${rel%%/*}"
inner="${rel#*/}"
src="$REF/$pkg/$inner"
dst="$PORT/$pkg/$inner"
[ -f "$src" ] || { echo "FALTA EN LA REFERENCIA: $src" >&2; exit 2; }
[ -e "$dst" ] && { echo "YA EXISTE, no se pisa: $dst" >&2; exit 3; }
mkdir -p "$(dirname "$dst")"
cp "$src" "$dst"
echo "OK $rel"
