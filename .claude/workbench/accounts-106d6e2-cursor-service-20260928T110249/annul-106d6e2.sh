#!/usr/bin/env bash
# Anulaciones de #106d-6e-2: servicio de Cursor.
set -u
T=${T:-/home/user/thyrox}; cd "$T/src/packages/provider"
F="src/accounts/cursor/cursorService.ts"
run() { timeout 120 bun test ./__tests__/accounts/cursor/cursorService.test.ts 2>&1 | gawk '/^\(fail\)|^ *[0-9]+ (pass|fail)$/'; }
source "$T/.claude/workbench/mitm-f7h-api-20260928T070339/annul-lib.sh"
echo "== 1: otra clave inicial"; annul "$F" "const CHECKSUM_INITIAL_KEY = 165" "const CHECKSUM_INITIAL_KEY = 166"
echo "== 2: clave fija"; annul "$F" "    key = (key + code) & BYTE_MASK" "    void key"
echo "== 3: milisegundos en vez de segundos"; annul "$F" "Math.floor(nowMs / MILLISECONDS_PER_SECOND).toString()" "Math.floor(nowMs).toString()"
echo "== 4: sin el id de máquina"; annul "$F" "toString('base64')},\${machineId}\`" "toString('base64')}\`"
echo "== 5: windows no se nombra"; annul "$F" "  if (platform === 'win32') return 'windows'" "  void 0"
echo "== 6: macos no se nombra"; annul "$F" "  if (platform === 'darwin') return 'macos'" "  void 0"
echo "== 7: x64 sin traducir"; annul "$F" "  if (arch === 'x64') return 'x86_64'" "  void 0"
echo "== 8: arm64 sin traducir"; annul "$F" "  if (arch === 'arm64') return 'aarch64'" "  void 0"
echo "== 9: sin la versión declarada"; annul "$F" "  const version = input.clientVersion ?? CURSOR_CLIENT_VERSION" "  const version = CURSOR_CLIENT_VERSION"
echo "== 10: sin el modo fantasma"; annul "$F" "'x-ghost-mode': input.ghostMode ? 'true' : 'false'," "'x-ghost-mode': 'false',"
echo "== 11: la plataforma declarada no gana"; annul "$F" "cursorClientOs(input.platform ?? process.platform)" "cursorClientOs(process.platform)"
echo "== 12: la arquitectura declarada no gana"; annul "$F" "cursorClientArch(input.arch ?? process.arch)" "cursorClientArch(process.arch)"
echo "== 13: el checksum con otro reloj"; annul "$F" "generateCursorChecksum(input.machineId, input.nowMs)" "generateCursorChecksum(input.machineId, Date.now())"
echo "== 14: un token vacío pasa"; annul "$F" "  if (!accessToken || typeof accessToken !== 'string') throw" "  if (false) throw"
echo "== 15: un token corto pasa"; annul "$F" "  if (accessToken.length < MIN_TOKEN_LENGTH) throw" "  if (false) throw"
echo "== 16: el límite de longitud inclusivo"; annul "$F" "accessToken.length < MIN_TOKEN_LENGTH" "accessToken.length <= MIN_TOKEN_LENGTH"
echo "== 17: cualquier id de máquina"; annul "$F" "  if (machineId && !MACHINE_ID_PATTERN.test(machineId.replace(/-/g, ''))) throw" "  if (false) throw"
echo "== 18: los guiones cuentan"; annul "$F" "MACHINE_ID_PATTERN.test(machineId.replace(/-/g, ''))" "MACHINE_ID_PATTERN.test(machineId)"
echo "== 19: el id de máquina sin mínimo"; annul "$F" "/^[a-f0-9-]{32,}\$/i" "/^[a-f0-9-]+\$/i"
echo "== 20: el id de máquina sin distinguir hex"; annul "$F" "/^[a-f0-9-]{32,}\$/i" "/^[a-z0-9-]{32,}\$/i"
echo "== 21: sin distinguir IDE de cursor-agent"; annul "$F" "authMethod: machineId ? 'imported' : 'cursor-agent'" "authMethod: 'imported'"
echo "== 22: sin id de máquina queda vacío"; annul "$F" "machineId: machineId || null" "machineId: machineId ?? ''"
echo "== 23: cualquier texto es correo"; annul "$F" "typeof claims.email === 'string' && claims.email.includes('@') ? claims.email : null" "typeof claims.email === 'string' ? claims.email : null"
echo "== 24: sin user_id"; annul "$F" "userId: claims.sub || claims.user_id" "userId: claims.sub"
echo "== 25: perfil sin token ni usuario"; annul "$F" "  if (!accessToken || !userId) return null" "  void 0"
echo "== 26: perfil rechazado se lee"; annul "$F" "    if (!response.ok) return null" "    void 0"
echo "== 27: perfil que lanza"; annul "$F" "  } catch {
    return null
  }
}" "  } finally {
  }
}"
echo "== 28: perfil con redirecciones"; annul "$F" "      redirect: 'manual'," ""
echo "== 29: otra cookie"; annul "$F" "Cookie: \`WorkosCursorSessionToken=\${userId}::\${accessToken}\`," "Cookie: \`WorkosCursorSessionToken=\${accessToken}\`,"
echo "== 30: campos sin tipar"; annul "$F" "const text = (value: unknown) => (typeof value === 'string' ? value : null)" "const text = (value: unknown) => (value ?? null) as string | null"
echo "== 31: instrucciones sin la ruta de windows"; annul "$F" "      \`   - Windows: \${TOKEN_STORAGE_PATHS.windows}\`," ""
echo "== restaurado"; run
