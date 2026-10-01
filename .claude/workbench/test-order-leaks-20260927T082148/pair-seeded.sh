#!/usr/bin/env bash
# Una pareja bajo seis semillas: bun ORDENA los archivos que recibe, así que
# sin barajar la víctima corre siempre del mismo lado del compañero.
victim="$1"; other="$2"
[ "$victim" = "$other" ] && exit 0
total=0
for seed in 11 23 37 41 53 67; do
  n=$(bun test "$other" "$victim" --randomize --seed="$seed" 2>&1 | grep -c '^(fail)')
  total=$((total + n))
done
printf '%s\t%s\t%s\n' "$victim" "$other" "$total"
