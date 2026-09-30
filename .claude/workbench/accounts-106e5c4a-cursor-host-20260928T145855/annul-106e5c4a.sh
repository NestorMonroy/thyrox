#!/usr/bin/env bash
# Anulaciones de #106e-5c-4a: credenciales de Cursor en el anfitrión, cursor-agent y el candado por clave.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
M="src/concurrency/keyedMutex.ts"
A="src/accounts/cursor/cursorAgent.ts"
X="src/accounts/cursor/cursorTokenExtractor.ts"
run() { timeout 150 bun test ./__tests__/accounts/cursor/cursorTokenExtractor.test.ts ./__tests__/accounts/cursor/cursorAgent.test.ts ./__tests__/concurrency 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: sin cola"; annul "$M" "    const prior = queue.get(key) ?? Promise.resolve()" "    const prior = Promise.resolve()"
echo "== 2: fallo corta la cola"; annul "$M" "const result = prior.then(fn, fn)" "const result = prior.then(fn)"
echo "== 3: cola sin olvidar"; annul "$M" "      if (queue.get(key) === marker) queue.delete(key)" ""
echo "== 4: stdin en tubería"; annul "$A" "stdio: ['ignore', 'pipe', 'pipe']" "stdio: ['pipe', 'pipe', 'pipe']"
echo "== 5: sin plazo"; annul "$A" "      child.kill('SIGTERM')" ""
echo "== 6: sin SIGKILL"; annul "$A" "          if (!settled) child.kill('SIGKILL')" ""
echo "== 7: stderr perdido"; annul "$A" "      stderr += chunk" ""
echo "== 8: error no rechaza"; annul "$A" "      finish()
      reject(error)" "      finish()
      resolve({ stdout, stderr, code: null, signal: null })"
echo "== 9: sin ubicaciones fijas"; annul "$A" "  for (const candidate of candidates) if (exists(candidate)) return candidate" ""
echo "== 10: PATH siempre"; annul "$A" "  if (lookup.allowPathFallback === false) return null" ""
echo "== 11: sin PATH"; annul "$A" "    if (exists(candidate)) return candidate
  }" "  }"
echo "== 12: sin GPT"; annul "$A" "  gpt: 'GPT'," ""
echo "== 13: sin versión con punto"; annul "$A" "    .replace(/(\d+)-(\d+)(?=-|\$)/g, '\$1.\$2')" ""
echo "== 14: auto sin nombre"; annul "$A" "  if (id === 'auto') return 'Auto (Server Picks)'" ""
echo "== 15: duplicados"; annul "$A" "  return [...new Set(ids.map(id => id.trim()).filter(Boolean))]" "  return ids.map(id => id.trim()).filter(Boolean)"
echo "== 16: sin formato antiguo"; annul "$A" "  if (legacy) return uniqueIds(legacy[1]!.split(','))" ""
echo "== 17: Tip no corta"; annul "$A" "    if (trimmed.startsWith('Tip:')) break" ""
echo "== 18: sin reintento antiguo"; annul "$A" "    if (remainingMs > 0) {" "    if (false) {"
echo "== 19: no autenticado sin nombre"; annul "$A" "    if (NOT_AUTHENTICATED.test(combined)) throw new Error(\"cursor-agent is not authenticated; run 'agent login' on this host\")" ""
echo "== 20: ENOENT sin nombre"; annul "$A" "if ((error as NodeJS.ErrnoException)?.code === 'ENOENT')" "if (false)"
echo "== 21: sin buscar binario"; annul "$A" "options.binary || (options.resolveBinary ?? resolveCursorAgentBinary)()" "options.binary"
echo "== 22: which ignorado"; annul "$X" "    await exec('which', ['cursor'], { timeout: WHICH_TIMEOUT_MS })
    return true" "    throw new Error('x')"
echo "== 23: sin .desktop"; annul "$X" "      await canAccess(join(probe.home ?? homedir(), '.local/share/applications/cursor.desktop'), constants.R_OK)
      return true" "      return false"
echo "== 24: sin desenvolver JSON"; annul "$X" "    return typeof parsed === 'string' ? parsed : value" "    return value"
echo "== 25: el último gana"; annul "$X" "    if (!tokens.accessToken && ACCESS_TOKEN_KEYS.includes(row.key)) tokens.accessToken = value" "    if (ACCESS_TOKEN_KEYS.includes(row.key)) tokens.accessToken = value"
echo "== 26: machineId pisa"; annul "$X" "    else if (!tokens.machineId && MACHINE_ID_KEYS" "    else if (MACHINE_ID_KEYS"
echo "== 27: refresh como access"; annul "$X" "lower.includes('refreshtoken') && !lower.includes('accesstoken')" "lower.includes('refreshtoken')"
echo "== 28: difuso pisa"; annul "$X" "    if (!tokens.machineId && lower.includes('machineid'))" "    if (lower.includes('machineid'))"
echo "== 29: sin Insiders"; annul "$X" ", join(env.home, 'Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb')]" "]"
echo "== 30: token no textual"; annul "$X" "if (auth.accessToken && typeof auth.accessToken === 'string')" "if (auth.accessToken)"
echo "== 31: sólo auth.json"; annul "$X" "join(home, '.config', 'cursor', 'auth.json'), join(home, '.cursor', 'agent-cli-state.json')]" "join(home, '.config', 'cursor', 'auth.json')]"
echo "== 32: archivo roto corta"; annul "$X" "    } catch {
      // Ausente o ilegible: se prueba el siguiente.
    }" "    } catch {
      break
    }"
echo "== 33: sin cabecera al abrir"; annul "$X" "    db.query('SELECT count(*) FROM sqlite_master').get()" ""
echo "== 34: plataforma sin base"; annul "$X" "  if (candidates.length === 0) return { found: false, error: 'Unsupported platform' }" ""
echo "== 35: instalación no mirada"; annul "$X" "    if (platform === 'linux' && !(await" "    if (false && !(await"
echo "== 36: mac sin probar canales"; annul "$X" "    if (!dbPath) return { found: false, error: 'Cursor database not found in known macOS locations." "    if (false) return { found: false, error: 'Cursor database not found in known macOS locations."
echo "== 37: mac sin nombrar la base"; annul "$X" "    if (platform === 'darwin') return { found: false, error: \`Found Cursor database" "    if (false) return { found: false, error: \`Found Cursor database"
echo "== 38: difuso en Linux"; annul "$X" "    if (platform === 'darwin' && (!tokens.accessToken || !tokens.machineId)) {" "    if (!tokens.accessToken || !tokens.machineId) {"
echo "== 39: sin difuso"; annul "$X" "      tokens = fuzzyExtractCursorTokensFromRows(fallback, tokens)" ""
echo "== 40: sin token vale"; annul "$X" "    if (!tokens.accessToken) return { found: false, error: 'Tokens not found in database' }" ""
echo "== 41: lectura lanza"; annul "$X" "  } catch {
    return { found: false, error: 'Failed to read database' }" "  } catch (error) {
    throw error"
echo "== restaurado"; run
