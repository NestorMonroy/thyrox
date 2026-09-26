#!/usr/bin/env bash
# Imprime `<especificador>\t<archivo>` con el resolvedor de Bun, relativo a la raiz.
path="$(bun -e "console.log(require.resolve(process.argv[1]))" "$1" 2>/dev/null | tail -1)"
printf '%s\t%s\n' "$1" "${path#"$PWD/"}"
