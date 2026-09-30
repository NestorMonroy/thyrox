#!/usr/bin/env bash
# Importa la entrada "." de un paquete @thyrox por su nombre, desde la raíz del
# worktree de diagnóstico: con los manifiestos repuntados, la condición default
# resuelve a dist/*.js. Imprime "<paquete>\t<ok|falla>\t<primera línea de error>".
D=/home/user/thyrox/.thyrox/pool-worktrees/diag-build
pkg="$1"; name="$(jq -r .name "$D/src/packages/$pkg/package.json")"
out="$(cd "$D" && timeout 60 bun -e "await import('$name')" </dev/null 2>&1)"; rc=$?
if [[ $rc -eq 0 ]]; then printf '%s\tok\t\n' "$pkg"
else printf '%s\tfalla(%s)\t%s\n' "$pkg" "$rc" "$(printf '%s' "$out" | grep -m1 -E 'Error|error' | cut -c1-160)"; fi
