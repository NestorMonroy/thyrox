#!/usr/bin/env bash
# Superficie de un módulo: sus exports, sus pruebas y quién lo consume fuera de pruebas.
# Uso: module_surface.sh <ruta>
set -u
f="$1"; name="$(basename "$f" .ts)"
printf '== %s\n' "$f"
printf -- '-- exports\n'; grep -nE '^export (async )?(function|class|const|type|interface)' "$f" | cut -c1-140
printf -- '-- pruebas que lo nombran\n'; git grep -l "$name" -- 'src/packages/*/__tests__/*' 'src/packages/*/src/**/__tests__/*' | head -5
printf -- '-- consumidores fuera de pruebas y de imports/\n'; git grep -l "$name" -- 'src/**/*.ts' | grep -vE '__tests__|/imports/' | grep -v "^$f$" | head -5
