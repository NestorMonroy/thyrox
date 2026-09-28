#!/usr/bin/env bash
# Anulaciones de #106e-5b-2: comprobación de una conexión y barrido.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
D="src/accounts/refresh/health"; C="$D/connectionHealthCheck.ts"; S="$D/healthCheckScheduler.ts"
run() { timeout 120 bun test ./__tests__/accounts/refresh/health/connectionHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin releer la fila"; annul "$C" "    const connection = store.getById(given.id as string) ?? given" "    const connection = given"
echo "== 2: sin exclusiones del entorno"; annul "$C" "      skipProviders: healthCheckSkipProviders(env)," "      skipProviders: new Set<string>(),"
echo "== 3: marca no se escribe"; annul "$C" "        store.update(connection.id as string, plan.update)" "        void plan.update"
echo "== 4: sin sello"; annul "$C" "        store.update(connection.id as string, { lastHealthCheckAt: stamp })" "        void stamp"
echo "== 5: sin desactivar"; annul "$C" "        store.update(connection.id as string, { isActive: false })" ""
echo "== 6: cursor ignorado"; annul "$C" "        return checks.cursor?.(connection, stamp)" "        return"
echo "== 7: cookie sin intervalo"; annul "$C" "checks.webCookie?.(connection, plan.intervalMin, stamp)" "checks.webCookie?.(connection, 60, stamp)"
echo "== 8: copilot ignorado"; annul "$C" "        return checks.githubCopilot?.(connection, stamp)" "        return"
echo "== 9: kimi ignorado"; annul "$C" "        return checks.kimiWeb?.(connection, stamp)" "        return"
echo "== 10: guardado fuera de la ventana"; annul "$C" "      result = await deps.tokens.getAccessToken(String(connection.provider), credentials, persist)" "      result = await deps.tokens.getAccessToken(String(connection.provider), credentials)"
echo "== 11: guardado fallido cuenta como hecho"; annul "$C" "        log?.warn?.(LOG_TAG, \`\${label(connection)} DB write failed after successful refresh (\${errorText(error)}); token not persisted\`)
        return" "        log?.warn?.(LOG_TAG, \`\${label(connection)} DB write failed after successful refresh (\${errorText(error)}); token not persisted\`)"
echo "== 12: error tras guardar deshace"; annul "$C" "      if (persisted) {" "      if (false) {"
echo "== 13: red abre el circuito"; annul "$C" "      if (isTransientRefreshError(error)) {" "      if (false) {"
echo "== 14: sin muerto"; annul "$C" "    if (isUnrecoverableRefreshError(result)) {" "    if (false) {"
echo "== 15: muerto sin releer"; annul "$C" "unrecoverableRefreshOutcome(connection, result as { error: string; code?: string }, store.getById(connection.id as string), attempted, now())" "unrecoverableRefreshOutcome(connection, result as { error: string; code?: string }, null, attempted, now())"
echo "== 16: guardado reescrito entero"; annul "$C" "persisted ? { lastHealthCheckAt: new Date(now()).toISOString() } : refreshedConnectionUpdate(connection, refreshed, now())" "refreshedConnectionUpdate(connection, refreshed, now())"
echo "== 17: sin subtoken"; annul "$C" "      if (String(connection.provider).toLowerCase() === 'github') await checks.copilotSubToken?.(connection, refreshed)" ""
echo "== 18: subtoken para todos"; annul "$C" "      if (String(connection.provider).toLowerCase() === 'github') await" "      await"
echo "== 19: vacío no abre circuito"; annul "$C" "    store.update(connection.id as string, update as unknown as Row)
    log?.warn?.(LOG_TAG, \`\${label(connection)} refresh failed" "    log?.warn?.(LOG_TAG, \`\${label(connection)} refresh failed"
echo "== 20: sin ocultar registro"; annul "$C" "  const log = envFlagEnabled(env, 'THYROX_HIDE_HEALTHCHECK_LOGS') ? null : deps.log" "  const log = deps.log"
echo "== 21: credenciales sin datos"; annul "$C" "expiresAt: connection.tokenExpiresAt || connection.expiresAt || null, providerSpecificData: connection.providerSpecificData }" "expiresAt: connection.tokenExpiresAt || connection.expiresAt || null }"
echo "== 22: sin id se lee"; annul "$C" "    if (!given?.id) return
" ""
echo "== 23: lote de 10"; annul "$S" "const DEFAULT_BATCH_SIZE = 20" "const DEFAULT_BATCH_SIZE = 10"
echo "== 24: tamaño cero vale"; annul "$S" "    return configured > 0 ? configured : DEFAULT_BATCH_SIZE" "    return configured || DEFAULT_BATCH_SIZE"
echo "== 25: sin cookies"; annul "$S" "[...(await deps.listConnections('oauth')), ...(await deps.listConnections('cookie'))]" "[...(await deps.listConnections('oauth'))]"
echo "== 26: barridos solapados"; annul "$S" "    if (sweeping) {" "    if (false) {"
echo "== 27: fallo de una corta el lote"; annul "$S" "            deps.checkConnection(connection).catch((error: unknown) => {" "            deps.checkConnection(connection).then(() => {}, (error: unknown) => { throw error; void (() => {"
echo "== 28: sin pausa"; annul "$S" "          if (stagger > 0) {" "          if (false) {"
echo "== 29: sin jitter"; annul "$S" "stagger + jitterMin + random() * Math.max(0, jitterMax - jitterMin)" "stagger"
echo "== 30: sin ceder"; annul "$S" "          await sleep(0)" ""
echo "== 31: pausa tras el último"; annul "$S" "        if (end < total) {" "        {"
echo "== 32: listado lanza"; annul "$S" "      log?.error?.(LOG_TAG, \`Sweep error:" "      throw error
      log?.error?.(LOG_TAG, \`Sweep error:"
echo "== 33: arranque inmediato"; annul "$S" "const START_DELAY_MS = 10_000" "const START_DELAY_MS = 0"
echo "== 34: arranca dos veces"; annul "$S" "    if (running || healthCheckDisabled(env)) return" "    if (healthCheckDisabled(env)) return"
echo "== 35: desactivado arranca"; annul "$S" "    if (running || healthCheckDisabled(env)) return" "    if (running) return"
echo "== 36: parar no limpia"; annul "$S" "    if (interval !== null) timers.clear(interval)" ""
echo "== 37: sigue corriendo al parar"; annul "$S" "    interval = null
    running = false" "    interval = null"
echo "== 38: sin primer barrido"; annul "$S" "      void sweep()
      interval" "      interval"
echo "== 39: exclusión sin minúsculas"; annul "$S" "entry.trim().toLowerCase()" "entry.trim()"
echo "== 40: bandera sin recortar"; annul "$S" "TRUE_VALUES.has(String(value).trim().toLowerCase())" "TRUE_VALUES.has(String(value))"
echo "== restaurado"; run
