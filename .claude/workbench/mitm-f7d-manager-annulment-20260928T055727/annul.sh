#!/usr/bin/env bash
# Anulaciones del gestor MITM: retirada cada mitad, caen exactamente sus pruebas.
set -u
cd "$(dirname "$0")/../../../src/packages/mitm" || exit 2
M=src/manager.ts
run() { timeout 120 bun test __tests__/manager 2>&1 | grep -E '^\(fail\)|^ *[0-9]+ (pass|fail)$'; }
annul() {  # $1 nombre, $2 texto original, $3 sustituto
  cp "$M" "$M.orig"
  OLD="$2" NEW="$3" bash ../../../bin/replace_literal "$M" >/dev/null || { echo "NO APLICÓ: $1"; mv "$M.orig" "$M"; return; }
  echo "== anulada: $1"; run
  mv "$M.orig" "$M"
}
echo "== base"; run
annul "DNS antes de matar" "  await killServerProcessOnStop(deps.stopGraceMs ?? DEFAULT_STOP_GRACE_MS)
  clearCachedPassword()" "  clearCachedPassword()"
annul "candado de arranque" "  if (!tryAcquireMitmStartLock()) throw new Error('MITM server is already starting')
" ""
annul "fallo dentro del plazo de gracia" "  if (!started) throw new Error(interpretMitmStartupError(stderrTail, port))" "  void started"
annul "THYROX_MITM_ROOT_CA_ENABLED" "  return process.env.THYROX_MITM_ROOT_CA_ENABLED === 'true'" "  return false"
annul "PID muerto marca huérfano" "      removePidFile()
      orphanedStateDetected = true
      log('stale" "      removePidFile()
      log('stale"
echo "== restaurado"; run
git diff --stat -- "$M" | tail -1

# Reordenada (no retirada): matar antes de retirar el DNS. Mide el orden solo.
cp "$M" "$M.orig"
OLD="  await (deps.runPrivilegedStep ?? runPrivilegedMitmStep)(
    sudoPassword,
    'Skipping DNS teardown — no sudo password available',
    () => removeStopDnsEntries(teardown, sudoPassword),
  )
  await killServerProcessOnStop(deps.stopGraceMs ?? DEFAULT_STOP_GRACE_MS)" NEW="  await killServerProcessOnStop(deps.stopGraceMs ?? DEFAULT_STOP_GRACE_MS)
  await (deps.runPrivilegedStep ?? runPrivilegedMitmStep)(
    sudoPassword,
    'Skipping DNS teardown — no sudo password available',
    () => removeStopDnsEntries(teardown, sudoPassword),
  )" bash ../../../bin/replace_literal "$M" >/dev/null && { echo "== reordenada: matar antes que el DNS"; run; }
mv "$M.orig" "$M"
echo "== restaurado de nuevo"; run
git diff --stat -- "$M" | tail -1
