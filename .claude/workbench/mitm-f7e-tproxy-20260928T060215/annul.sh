#!/usr/bin/env bash
# Anulaciones de tproxy/commands, tproxy/setup y @thyrox/transparent-napi.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
annul() {  # $1 nombre, $2 archivo, $3 dir de pruebas, $4 original, $5 sustituto
  local file="$ROOT/$2"
  cp "$file" "$file.orig"
  OLD="$4" NEW="$5" bash "$ROOT/bin/replace_literal" "$file" >/dev/null || { echo "NO APLICÓ: $1"; mv "$file.orig" "$file"; return; }
  echo "== anulada: $1"
  (cd "$ROOT/$3" && timeout 120 bun test 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$')
  mv "$file.orig" "$file"
}
M=src/packages/mitm/src/tproxy
T=src/packages/transparent-napi
echo "== base mitm/tproxy"; (cd "$ROOT/src/packages/mitm" && timeout 120 bun test __tests__/tproxy 2>&1 | grep -E '^ *[0-9]+ (pass|fail)$')
echo "== base transparent-napi"; (cd "$ROOT/$T" && timeout 120 bun test 2>&1 | grep -E '^ *[0-9]+ (pass|fail)$')
annul "revert en el mismo orden que el apply" $M/commands.ts src/packages/mitm/__tests__/tproxy "  return [
    iptables('-D', preroutingRuleSpec(cfg)),
    iptables('-D', outputRuleSpec(cfg))," "  return [
    iptables('-D', outputRuleSpec(cfg)),
    iptables('-D', preroutingRuleSpec(cfg)),"
annul "sin revert tras un apply fallido" $M/setup.ts src/packages/mitm/__tests__/tproxy "    await revertTproxy(cfg, run)
    throw err" "    throw err"
annul "sin exclusión de bypassMark" $M/commands.ts src/packages/mitm/__tests__/tproxy "  if (cfg.bypassMark !== undefined) spec.push('-m', 'mark', '!', '--mark', String(cfg.bypassMark))
" ""
annul "sin comprobar la forma del addon" $T/src/index.ts $T "  return (
    !!candidate &&
    typeof candidate.createTransparentListener === 'function' &&
    typeof candidate.setSocketMark === 'function' &&
    typeof candidate.connectMarked === 'function'
  )" "  return !!candidate"
annul "sin exigir encabezados de N-API" $T/src/build.ts $T "  if (!headersDir) return { built: false, reason: 'N-API headers not found (node_api.h); set THYROX_NODE_API_HEADERS' }
" ""
echo "== restaurado"; (cd "$ROOT/src/packages/mitm" && timeout 120 bun test __tests__/tproxy 2>&1 | grep -E '^ *[0-9]+ (pass|fail)$'); (cd "$ROOT/$T" && timeout 120 bun test 2>&1 | grep -E '^ *[0-9]+ (pass|fail)$')
git -C "$ROOT" diff --stat -- $M $T/src | tail -1
