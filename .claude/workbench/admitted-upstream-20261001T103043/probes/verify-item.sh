#!/usr/bin/env bash
# Verify del relé admitido: las pruebas y los paquetes del contrato no se tocan.
set -uo pipefail
mapfile -t changed < <(git status --porcelain -uall | gawk '{print $2}')
touched=0
for path in "${changed[@]}"; do
  case "$path" in
    */__tests__/*|*/testing/*|src/packages/model-scheduling/*|src/packages/model-artifacts/*)
      echo "verify: el ítem tocó el contrato o sus pruebas: $path" >&2; exit 1 ;;
    src/packages/provider/src/proxy/openaiCompat/admittedUpstream.ts) touched=1 ;;
  esac
done
test "$touched" -eq 1 || { echo "verify: el ítem no tocó el relé" >&2; exit 1; }
rc=0
(cd src/packages/provider && bun test src/proxy/__tests__/admittedUpstream.test.ts) || rc=1
bash bin/check_package_typecheck --strict provider || rc=1
exit "$rc"
