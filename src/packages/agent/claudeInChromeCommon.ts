/**
 * Nombre del servidor MCP de "Claude in Chrome" + seguimiento de pestañas —
 * porte de `ccnmt: packages/agent/claudeInChromeCommon.ts`.
 *
 * La detección de navegador, las rutas de mensajería nativa, los sockets
 * del puente y `openInChrome` se portaron el 2026-09-24 desde el contrato de
 * 2.1.275 (`chunk-g0b24p3s.js`) — ver el bloque del final. Divergencias
 * declaradas ahí.
 */

import { lstat, readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { homedir, platform as osPlatform, userInfo } from 'node:os'
import { dirname, join, win32 } from 'node:path'
import { getPlatform } from '@thyrox/config/platform'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { execFileNoThrow, execFileNoThrowWithCwd } from '@thyrox/shell/execFileNoThrow.js'
import { which } from '@thyrox/shell/which.js'
import type { ChromiumBrowser } from './claudeInChromeSetupPortable.js'

export const CLAUDE_IN_CHROME_MCP_SERVER_NAME = 'claude-in-chrome'

/**
 * Normaliza un nombre de servidor MCP al patrón `^[a-zA-Z0-9_-]{1,64}$`:
 * cualquier carácter fuera de esa lista pasa a guion bajo.
 *
 * Inline, no importado: en la fuente vive en
 * `@claude-code-how-works/mcp-runtime/src/normalization.ts`, un módulo sin
 * dependencias propias. Portar el paquete entero por esta única función de
 * dos líneas no aporta — se copia su comportamiento aquí, con la cita de
 * dónde vive en la fuente.
 */
function normalizeNameForMCP(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function isClaudeInChromeMCPServer(name: string): boolean {
  return normalizeNameForMCP(name) === CLAUDE_IN_CHROME_MCP_SERVER_NAME
}

const MAX_TRACKED_TABS = 200
const trackedTabIds = new Set<number>()

/**
 * Rastrea el id de una pestaña. Al llegar al tope, si el id es NUEVO se
 * limpia todo el conjunto antes de agregarlo (evita crecimiento ilimitado);
 * si el id YA está rastreado, se agrega sin limpiar (evita perder estado
 * real cuando una pestaña dispara su evento de activación repetidamente).
 */
export function trackClaudeInChromeTabId(tabId: number): void {
  if (trackedTabIds.size >= MAX_TRACKED_TABS && !trackedTabIds.has(tabId)) {
    trackedTabIds.clear()
  }
  trackedTabIds.add(tabId)
}

export function isTrackedClaudeInChromeTabId(tabId: number): boolean {
  return trackedTabIds.has(tabId)
}

// ---------------------------------------------------------------------------
// Navegadores, mensajería nativa, sockets y apertura de URL — contrato de
// 2.1.275 (`chunk-g0b24p3s.js`), no copia:
//
//   `CHROMIUM_BROWSERS` ≙ `f` · `BROWSER_DETECTION_ORDER` ≙ `C`
//   · `getAllNativeMessagingHostsDirs` ≙ `G8n` · `getAllWindowsRegistryKeys`
//   ≙ `q8n` · `detectAvailableBrowser` ≙ `$gn` · `openInChrome` ≙ `wie`
//   · `getSocketDir` ≙ `kmt` · `getSecureSocketPath` ≙ `Amt`
//   · `getAllSocketPaths` ≙ `Y8n` · `resolveWindowsAppPath` ≙ `x`
//   · `launchDetached` ≙ `y`.
//
// Divergencias declaradas:
//
// - `getAllBrowserDataPaths` ya no existe en 2.1.275, pero la detección de
//   la extensión de este árbol la usa. Se deriva de la misma tabla: en macOS
//   y Linux el directorio de datos es el padre de `NativeMessagingHosts`, en
//   Windows el `dataPath` bajo `AppData`.
// - La telemetría `chrome_open_url` (éxito/fallo con su causa) no se porta:
//   el resultado y los mensajes de depuración sí.
// ---------------------------------------------------------------------------

export type { ChromiumBrowser }

type BrowserSpec = {
  name: string
  macos: { appName: string; nativeMessagingPath: string[] }
  linux: { binaries: string[]; nativeMessagingPath: string[] }
  windows: { dataPath: string[]; registryKey: string; useRoaming?: boolean; appPathsExe?: string }
}

export const CHROMIUM_BROWSERS: Record<ChromiumBrowser, BrowserSpec> = {
  chrome: {
    name: 'Google Chrome',
    macos: { appName: 'Google Chrome', nativeMessagingPath: ['Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts'] },
    linux: { binaries: ['google-chrome', 'google-chrome-stable'], nativeMessagingPath: ['.config', 'google-chrome', 'NativeMessagingHosts'] },
    windows: { dataPath: ['Google', 'Chrome', 'User Data'], registryKey: 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts', appPathsExe: 'chrome.exe' },
  },
  brave: {
    name: 'Brave',
    macos: { appName: 'Brave Browser', nativeMessagingPath: ['Library', 'Application Support', 'BraveSoftware', 'Brave-Browser', 'NativeMessagingHosts'] },
    linux: { binaries: ['brave-browser', 'brave'], nativeMessagingPath: ['.config', 'BraveSoftware', 'Brave-Browser', 'NativeMessagingHosts'] },
    windows: { dataPath: ['BraveSoftware', 'Brave-Browser', 'User Data'], registryKey: 'HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts', appPathsExe: 'brave.exe' },
  },
  arc: {
    name: 'Arc',
    macos: { appName: 'Arc', nativeMessagingPath: ['Library', 'Application Support', 'Arc', 'User Data', 'NativeMessagingHosts'] },
    linux: { binaries: [], nativeMessagingPath: [] },
    windows: { dataPath: ['Arc', 'User Data'], registryKey: 'HKCU\\Software\\ArcBrowser\\Arc\\NativeMessagingHosts' },
  },
  chromium: {
    name: 'Chromium',
    macos: { appName: 'Chromium', nativeMessagingPath: ['Library', 'Application Support', 'Chromium', 'NativeMessagingHosts'] },
    linux: { binaries: ['chromium', 'chromium-browser'], nativeMessagingPath: ['.config', 'chromium', 'NativeMessagingHosts'] },
    windows: { dataPath: ['Chromium', 'User Data'], registryKey: 'HKCU\\Software\\Chromium\\NativeMessagingHosts' },
  },
  edge: {
    name: 'Microsoft Edge',
    macos: { appName: 'Microsoft Edge', nativeMessagingPath: ['Library', 'Application Support', 'Microsoft Edge', 'NativeMessagingHosts'] },
    linux: { binaries: ['microsoft-edge', 'microsoft-edge-stable'], nativeMessagingPath: ['.config', 'microsoft-edge', 'NativeMessagingHosts'] },
    windows: { dataPath: ['Microsoft', 'Edge', 'User Data'], registryKey: 'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts', appPathsExe: 'msedge.exe' },
  },
  vivaldi: {
    name: 'Vivaldi',
    macos: { appName: 'Vivaldi', nativeMessagingPath: ['Library', 'Application Support', 'Vivaldi', 'NativeMessagingHosts'] },
    linux: { binaries: ['vivaldi', 'vivaldi-stable'], nativeMessagingPath: ['.config', 'vivaldi', 'NativeMessagingHosts'] },
    windows: { dataPath: ['Vivaldi', 'User Data'], registryKey: 'HKCU\\Software\\Vivaldi\\NativeMessagingHosts', appPathsExe: 'vivaldi.exe' },
  },
  opera: {
    name: 'Opera',
    macos: { appName: 'Opera', nativeMessagingPath: ['Library', 'Application Support', 'com.operasoftware.Opera', 'NativeMessagingHosts'] },
    linux: { binaries: ['opera'], nativeMessagingPath: ['.config', 'opera', 'NativeMessagingHosts'] },
    windows: { dataPath: ['Opera Software', 'Opera Stable'], registryKey: 'HKCU\\Software\\Opera Software\\Opera Stable\\NativeMessagingHosts', useRoaming: true, appPathsExe: 'opera.exe' },
  },
}

export const BROWSER_DETECTION_ORDER: ChromiumBrowser[] = ['chrome', 'brave', 'arc', 'edge', 'chromium', 'vivaldi', 'opera']

export type BrowserPath = { browser: ChromiumBrowser; path: string }

function windowsAppData(spec: BrowserSpec): string {
  return spec.windows.useRoaming ? join(homedir(), 'AppData', 'Roaming') : join(homedir(), 'AppData', 'Local')
}

/** El directorio de mensajería nativa de cada navegador (≙ `G8n`). En Windows va por registro. */
export function getAllNativeMessagingHostsDirs(): BrowserPath[] {
  const platform = getPlatform()
  const dirs: BrowserPath[] = []
  for (const browser of BROWSER_DETECTION_ORDER) {
    const spec = CHROMIUM_BROWSERS[browser]
    const segments =
      platform === 'macos' ? spec.macos.nativeMessagingPath : platform === 'linux' || platform === 'wsl' ? spec.linux.nativeMessagingPath : []
    if (segments.length > 0) dirs.push({ browser, path: join(homedir(), ...segments) })
  }
  return dirs
}

/** El directorio de datos de usuario de cada navegador (divergencia declarada arriba). */
export function getAllBrowserDataPaths(): BrowserPath[] {
  if (getPlatform() === 'windows') {
    return BROWSER_DETECTION_ORDER.filter(browser => CHROMIUM_BROWSERS[browser].windows.dataPath.length > 0).map(browser => ({
      browser,
      path: join(windowsAppData(CHROMIUM_BROWSERS[browser]), ...CHROMIUM_BROWSERS[browser].windows.dataPath),
    }))
  }
  return getAllNativeMessagingHostsDirs().map(({ browser, path }) => ({ browser, path: dirname(path) }))
}

/** Las claves de registro de mensajería nativa en Windows (≙ `q8n`). */
export function getAllWindowsRegistryKeys(): Array<{ browser: ChromiumBrowser; key: string }> {
  return BROWSER_DETECTION_ORDER.filter(browser => CHROMIUM_BROWSERS[browser].windows.registryKey).map(browser => ({
    browser,
    key: CHROMIUM_BROWSERS[browser].windows.registryKey,
  }))
}

function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch (error) {
    if (!isMissing(error)) throw error
    return false
  }
}

/** El primer navegador compatible instalado, en el orden de detección (≙ `$gn`). */
export async function detectAvailableBrowser(): Promise<ChromiumBrowser | null> {
  const platform = getPlatform()
  for (const browser of BROWSER_DETECTION_ORDER) {
    const spec = CHROMIUM_BROWSERS[browser]
    let found = false
    if (platform === 'macos') {
      found = await isDirectory(`/Applications/${spec.macos.appName}.app`)
    } else if (platform === 'linux' || platform === 'wsl') {
      for (const binary of spec.linux.binaries) {
        if (await which(binary).catch(() => null)) {
          found = true
          break
        }
      }
    } else if (platform === 'windows' && spec.windows.dataPath.length > 0) {
      found = await isDirectory(join(windowsAppData(spec), ...spec.windows.dataPath))
    }
    if (found) {
      logForDebugging(`[Claude in Chrome] Detected browser: ${spec.name}`)
      return browser
    }
  }
  return null
}

const APP_PATHS_KEY = 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths'
const REG_QUERY_TIMEOUT_MS = 10_000
const APP_PATH_STAT_TIMEOUT_MS = 5_000

function systemRoot(): string {
  return process.env.SYSTEMROOT || process.env.SystemRoot || 'C:\\Windows'
}

/** El prefijo de los alias de ejecución de la Tienda, que `lstat` no sabe leer (≙ `L`). */
function windowsAppsPrefix(): string | undefined {
  if (!process.env.LOCALAPPDATA) return undefined
  const base = process.env.LOCALAPPDATA.replace(/[\\/]+$/, '')
  return win32.normalize(`${base}\\Microsoft\\WindowsApps\\`).toLowerCase()
}

/** El valor por defecto de una salida de `reg query /ve` (≙ `K`). */
function parseRegDefaultValue(stdout: string): string | null {
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s+.+?\s+REG_(?:EXPAND_)?SZ\s+(.+)$/i)
    if (match?.[1]) {
      let value = match[1].trim()
      if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      return value
    }
  }
  return null
}

/** Expande `%VAR%` sin distinguir mayúsculas (≙ `F`). */
function expandWindowsEnv(value: string, env: NodeJS.ProcessEnv = process.env): string {
  const vars = new Map<string, string>()
  for (const [name, entry] of Object.entries(env)) if (entry !== undefined) vars.set(name.toLowerCase(), entry)
  return value.replace(/%([^%]+)%/g, (whole, name: string) => vars.get(name.toLowerCase()) ?? whole)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<undefined>(resolve => {
    timer = setTimeout(() => resolve(undefined), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** La ruta de un ejecutable según App Paths, primero HKCU y luego HKLM (≙ `x`). */
async function resolveWindowsAppPath(exe: string): Promise<string | null> {
  const root = systemRoot()
  const reg = `${root}\\System32\\reg.exe`
  for (const hive of ['HKCU', 'HKLM']) {
    const result = await execFileNoThrowWithCwd(reg, ['query', `${hive}\\${APP_PATHS_KEY}\\${exe}`, '/ve'], {
      timeout: REG_QUERY_TIMEOUT_MS,
      cwd: root,
    })
    if (result.code !== 0) continue
    const raw = parseRegDefaultValue(result.stdout)
    if (!raw) {
      logForDebugging(`[Claude in Chrome] ${hive} App Paths value for ${exe} had no parseable string default; skipping`)
      continue
    }
    const candidate = expandWindowsEnv(raw)
    if (!/^(?:[a-zA-Z]:[\\/]|\\\\)/.test(candidate)) {
      logForDebugging(`[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exe}: not a fully qualified path`)
      continue
    }
    try {
      const pending = lstat(candidate)
      pending.catch(() => {})
      const info = await withTimeout(pending, APP_PATH_STAT_TIMEOUT_MS)
      if (info === undefined) {
        logForDebugging(`[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exe}: existence check exceeded ${APP_PATH_STAT_TIMEOUT_MS}ms`)
        continue
      }
      if (!info.isDirectory()) {
        logForDebugging(`[Claude in Chrome] Resolved ${exe} via ${hive} App Paths`)
        return candidate
      }
      logForDebugging(`[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exe}: resolves to a directory`)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      const storePrefix = windowsAppsPrefix()
      // Un alias de la Tienda existe aunque `lstat` falle con un código raro.
      if (storePrefix !== undefined && win32.normalize(candidate).toLowerCase().startsWith(storePrefix) && code !== 'ENOENT' && code !== 'ENOTDIR') {
        logForDebugging(`[Claude in Chrome] Resolved ${exe} via ${hive} App Paths (stat-odd: ${code ?? String(error)})`)
        return candidate
      }
      logForDebugging(`[Claude in Chrome] Skipping ${hive} App Paths candidate for ${exe}: ${code ?? String(error)}`)
    }
  }
  return null
}

/** Lanza un ejecutable desprendido; true si llegó a arrancar (≙ `y`). */
function launchDetached(file: string, args: string[]): Promise<boolean> {
  return new Promise(resolve => {
    let child
    try {
      child = spawn(file, args, { cwd: dirname(file), detached: true, stdio: 'ignore', windowsHide: false })
    } catch (error) {
      logForDebugging(`[Claude in Chrome] Detached launch of ${file} failed: ${String(error)}`, { level: 'error' })
      resolve(false)
      return
    }
    child.once('spawn', () => resolve(true))
    child.once('error', error => {
      logForDebugging(`[Claude in Chrome] Detached launch of ${file} failed: ${error.message}`, { level: 'error' })
      resolve(false)
    })
    child.unref()
  })
}

/** Abre una URL http(s) en el primer navegador compatible (≙ `wie`). */
export async function openInChrome(url: string): Promise<boolean> {
  if (!/^https?:\/\//i.test(url)) return false
  const platform = getPlatform()
  const browser = await detectAvailableBrowser()
  if (!browser) {
    logForDebugging('[Claude in Chrome] No compatible browser found')
    return false
  }
  const spec = CHROMIUM_BROWSERS[browser]
  switch (platform) {
    case 'macos':
      return (await execFileNoThrow('open', ['-a', spec.macos.appName, url])).code === 0
    case 'windows': {
      const exe = spec.windows.appPathsExe
      if (exe) {
        const resolved = await resolveWindowsAppPath(exe)
        if (resolved && (await launchDetached(resolved, [url]))) return true
      }
      return (await execFileNoThrowWithCwd('rundll32', ['url,OpenURL', url], { cwd: systemRoot() })).code === 0
    }
    case 'wsl':
    case 'linux':
      for (const binary of spec.linux.binaries) {
        if ((await execFileNoThrow(binary, [url], { useCwd: true })).code === 0) return true
      }
      return false
    default:
      return false
  }
}

function socketUserName(): string {
  try {
    return userInfo().username || 'default'
  } catch {
    return process.env.USER || process.env.USERNAME || 'default'
  }
}

function bridgeSocketName(): string {
  return `claude-mcp-browser-bridge-${socketUserName()}`
}

/** El directorio de sockets del puente, uno por usuario (≙ `kmt`). */
export function getSocketDir(): string {
  return `/tmp/${bridgeSocketName()}`
}

/** El socket de este proceso; en Windows, la tubería con nombre (≙ `Amt`). */
export function getSecureSocketPath(): string {
  if (osPlatform() === 'win32') return `\\\\.\\pipe\\${bridgeSocketName()}`
  return join(getSocketDir(), `${process.pid}.sock`)
}

/** Todos los sockets del puente vivos para este usuario (≙ `Y8n`). */
export async function getAllSocketPaths(): Promise<string[]> {
  if (osPlatform() === 'win32') return [`\\\\.\\pipe\\${bridgeSocketName()}`]
  const dir = getSocketDir()
  try {
    return (await readdir(dir)).filter(entry => entry.endsWith('.sock')).map(entry => join(dir, entry))
  } catch {
    return []
  }
}
