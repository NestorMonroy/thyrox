#!/usr/bin/env bash
# Importa un modulo con Bun e imprime `<archivo>\tOK` o `<archivo>\tFALLA: <primera linea de error>`.
out="$(timeout 60 bun -e "await import(process.argv[1])" "$PWD/$1" 2>&1)"
if [ $? -eq 0 ]; then printf '%s\tOK\n' "$1"; else printf '%s\tFALLA: %s\n' "$1" "$(printf '%s' "$out" | grep -m1 -iE 'error|cannot' | cut -c1-110)"; fi
