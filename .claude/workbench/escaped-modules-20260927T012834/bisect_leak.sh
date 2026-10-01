#!/usr/bin/env bash
# Bisección del archivo de test que contamina a TARGET cuando comparten proceso.
# Uso: bisect_leak.sh <dir-paquete> <archivo-objetivo>. Imprime el culpable.
set -uo pipefail
cd "$1" || exit 2
TARGET="$2"
# Sólo los que bun corre ANTES del objetivo, en su orden: con el objetivo al
# final de la lista entera no se reproducía — un archivo posterior enmascaraba
# la fuga.
mapfile -t ALL < <(find . -path ./node_modules -prune -o \( -name '*.test.ts' -o -name '*.test.tsx' \) -print | sort | sed 's|^\./||' | gawk -v t="$TARGET" '$0 == t {exit} {print}')
fails() { timeout 900 bun test "$@" "$TARGET" 2>&1 | grep -q "^(fail).*${PATTERN}"; }
PATTERN="${3:-}"
set -- "${ALL[@]}"
if ! fails "$@"; then echo "sin contaminación con todos juntos"; exit 1; fi
while [ "$#" -gt 1 ]; do
  half=$(( $# / 2 )); first=("${@:1:half}"); second=("${@:half+1}")
  if fails "${first[@]}"; then set -- "${first[@]}"; else set -- "${second[@]}"; fi
  echo "quedan $#" >&2
done
echo "culpable: $1"
