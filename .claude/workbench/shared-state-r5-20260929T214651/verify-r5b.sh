#!/usr/bin/env bash
# Verificación en el árbol de R5b: subconjunto derivado (r5b-derived-tests.txt) y typecheck de los paquetes tocados.
set -u -o pipefail
cd /home/user/thyrox
rc=0
for f in $(cat .claude/workbench/shared-state-r5-20260929T214651/r5b-derived-tests.txt); do
  pkg=$(echo "$f" | sed -E 's#^(src/packages/[^/]+)/.*#\1#')
  (cd "$pkg" && bun test "${f#$pkg/}" 2>&1 | tail -3 | sed "s#^#[$f] #") || rc=1
done
for p in provider shared-state mitm; do
  bash bin/check_package_typecheck "$p" 2>&1 | tail -3 | sed "s#^#[tsc $p] #" || rc=1
done
echo "VERIFY_RC=$rc"
exit $rc
