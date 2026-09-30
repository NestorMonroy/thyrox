#!/usr/bin/env bash
# Anulaciones de F7g: se retira cada mecanismo y se mide qué casos caen.
set -u
T=/home/user/thyrox; P=$T/src/packages/mitm; M=$P/src/manager.ts
cd "$P"
export PYTHONDONTWRITEBYTECODE=1
run() { bun test __tests__/manager/upstreamCaWiring.test.ts 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'; }
cp "$M" "$M.orig"
echo "== 1: la ruta guardada antes que la variable"
OLD='return env.THYROX_MITM_UPSTREAM_CA_CERT || readStored() || null' \
NEW='return readStored() || env.THYROX_MITM_UPSTREAM_CA_CERT || null' bash "$T/bin/replace_literal" "$M" >/dev/null
run; cp "$M.orig" "$M"
echo "== 2: sin try/catch alrededor de configureUpstreamCa"
OLD='  try {
    configureUpstreamCa(caPath)
    report(`upstream CA certificate configured: ${caPath}`)
  } catch (err) {
    report(`upstream CA path invalid (continuing without custom CA): ${String(err)}`, '"'"'error'"'"')
  }' NEW='  configureUpstreamCa(caPath)
  report(`upstream CA certificate configured: ${caPath}`)' bash "$T/bin/replace_literal" "$M" >/dev/null
run; mv "$M.orig" "$M"
echo "== restaurado"; git -C "$T" diff --stat -- "$M" | tail -1; run
