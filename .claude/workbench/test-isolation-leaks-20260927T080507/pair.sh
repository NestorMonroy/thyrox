#!/usr/bin/env bash
# Una pareja: la prueba víctima con UN compañero, desde la raíz de thyrox.
# Escribe «víctima<TAB>compañero<TAB>fallos».
victim="$1"; other="$2"
[ "$victim" = "$other" ] && exit 0
fails=$(bun test "$other" "$victim" 2>&1 | grep -cE '^\(fail\).*(buildRequestTools|withRetry ante un rechazo de capacidad de Foundry)')
printf '%s\t%s\t%s\n' "$(basename "$victim")" "$other" "$fails"
