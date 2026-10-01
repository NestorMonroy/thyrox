/**
 * Las credenciales de Cursor que quedan en el disco del anfitrión: el
 * `state.vscdb` del IDE (token, refresh token e id de máquina) y el
 * `auth.json` de `cursor-agent`. En Linux el IDE tiene que estar instalado:
 * una desinstalación deja `~/.config/Cursor` detrás, y leerlo crearía una
 * conexión fantasma.
 *
 * Porte de `omniroute: src/lib/cursor/tokenExtractor.ts` (MIT).
 */
import { Database } from 'bun:sqlite'
import { execFile } from 'node:child_process'
import { access, constants, readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const WHICH_TIMEOUT_MS = 5000
const DEFAULT_OPEN_TIMEOUT_MS = 2000

/** Los nombres con que Cursor guardó cada dato a lo largo del tiempo; el primero que aparece gana. */
const ACCESS_TOKEN_KEYS = ['cursorAuth/accessToken', 'cursorAuth/token']
const REFRESH_TOKEN_KEYS = ['cursorAuth/refreshToken']
const MACHINE_ID_KEYS = ['storage.serviceMachineId', 'storage.machineId', 'telemetry.machineId']

export interface CursorInstallProbe {
  execFile?: (file: string, args: string[], options: { timeout: number }) => Promise<{ stdout: string; stderr: string }>
  access?: (path: string, mode: number) => Promise<void>
  home?: string
}

/** `which cursor`, o el lanzador `.desktop` que deja una instalación por paquete. */
export async function verifyLinuxCursorInstalled(probe: CursorInstallProbe = {}): Promise<boolean> {
  const exec = probe.execFile ?? execFileAsync
  const canAccess = probe.access ?? access
  try {
    await exec('which', ['cursor'], { timeout: WHICH_TIMEOUT_MS })
    return true
  } catch {
    try {
      await canAccess(join(probe.home ?? homedir(), '.local/share/applications/cursor.desktop'), constants.R_OK)
      return true
    } catch {
      return false
    }
  }
}

/** Algunos valores se guardan como cadena JSON (`'"abc"'`): se desenvuelve un nivel. */
export function normalizeVscDbValue<T>(value: T): T | string {
  if (typeof value !== 'string') return value
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

export interface VscDbRow {
  key: string
  value: string
}

export interface ExtractedCursorTokens {
  accessToken?: string
  refreshToken?: string
  machineId?: string
}

export function extractCursorTokensFromRows(rows: VscDbRow[]): ExtractedCursorTokens {
  const tokens: ExtractedCursorTokens = {}
  for (const row of rows) {
    const value = normalizeVscDbValue(row.value)
    if (typeof value !== 'string') continue
    if (!tokens.accessToken && ACCESS_TOKEN_KEYS.includes(row.key)) tokens.accessToken = value
    else if (!tokens.refreshToken && REFRESH_TOKEN_KEYS.includes(row.key)) tokens.refreshToken = value
    else if (!tokens.machineId && MACHINE_ID_KEYS.includes(row.key)) tokens.machineId = value
  }
  return tokens
}

/** Sólo cuando las claves exactas no dieron nada: Cursor puede renombrarlas. */
export function fuzzyExtractCursorTokensFromRows(rows: VscDbRow[], existing: ExtractedCursorTokens = {}): ExtractedCursorTokens {
  const tokens: ExtractedCursorTokens = { ...existing }
  for (const row of rows) {
    const lower = (row.key || '').toLowerCase()
    const value = normalizeVscDbValue(row.value)
    if (typeof value !== 'string') continue
    if (!tokens.accessToken && lower.includes('accesstoken')) tokens.accessToken = value
    if (!tokens.refreshToken && lower.includes('refreshtoken') && !lower.includes('accesstoken')) tokens.refreshToken = value
    if (!tokens.machineId && lower.includes('machineid')) tokens.machineId = value
  }
  return tokens
}

export function cursorDbCandidatePaths(platform: string, env: { home: string; appdata?: string }): string[] {
  if (platform === 'darwin') {
    return [join(env.home, 'Library/Application Support/Cursor/User/globalStorage/state.vscdb'), join(env.home, 'Library/Application Support/Cursor - Insiders/User/globalStorage/state.vscdb')]
  }
  if (platform === 'linux') return [join(env.home, '.config/Cursor/User/globalStorage/state.vscdb')]
  if (platform === 'win32') return [join(env.appdata || '', 'Cursor/User/globalStorage/state.vscdb')]
  return []
}

export interface CursorCredentialLookup {
  found: boolean
  accessToken?: string
  refreshToken?: string
  machineId?: string
  source?: string
  error?: string
}

/** El `auth.json` del CLI y, si no trae un token, el estado del CLI. Un token en el llavero del sistema no se ve. */
export async function tryAgentAuth(options: { home?: string } = {}): Promise<CursorCredentialLookup> {
  const home = options.home ?? homedir()
  for (const path of [join(home, '.config', 'cursor', 'auth.json'), join(home, '.cursor', 'agent-cli-state.json')]) {
    try {
      const auth = JSON.parse(await readFile(path, 'utf-8')) as { accessToken?: unknown }
      if (auth.accessToken && typeof auth.accessToken === 'string') return { found: true, accessToken: auth.accessToken, source: 'cursor-agent' }
    } catch {
      // Ausente o ilegible: se prueba el siguiente.
    }
  }
  return { found: false, error: 'cursor-agent auth.json not found' }
}

/** Abre en sólo lectura y lee la cabecera ya, para que un archivo que no es SQLite falle al abrir. */
function openReadonly(path: string, timeoutMs: number): Database {
  const db = new Database(path, { readonly: true })
  try {
    db.run(`PRAGMA busy_timeout = ${Math.max(0, Math.floor(timeoutMs))}`)
    db.query('SELECT count(*) FROM sqlite_master').get()
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export interface IdeAuthOptions {
  /** Espera máxima al candado de SQLite: el IDE abierto tiene la base en uso. */
  timeoutMs?: number
  platform?: string
  home?: string
  appdata?: string
  verifyInstalled?: () => Promise<boolean>
}

export async function tryIdeAuth(options: IdeAuthOptions = {}): Promise<CursorCredentialLookup> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_OPEN_TIMEOUT_MS
  const platform = options.platform ?? process.platform
  const home = options.home ?? homedir()
  const candidates = cursorDbCandidatePaths(platform, { home, appdata: options.appdata ?? process.env.APPDATA })
  if (candidates.length === 0) return { found: false, error: 'Unsupported platform' }

  let dbPath: string | undefined
  if (platform === 'darwin') {
    for (const path of candidates) {
      try {
        await access(path, constants.R_OK)
        dbPath = path
        break
      } catch {
        // Se prueba el siguiente canal.
      }
    }
    if (!dbPath) return { found: false, error: 'Cursor database not found in known macOS locations. Make sure Cursor IDE is installed and opened at least once.' }
  } else {
    if (platform === 'linux' && !(await (options.verifyInstalled ?? (() => verifyLinuxCursorInstalled({ home })))())) {
      return { found: false, error: 'Cursor config files found but Cursor IDE does not appear to be installed. Skipping auto-import.' }
    }
    dbPath = candidates[0]!
  }

  let db: Database
  try {
    db = openReadonly(dbPath, timeoutMs)
  } catch (error) {
    if (platform === 'darwin') return { found: false, error: `Found Cursor database at ${dbPath} but could not open it: ${error instanceof Error ? error.message : String(error)}` }
    return { found: false, error: 'Cursor IDE database not found' }
  }

  try {
    const keys = [...ACCESS_TOKEN_KEYS, ...REFRESH_TOKEN_KEYS, ...MACHINE_ID_KEYS]
    const rows = db.query(`SELECT key, value FROM itemTable WHERE key IN (${keys.map(() => '?').join(',')})`).all(...keys) as VscDbRow[]
    let tokens = extractCursorTokensFromRows(rows)
    // El renombre de claves se observó en macOS; las demás plataformas sólo leen claves exactas.
    if (platform === 'darwin' && (!tokens.accessToken || !tokens.machineId)) {
      const fallback = db.query("SELECT key, value FROM itemTable WHERE key LIKE '%cursorAuth/%' OR key LIKE '%machineId%' OR key LIKE '%serviceMachineId%'").all() as VscDbRow[]
      tokens = fuzzyExtractCursorTokensFromRows(fallback, tokens)
    }
    if (!tokens.accessToken) return { found: false, error: 'Tokens not found in database' }
    return { found: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, machineId: tokens.machineId, source: 'cursor-ide' }
  } catch {
    return { found: false, error: 'Failed to read database' }
  } finally {
    db.close()
  }
}
