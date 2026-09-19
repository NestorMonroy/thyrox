#!/usr/bin/env bash
# Censa los .tsx de un paquete que consumidores EXTERNOS importan y cuyo
# wildcard de `exports` no alcanza, porque mapea a `*.ts`.
#
# Metrica: por cada `.tsx` del paquete, cuantos archivos FUERA del paquete
# citan un specifier `@thyrox/<paquete>/...<stem>`.
# Ciega a: un `.tsx` alcanzado por una clave explicita (no wildcard) — este
# censo no consulta el mapa, solo cuenta importadores; y a un importador que
# arme el specifier por concatenacion en vez de literal.
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}"
for p in "$@"; do
  find "src/packages/$p" -name '*.tsx' -not -path '*/node_modules/*' 2>/dev/null | while read -r f; do
    stem=$(basename "$f" .tsx)
    n=$(grep -rl "@thyrox/$p/[^'\"]*$stem" src/ --include=*.ts --include=*.tsx 2>/dev/null \
        | grep -v node_modules | grep -v "^src/packages/$p/" | wc -l)
    [ "$n" -gt 0 ] && printf '%s\t%s\t%s\n' "$p" "$stem" "$n"
  done
done
