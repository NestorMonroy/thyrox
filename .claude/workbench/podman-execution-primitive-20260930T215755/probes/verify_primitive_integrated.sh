#!/usr/bin/env bash
# Segunda etapa del item primitive: enlaza el workspace, corre las suites de
# los dos paquetes tocados y su typecheck estricto en el arbol principal.
set -u
cd "$(git rev-parse --show-toplevel)"
rc=0
bun install --frozen-lockfile >/dev/null 2>&1 || { echo "bun install --frozen-lockfile fallo"; rc=1; }
for pkg in podman-execution daemon; do
  out=$(cd "src/packages/$pkg" && bun test 2>&1); r=$?
  echo "== $pkg bun test exit=$r | $(printf '%s\n' "$out" | grep -E '^ *[0-9]+ (pass|fail)' | tr '\n' ' ')"
  [ "$r" -eq 0 ] || { rc=1; printf '%s\n' "$out" | grep -E "\(fail\)|error:" | head -20; }
done
bash bin/check_package_typecheck --strict podman-execution daemon 2>&1 | tail -6 || rc=1
bash bin/check_lint_zero $(git status --porcelain -uall src/packages/daemon src/packages/podman-execution | gawk '{print $2}' | grep -E '\.(py|sh)$') 2>/dev/null | tail -1
exit "$rc"
