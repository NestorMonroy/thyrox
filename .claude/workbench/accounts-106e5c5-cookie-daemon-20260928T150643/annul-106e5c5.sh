#!/usr/bin/env bash
# Anulaciones de #106e-5c-5: configuraciones de extracción y demonio de vigencia.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
C="src/accounts/webCookie/tokenExtractionConfig.ts"
D="src/accounts/webCookie/autoRefreshDaemon.ts"
run() { timeout 120 bun test ./__tests__/accounts/webCookie/tokenExtractionConfig.test.ts ./__tests__/accounts/webCookie/autoRefreshDaemon.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sondeo por defecto pisa"; annul "$C" "pollingConfig: { ...DEFAULT_POLLING, ...opts?.pollingConfig }" "pollingConfig: { ...opts?.pollingConfig, ...DEFAULT_POLLING }"
echo "== 2: sin patrón de éxito"; annul "$C" "successUrlPattern: opts?.successUrlPattern," "successUrlPattern: undefined,"
echo "== 3: sin dominio de cookie"; annul "$C" "cookieDomain: opts?.cookieDomain }" "cookieDomain: undefined }"
echo "== 4: sondeo rápido lento"; annul "$C" "const QUICK_POLLING: PollingConfig = { pollInterval: 800, timeout: 120_000, minLoginTime: 3000 }" "const QUICK_POLLING: PollingConfig = DEFAULT_POLLING"
echo "== 5: listado compartido"; annul "$C" "  return [...RAW_CONFIGS]" "  return RAW_CONFIGS"
echo "== 6: sin mínimo de intervalo"; annul "$D" "Math.max(deps.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS, MIN_CHECK_INTERVAL_MS)" "(deps.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS)"
echo "== 7: 15 min → 5 min"; annul "$D" "const DEFAULT_CHECK_INTERVAL_MS = 15 * 60 * 1000" "const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000"
echo "== 8: GET"; annul "$D" "method: 'HEAD'," "method: 'GET',"
echo "== 9: 403 vale"; annul "$D" "response.status !== UNAUTHORIZED && response.status !== FORBIDDEN" "response.status !== UNAUTHORIZED"
echo "== 10: 401 vale"; annul "$D" "response.status !== UNAUTHORIZED && response.status !== FORBIDDEN" "response.status !== FORBIDDEN"
echo "== 11: red condena"; annul "$D" "      return true
    } finally {" "      return false
    } finally {"
echo "== 12: sin plazo"; annul "$D" "    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)" "    const timeout = setTimeout(() => {}, requestTimeoutMs)"
echo "== 13: sin aviso de red"; annul "$D" "      log?.warn?.(LOG_TAG, \`Network error validating" "      void (LOG_TAG, \`Network error validating"
echo "== 14: desconocido se queda"; annul "$D" "        credentials.delete(providerId)
        continue" "        continue"
echo "== 15: caducada repetida"; annul "$D" "        if (!expired.includes(providerId)) expired.push(providerId)" "        expired.push(providerId)"
echo "== 16: sin marca de hora"; annul "$D" "    lastRun = now()" ""
echo "== 17: arranque doble"; annul "$D" "    if (running) return
    running = true" "    running = true"
echo "== 18: sin comprobar al arrancar"; annul "$D" "    void check().catch(() => {})
    timer" "    timer"
echo "== 19: sin unref"; annul "$D" "    ;(timer as { unref?: () => void })?.unref?.()" ""
echo "== 20: parada sin estado"; annul "$D" "    if (!running) return
    running = false" "    running = false"
echo "== 21: timer sin limpiar"; annul "$D" "      timers.clearInterval(timer)" ""
echo "== 22: sin desregistrar"; annul "$D" "      credentials.delete(providerId)
    },
    start," "    },
    start,"
echo "== 23: sin limpiar caducadas"; annul "$D" "      expired = []" ""
echo "== 24: reinicio sin parar"; annul "$D" "      stop()
      start()" "      start()"
echo "== 25: estado comparte lista"; annul "$D" "expiredCredentials: [...expired]" "expiredCredentials: expired"
echo "== restaurado"; run
