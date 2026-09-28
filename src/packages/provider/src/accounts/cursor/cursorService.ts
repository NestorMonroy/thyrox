/**
 * Lo que una conexión de Cursor necesita fuera del inicio de sesión: la suma
 * de comprobación y las cabeceras que la API de Cursor exige, la validación
 * de un token importado del IDE o de cursor-agent, y el nombre de la cuenta,
 * leído del token o del panel de cursor.com.
 *
 * Porte de `omniroute: src/lib/oauth/services/cursor.ts` (MIT).
 */
import { decodeJwtPayload } from '../jwtPayload.ts'

/** La versión de cursor-agent con que se presenta el cliente. */
export const CURSOR_CLIENT_VERSION = '2026.07.08-0c04a8a'
const CURSOR_CLIENT_TYPE = 'ide'
const CHECKSUM_INITIAL_KEY = 165
const BYTE_MASK = 0xff
const MILLISECONDS_PER_SECOND = 1000
const MIN_TOKEN_LENGTH = 50
/** Un id de máquina es hexadecimal de al menos 32 dígitos, con o sin guiones. */
const MACHINE_ID_PATTERN = /^[a-f0-9-]{32,}$/i
/** Cursor no declara la vida del token importado; dura un día en la práctica. */
const IMPORTED_TOKEN_LIFETIME_SECONDS = 86400
const PROFILE_URL = 'https://cursor.com/api/auth/me'

const TOKEN_STORAGE_PATHS = {
  linux: '~/.config/Cursor/User/globalStorage/state.vscdb',
  macos: '/Users/<user>/Library/Application Support/Cursor/User/globalStorage/state.vscdb',
  windows: '%APPDATA%\\Cursor\\User\\globalStorage\\state.vscdb',
}

export function cursorUserAgent(version: string): string {
  return `Cursor/${version}`
}

/** Los segundos unix cifrados con XOR y una clave rodante, en base64, y el id de máquina. */
export function generateCursorChecksum(machineId: string, nowMs: number): string {
  const timestamp = Math.floor(nowMs / MILLISECONDS_PER_SECOND).toString()
  let key = CHECKSUM_INITIAL_KEY
  const encoded: number[] = []
  for (const char of timestamp) {
    const code = char.charCodeAt(0)
    encoded.push(code ^ key)
    key = (key + code) & BYTE_MASK
  }
  return `${Buffer.from(encoded).toString('base64')},${machineId}`
}

export function cursorClientOs(platform: string): string {
  if (platform === 'win32') return 'windows'
  if (platform === 'darwin') return 'macos'
  return 'linux'
}

export function cursorClientArch(arch: string): string {
  if (arch === 'x64') return 'x86_64'
  if (arch === 'arm64') return 'aarch64'
  return arch
}

export interface CursorHeadersInput {
  accessToken: string
  machineId: string
  nowMs: number
  ghostMode?: boolean
  platform?: string
  arch?: string
  clientVersion?: string
}

export function buildCursorHeaders(input: CursorHeadersInput): Record<string, string> {
  const version = input.clientVersion ?? CURSOR_CLIENT_VERSION
  return {
    Authorization: `Bearer ${input.accessToken}`,
    'Content-Type': 'application/connect+proto',
    'Connect-Protocol-Version': '1',
    'User-Agent': cursorUserAgent(version),
    'x-cursor-client-version': version,
    'x-cursor-client-type': CURSOR_CLIENT_TYPE,
    'x-cursor-client-os': cursorClientOs(input.platform ?? process.platform),
    'x-cursor-client-arch': cursorClientArch(input.arch ?? process.arch),
    'x-cursor-client-device-type': 'desktop',
    'x-cursor-user-agent': cursorUserAgent(version),
    'x-cursor-checksum': generateCursorChecksum(input.machineId, input.nowMs),
    'x-ghost-mode': input.ghostMode ? 'true' : 'false',
  }
}

export interface CursorImportValidation {
  accessToken: string
  machineId: string | null
  expiresIn: number
  authMethod: 'imported' | 'cursor-agent'
}

/**
 * Sólo la forma: la API de Cursor habla protobuf, así que el token se prueba
 * al usarlo. El del IDE trae id de máquina; el de cursor-agent no.
 */
export function validateCursorImportToken(accessToken: string, machineId?: string): CursorImportValidation {
  if (!accessToken || typeof accessToken !== 'string') throw new Error('Access token is required')
  if (accessToken.length < MIN_TOKEN_LENGTH) throw new Error('Invalid token format. Token appears too short.')
  if (machineId && !MACHINE_ID_PATTERN.test(machineId.replace(/-/g, ''))) throw new Error('Invalid machine ID format. Expected UUID format.')
  return { accessToken, machineId: machineId || null, expiresIn: IMPORTED_TOKEN_LIFETIME_SECONDS, authMethod: machineId ? 'imported' : 'cursor-agent' }
}

/** El correo (si parece uno) y el usuario del token, o `null` si no es un JWT. */
export function extractCursorUserInfo(accessToken: string): { email: string | null; userId: unknown } | null {
  const claims = decodeJwtPayload(accessToken)
  if (!claims) return null
  const email = typeof claims.email === 'string' && claims.email.includes('@') ? claims.email : null
  return { email, userId: claims.sub || claims.user_id }
}

/** El perfil del panel de cursor.com con la cookie de sesión de WorkOS; `null` ante cualquier fallo. */
export async function fetchCursorUserInfo(fetch: typeof globalThis.fetch, accessToken: string, userId: string): Promise<{ email: string | null; name: string | null; sub: string | null } | null> {
  if (!accessToken || !userId) return null
  try {
    const response = await fetch(PROFILE_URL, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        Cookie: `WorkosCursorSessionToken=${userId}::${accessToken}`,
        Origin: 'https://cursor.com',
        Referer: 'https://cursor.com/dashboard',
        Accept: 'application/json',
        'User-Agent': cursorUserAgent(CURSOR_CLIENT_VERSION),
      },
    })
    if (!response.ok) return null
    const data = (await response.json()) as Record<string, unknown>
    const text = (value: unknown) => (typeof value === 'string' ? value : null)
    return { email: text(data.email), name: text(data.name), sub: text(data.sub) }
  } catch {
    return null
  }
}

/** Cómo sacar el token y el id de máquina de la base del IDE. */
export function cursorTokenStorageInstructions(): { title: string; steps: string[]; alternativeMethod: string[] } {
  return {
    title: 'How to get your Cursor token',
    steps: [
      "1. Open Cursor IDE and make sure you're logged in",
      '2. Find the state.vscdb file:',
      `   - Linux: ${TOKEN_STORAGE_PATHS.linux}`,
      `   - macOS: ${TOKEN_STORAGE_PATHS.macos}`,
      `   - Windows: ${TOKEN_STORAGE_PATHS.windows}`,
      '3. Open the database with SQLite browser or CLI:',
      "   sqlite3 state.vscdb \"SELECT value FROM itemTable WHERE key='cursorAuth/accessToken'\"",
      '4. Also get the machine ID:',
      "   sqlite3 state.vscdb \"SELECT value FROM itemTable WHERE key='storage.serviceMachineId'\"",
      '5. Paste both values in the form below',
    ],
    alternativeMethod: [
      'Or use this one-liner to get both values:',
      "sqlite3 state.vscdb \"SELECT key, value FROM itemTable WHERE key IN ('cursorAuth/accessToken', 'storage.serviceMachineId')\"",
    ],
  }
}
