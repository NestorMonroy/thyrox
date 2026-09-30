#!/usr/bin/env bash
# Anulaciones de F7h-5: se retira cada mitad de juicio de la API compuesta y
# del cableado de la ingesta hacia el servidor MITM.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/mitm"
F="src/api/mitmApi.ts src/manager.ts"
run() { bun test __tests__/api/mitmApi.test.ts __tests__/manager/lifecycle.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: ruta repetida aceptada"; annul "$F" '    if (seen.has(key)) throw new Error(`Route mounted twice: ${key}`)' ''
echo "== 2: arrancar sin publicar el destino de ingesta"; annul "$F" '  setInspectorIngest({ baseUrl: url, token: ingestToken })' ''
echo "== 3: parar sin retirar el destino"; annul "$F" '      server.stop()
      setInspectorIngest(null)' '      server.stop()'
echo "== 4: la ruta de ingesta con otro token"; annul "$F" 'createIngestRoutes({ traffic, ingestToken: () => ingestToken })' 'createIngestRoutes({ traffic, ingestToken: () => resolveIngestToken() })'
echo "== 5: destino heredado sin retirar"; annul "$F" '  delete env.THYROX_MITM_API_URL
  delete env.THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN
' ''
echo "== 6: el arranque sin el destino de ingesta"; annul "$F" 'apiKey, ingest: inspectorIngest })' 'apiKey, ingest: null })'
echo "== 7: el reinicio del gestor sin limpiar el destino"; annul "$F" '  cachedPassword = null
  inspectorIngest = null' '  cachedPassword = null'
echo "== restaurado"; git -C "$T" status --short -- src/packages/mitm/src; run
