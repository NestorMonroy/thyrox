#!/usr/bin/env bash
# Verificación en el árbol principal de lo integrado del pool P1 + P6: cada
# suite con su propio código de salida, más una anulación hecha aquí, fuera del
# ítem: una conexión ansiosa a Redis insertada en main() de cli.tsx tiene que
# tumbar el contrato de activación.
set -uo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
rc=0
step() { local name=$1; shift; "$@" > "$OUT/$name.log" 2>&1; local s=$?; printf '%s\texit=%s\n' "$name" "$s"; test "$s" = 0 || rc=1; }
OUT=$(dirname "$0")/../outputs/verify-integrated; mkdir -p "$OUT"
step p1-contract bash -c 'cd src/packages/cli && bun test __tests__/startupActivation.test.ts'
step p6-reachability bun test src/packaging/__tests__/reachability.test.ts
step p6-generate-bin python3 tests/session/test_generate_bin.py
step p6-matrix-check bash bin/packaging-reachability --check
step generate-bin-check python3 src/session/generate_bin.py --check
step cli-typecheck bash bin/check_package_typecheck --strict cli
# Anulación: el contrato de activación tiene que caer con una apertura ansiosa en main().
F=src/packages/cli/src/entry/cli.tsx; copy=$(mktemp)
cp "$F" "$copy"
python3 - "$F" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text()
anchor = "  const { profileCheckpoint } = await import('@thyrox/app-host/startup/startupProfiler.js')\n"
assert t.count(anchor) == 1
p.write_text(t.replace(anchor, anchor + "  await import('../../__tests__/fixtures/startupActivation/eagerRedisConnection.ts')\n"))
PY
(cd src/packages/cli && bun test __tests__/startupActivation.test.ts) > "$OUT/nullified.log" 2>&1
printf 'nullified-contract\texit=%s\t%s\n' "$?" "$(grep -E '^ *[0-9]+ (pass|fail)' "$OUT/nullified.log" | tr '\n' ' ')"
cp "$copy" "$F"; rm -f "$copy"
cmp -s <(git show HEAD:"$F") "$F" && echo "restored	cli.tsx identical to HEAD" || { echo "restored	DIFFERS"; rc=1; }
exit "$rc"
