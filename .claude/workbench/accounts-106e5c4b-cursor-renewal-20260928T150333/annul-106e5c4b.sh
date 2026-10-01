#!/usr/bin/env bash
# Anulaciones de #106e-5c-4b: renovación de Cursor y su hoja del barrido.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
R="src/accounts/cursor/cursorRenewal.ts"
H="src/accounts/refresh/health/cursorHealthCheck.ts"
run() { timeout 120 bun test ./__tests__/accounts/cursor/cursorRenewal.test.ts ./__tests__/accounts/refresh/health/cursorHealthCheck.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin compartir en vuelo"; annul "$R" "    if (existing) return existing" ""
echo "== 2: en vuelo sin olvidar"; annul "$R" "      if (inFlight.get(kind) === promise) inFlight.delete(kind)" ""
echo "== 3: empujón como status"; annul "$R" "    return locked('nudge'," "    return locked('status',"
echo "== 4: empujón con otra orden"; annul "$R" "run(binary, ['--list-models'], NUDGE_TIMEOUT_MS" "run(binary, ['status'], NUDGE_TIMEOUT_MS"
echo "== 5: sin SIGKILL posterior"; annul "$R" "  const withFollowup = (timeoutMs: number) => ({ sigkillFollowupMs: Math.max(1, Math.floor(timeoutMs / 2)) })" "  const withFollowup = (_timeoutMs: number) => ({})"
echo "== 6: PATH permitido"; annul "$R" "resolveBinary({ allowPathFallback: false })" "resolveBinary({})"
echo "== 7: sin binario disponible"; annul "$R" "    if (!binary) return { available: false, binaryPath: null }" "    if (!binary) return { available: true, binaryPath: null }"
echo "== 8: spawn fallido lanza"; annul "$R" "    } catch {
      return { available: false, binaryPath: binary }" "    } catch (error) {
      throw error"
echo "== 9: autenticado laxo"; annul "$R" "available: parsed.isAuthenticated === true" "available: Boolean(parsed.isAuthenticated ?? true)"
echo "== 10: texto siempre disponible"; annul "$R" "available: !NOT_AUTHENTICATED.test(\`\${result.stdout}\n\${result.stderr}\`)" "available: true"
echo "== 11: stderr ignorado"; annul "$R" "test(\`\${result.stdout}\n\${result.stderr}\`)" "test(result.stdout)"
echo "== 12: caché sin caducar"; annul "$R" "    if (cached && cached.expiresAt > at) return cached.result" "    if (cached) return cached.result"
echo "== 13: sin caché"; annul "$R" "    cached = { result, expiresAt: at + AVAILABILITY_CACHE_TTL_MS }" ""
echo "== 14: caché inclusiva"; annul "$R" "cached.expiresAt > at) return cached.result" "cached.expiresAt >= at) return cached.result"
echo "== 15: IDE sin compartir"; annul "$R" "    if (cached && cached.home === currentHome && cached.expiresAt > at) return cached.promise" ""
echo "== 16: IDE ignora el home"; annul "$R" "cached.home === currentHome && cached.expiresAt > at) return cached.promise" "cached.expiresAt > at) return cached.promise"
echo "== 17: espera larga"; annul "$R" "read({ timeoutMs: BACKGROUND_IDE_AUTH_TIMEOUT_MS })" "read()"
echo "== 18: sin empujón"; annul "$R" "        await deps.nudge(availability.binaryPath)" ""
echo "== 19: empuja no disponible"; annul "$R" "    if (availability.available && availability.binaryPath) {" "    if (availability.binaryPath !== undefined) {"
echo "== 20: empujón fallido corta"; annul "$R" "    } catch {
        // Un agente caído" "    } catch (error) { throw error
        // Un agente caído"
echo "== 21: IDE igual renueva"; annul "$R" "ide.accessToken !== current.accessToken) return" "ide.accessToken) return"
echo "== 22: sin agente"; annul "$R" "    if (agent.found && agent.accessToken && agent.accessToken !== current.accessToken) return { status: 'renewed', accessToken: agent.accessToken, source: 'cursor-agent' }" ""
echo "== 23: agente sin token renueva"; annul "$R" "if (agent.found && agent.accessToken && agent.accessToken !== current.accessToken)" "if (agent.found && agent.accessToken !== current.accessToken)"
echo "== 24: sin machineId"; annul "$R" "accessToken: ide.accessToken, machineId: ide.machineId, source" "accessToken: ide.accessToken, source"
echo "== 25: error sin sanear"; annul "$R" "error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error))" "error: error instanceof Error ? error.message : String(error)"
echo "== 26: circuito conservado"; annul "$R" "  const { refreshCircuit: _circuit, ...providerSpecificData } = current.providerSpecificData ?? {}" "  const providerSpecificData: Record<string, unknown> = { ...(current.providerSpecificData ?? {}) }"
echo "== 27: machineId no se guarda"; annul "$R" "  if (result.machineId) providerSpecificData.machineId = result.machineId" ""
echo "== 28: vida de una hora"; annul "$R" "export const CURSOR_TOKEN_LIFETIME_S = 86400" "export const CURSOR_TOKEN_LIFETIME_S = 3600"
echo "== 29: reintentos sin limpiar"; annul "$R" "    expiredRetryCount: null," ""
echo "== 30: sin candado"; annul "$H" "    return mutex.run(connection.id as string, async () => {" "    return mutex.run(String(Math.random()), async () => {"
echo "== 31: machineId no se pasa"; annul "$H" "machineId: (data.machineId as string | undefined) ?? null" "machineId: null"
echo "== 32: renovada no se guarda"; annul "$H" "        await store.update(connection.id as string, buildCursorRenewedUpdate(" "        void (0 as unknown as typeof buildCursorRenewedUpdate)("
echo "== 33: estancada caduca"; annul "$H" "lastError: message, testStatus: 'active' })" "lastError: message })"
echo "== 34: sin código propio"; annul "$H" "{ errorCode: 'cursor_session_stale', lastErrorType" "{ lastErrorType"
echo "== 35: error como aviso"; annul "$H" "const report = result.status === 'error' ? log?.error : log?.warn" "const report = log?.warn"
echo "== 36: sin mensaje de error"; annul "$H" "result.status === 'error' ? \`Cursor session renewal failed: \${result.error}\` :" "false ? '' :"
echo "== restaurado"; run
