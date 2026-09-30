#!/usr/bin/env bash
# Verifica POR CONDUCTA si cada specifier resuelve, desde un paquete que
# declara la dependencia (no desde la raiz, que no declara ningun hermano).
#
# Metrica: exit de un import() dinamico de bun por specifier, con cwd en el
# consumidor.
# Ciega a: un modulo que resuelva y reviente al evaluarse por otra causa —
# eso sale como FALLA con un mensaje distinto de «Cannot find module».
set -uo pipefail
cd "${THYROX_ROOT:-/home/user/thyrox}/src/packages/${PROBE_FROM:-repl}"
while read -r spec; do
  [ -z "$spec" ] && continue
  out=$(bun -e "import('$spec').then(m=>console.log('OK',Object.keys(m).length)).catch(e=>console.log('FALLA',e.message.slice(0,60)))" 2>&1 | tail -1)
  printf '%s\t%s\n' "$spec" "$out"
done
