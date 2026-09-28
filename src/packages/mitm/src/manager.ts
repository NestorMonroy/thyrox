/**
 * El gestor del MITM: arranca y detiene el proceso del servidor
 * (`server/main.ts`) con todo lo que necesita alrededor —`targets.json`,
 * `bypass.json`, el certificado y su confianza, el DNS— y publica su estado.
 *
 * Orden al arrancar: escribir los dos JSON, aplicar la CA de upstream,
 * generar o cargar el certificado del modelo activo, confiar en él y poner el
 * DNS (los dos pasos privilegiados, que se saltan sin permiso de sudo), y
 * lanzar el hijo. Un arranque que muere dentro del plazo de gracia se informa
 * con la causa que el hijo escribió en su línea `[MITM]`.
 *
 * Orden al detener: el DNS se retira ANTES de matar el proceso. Al revés, un
 * cliente cuyo DNS aún resuelve el destino a 127.0.0.1 encuentra el puerto sin
 * nadie escuchando y recibe ECONNREFUSED durante toda la ventana entre los dos
 * pasos.
 *
 * Porte de `omniroute: src/mitm/manager.ts` (MIT). Divergencias:
 * - el estado del puente se lee del store del MITM (`openMitmStateStore`), no
 *   de la base de la aplicación; los hosts de `ghe-copilot` los pasa quien
 *   tenga las conexiones de proveedor, porque thyrox aún no las registra;
 * - los archivos viven directamente en el directorio de datos del MITM, que
 *   ya es su propio subdirectorio;
 * - el hijo recibe las variables `THYROX_MITM_*` y la clave del proxy local
 *   (`THYROX_PROXY_API_KEYS`); no se fija `NODE_ENV`;
 * - el servidor de thyrox no rehúsa sin clave (reenvía sin `Authorization`),
 *   así que no hay causa «falta la clave» que interpretar; el token del
 *   inspector se hereda del entorno, porque thyrox no tiene la ruta de ingesta
 *   que la referencia importa para derivarlo;
 * - los pasos con efecto sobre el sistema (confiar en el certificado, poner el
 *   DNS, lanzar el hijo) se inyectan, para probar el ciclo sin tocarlo.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Database } from 'bun:sqlite'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

import { resolveActiveCertPath } from './cert/activeCert.ts'
import { generateCert } from './cert/generate.ts'
import { installCaCert, installCertResult } from './cert/install.ts'
import { loadOrCreateMitmCa, resolveMitmCertDir } from './cert/rootCa.ts'
import { resolveMitmDataDir } from './dataDir.ts'
import { detectAgent } from './detection/index.ts'
import {
  checkDNSEntry,
  checkDNSEntryForAgent,
  type DnsHostsFileOption,
  removeDNSEntries,
  removeDNSEntry,
} from './dns/dnsConfig.ts'
import { provisionDnsEntries } from './dns/provision.ts'
import { runPrivilegedMitmStep } from './privilegedMitmStep.ts'
import { buildRepairPlan, collectManagedHosts, performRepairSteps, type RepairPlan } from './repair.ts'
import { targetsJsonPath } from './server/serverConfig.ts'
import { getUserBypassPatterns } from './state/agentBridgeBypass.ts'
import { gheCopilotHostsFrom } from './state/gheCopilotHosts.ts'
import { openMitmStateStore } from './state/stateStore.ts'
import { removeStopDnsEntries } from './stopDnsTeardown.ts'
import { ALL_TARGETS } from './targets/index.ts'
import type { AgentId, DetectionResult, MitmTarget } from './types.ts'
import { configureUpstreamCa } from './upstreamTrust.ts'

export { buildRepairPlan, collectManagedHosts, type RepairPlan }

const PID_FILE_NAME = '.mitm.pid'
const BYPASS_JSON_FILE = 'bypass.json'
const UPSTREAM_CA_PATH_FILE = 'upstream-ca.path'
const DEFAULT_PORT = 443
const DEFAULT_STARTUP_GRACE_MS = 2000
const DEFAULT_STOP_GRACE_MS = 1000
const STDERR_TAIL_CHARS = 4000
const FAILURE_MARKER = '[MITM]'

const DEFAULT_SERVER_ENTRY = fileURLToPath(new URL('./server/main.ts', import.meta.url))

function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  logForDebugging(`[mitm-manager] ${message}`, { level })
}

function pidFile(): string {
  return path.join(resolveMitmDataDir(), PID_FILE_NAME)
}

function ensureDataDir(): string {
  const dir = resolveMitmDataDir()
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function removePidFile(): void {
  try {
    fs.unlinkSync(pidFile())
  } catch {
    // Ya no estaba.
  }
}

function readPidFile(): number | null {
  try {
    const pid = Number.parseInt(fs.readFileSync(pidFile(), 'utf-8').trim(), 10)
    return Number.isInteger(pid) && pid > 0 ? pid : null
  } catch {
    return null
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function withStore<T>(db: Database | undefined, read: (db: Database) => T): T {
  if (db) return read(db)
  const owned = openMitmStateStore()
  try {
    return read(owned)
  } finally {
    owned.close()
  }
}

/**
 * La causa de un arranque fallido, a partir del stderr del hijo. El servidor
 * escribe una sola línea `[MITM] <causa>` antes de salir; sin ella el mensaje
 * se queda genérico en vez de culpar a un puerto.
 */
export function interpretMitmStartupError(stderr: string, port: number): string {
  const text = (stderr || '').trim()
  const lower = text.toLowerCase()
  if (lower.includes('already in use')) return `MITM server failed to start: port ${port} is already in use`
  if (lower.includes('permission denied')) {
    return `MITM server failed to start: permission denied for port ${port} (run with elevated privileges, or use a port ≥ 1024)`
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith(FAILURE_MARKER)) continue
    const detail = trimmed.slice(FAILURE_MARKER.length).trim()
    if (detail) return `MITM server failed to start: ${detail}`
  }
  return 'MITM server failed to start (no diagnostic output was captured from the MITM server)'
}

let serverProcess: ChildProcess | null = null
let serverPid: number | null = null
let mitmStarting = false
let orphanedStateDetected = false
let cleanupHandlersInstalled = false
let cachedPassword: string | null = null

/** Sólo para pruebas: instala un proceso de servidor falso. */
export function __setServerProcessForTest(proc: ChildProcess | null, pid: number | null): void {
  serverProcess = proc
  serverPid = pid
}

/** Sólo para pruebas: vuelve el estado del módulo al de un proceso recién cargado. */
export function __resetMitmManagerForTest(): void {
  serverProcess = null
  serverPid = null
  mitmStarting = false
  orphanedStateDetected = false
  cachedPassword = null
}

/**
 * Toma el candado de «arrancando». Hace falta porque la comprobación de
 * «ya corre» sólo ve el proceso cuando `spawn` lo asigna, varios `await`
 * después: dos arranques simultáneos pasarían los dos.
 */
export function tryAcquireMitmStartLock(): boolean {
  if (mitmStarting) return false
  mitmStarting = true
  return true
}

export function releaseMitmStartLock(): void {
  mitmStarting = false
}

export function getCachedPassword(): string | null {
  return cachedPassword
}

export function setCachedPassword(password: string | null | undefined): void {
  cachedPassword = password || null
}

export function clearCachedPassword(): void {
  cachedPassword = null
}

/** Guarda la ruta de la CA del upstream que elige la interfaz; gana la variable de entorno. */
export function writeStoredUpstreamCaPath(caPath: string): void {
  const dir = resolveMitmDataDir()
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, UPSTREAM_CA_PATH_FILE), `${caPath}\n`)
}

function readStoredUpstreamCaPath(): string | null {
  try {
    const raw = fs.readFileSync(path.join(resolveMitmDataDir(), UPSTREAM_CA_PATH_FILE), 'utf8').trim()
    return raw || null
  } catch {
    return null
  }
}

/**
 * Escribe `targets.json`, que el servidor lee al arrancar para ampliar sus
 * hosts base. Sólo hosts declarativos: nada de rutas ni de comandos.
 */
export function writeTargetsJson(
  targets: MitmTarget[] = ALL_TARGETS,
  gheCopilotProviderData: readonly unknown[] = [],
): void {
  const dataDir = ensureDataDir()
  const gheHosts = gheCopilotHostsFrom(gheCopilotProviderData)
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    targets: targets.map(t => ({
      id: t.id,
      name: t.name,
      hosts: t.id === 'ghe-copilot' ? [...new Set([...t.hosts, ...gheHosts])] : t.hosts,
      endpointPatterns: t.endpointPatterns,
      viability: t.viability ?? 'supported',
    })),
  }
  fs.writeFileSync(targetsJsonPath(dataDir), JSON.stringify(payload, null, 2))
}

/**
 * Escribe `bypass.json` con los patrones del USUARIO: los de sin argumento
 * salen del store. Los patrones por defecto viven en el servidor, así que
 * aplican aunque el archivo falte.
 */
export function writeBypassJson(userPatterns?: string[], db?: Database): void {
  const dataDir = ensureDataDir()
  const patterns = Array.isArray(userPatterns) ? userPatterns : withStore(db, getUserBypassPatterns)
  const payload = { version: 1, generatedAt: new Date().toISOString(), patterns }
  fs.writeFileSync(path.join(dataDir, BYPASS_JSON_FILE), JSON.stringify(payload, null, 2))
}

export interface AgentStatus {
  id: AgentId
  name: string
  hosts: string[]
  viability: 'supported' | 'investigating' | 'deprecated'
  detection: DetectionResult
}

/** Cada destino registrado con su detección de instalación. Sólo lectura. */
export function getAllAgentsStatus(): AgentStatus[] {
  return ALL_TARGETS.map(t => ({
    id: t.id,
    name: t.name,
    hosts: t.hosts,
    viability: t.viability ?? 'supported',
    detection: detectAgent(t.id),
  }))
}

export interface RepairMitmDeps {
  performRepairSteps?: (sudoPassword: string) => Promise<string[]>
}

/**
 * Deshace todo lo que un arranque pudo cambiar en el sistema, sin necesitar el
 * servidor vivo: DNS, certificado y proxy del sistema (`repair.ts`), más el
 * archivo de PID y el estado de este módulo. Cada paso es idempotente.
 */
export async function repairMitm(sudoPassword: string, deps: RepairMitmDeps = {}): Promise<{ repaired: string[] }> {
  const repaired = await (deps.performRepairSteps ?? (password => performRepairSteps(password)))(sudoPassword)
  removePidFile()
  clearCachedPassword()
  orphanedStateDetected = false
  log(`repairMitm completed: ${repaired.join(', ')}`)
  return { repaired }
}

/**
 * Registra, una sola vez, la limpieza ante SIGINT/SIGTERM del proceso padre.
 * Nunca retiene la salida.
 */
export function installCleanupHandlers(): void {
  if (cleanupHandlersInstalled) return
  cleanupHandlersInstalled = true
  process.once('SIGINT', () => void handleExitCleanup('SIGINT'))
  process.once('SIGTERM', () => void handleExitCleanup('SIGTERM'))
}

export interface ExitCleanupDeps {
  getCachedPassword?: () => string | null
  removeDNSEntry?: (sudoPassword: string) => Promise<void>
  removeDNSEntries?: (hosts: string[], sudoPassword: string) => Promise<void>
  collectManagedHosts?: () => string[]
}

/**
 * Termina el hijo y, si hay contraseña guardada en esta sesión, retira el DNS
 * gestionado. Sin ella no se puede pedir una dentro de un manejador de
 * señal: se marca el estado como huérfano para que el tablero ofrezca la
 * reparación.
 */
export async function handleExitCleanup(signal: string, deps: ExitCleanupDeps = {}): Promise<void> {
  try {
    if (serverProcess && !serverProcess.killed) serverProcess.kill('SIGTERM')
  } catch {
    // El hijo ya no está.
  }
  const password = (deps.getCachedPassword ?? getCachedPassword)()
  if (!password) {
    orphanedStateDetected = true
    log(`${signal}: child terminated; no cached sudo password, run Repair if DNS/CA/proxy were applied`, 'warn')
    return
  }
  try {
    await (deps.removeDNSEntry ?? (p => removeDNSEntry(p)))(password)
    const managed = (deps.collectManagedHosts ?? (() => collectManagedHosts()))()
    if (managed.length > 0) await (deps.removeDNSEntries ?? ((h, p) => removeDNSEntries(h, p)))(managed, password)
    log(`${signal}: child terminated and managed hosts entries reverted`)
  } catch (err) {
    orphanedStateDetected = true
    log(`${signal}: hosts cleanup failed (${String(err)}); run Repair if DNS/CA/proxy were applied`, 'error')
  }
}

export interface MitmStatus {
  running: boolean
  pid: number | null
  dnsConfigured: boolean
  certExists: boolean
  orphanedStateDetected: boolean
}

function rootCaEnabled(): boolean {
  return process.env.THYROX_MITM_ROOT_CA_ENABLED === 'true'
}

/** El certificado que el modelo vigente instala: la CA o la hoja heredada. */
export function activeCertPath(): string {
  return resolveActiveCertPath(resolveMitmDataDir(), rootCaEnabled()).certPath
}

/**
 * El estado del MITM. El servidor cuenta si hay proceso en memoria o un
 * archivo de PID con un proceso vivo; un PID muerto se borra y marca el estado
 * huérfano (no hay contraseña en una lectura de estado para limpiar). El DNS se
 * comprueba contra los hosts del agente pedido, o los de antigravity sin él.
 */
export async function getMitmStatus(agentId?: string, dnsOptions?: DnsHostsFileOption): Promise<MitmStatus> {
  let running = serverProcess !== null && !serverProcess.killed
  let pid = serverPid
  if (!running) {
    const saved = readPidFile()
    if (saved !== null && isProcessAlive(saved)) {
      running = true
      pid = saved
    } else if (fs.existsSync(pidFile())) {
      removePidFile()
      orphanedStateDetected = true
      log('stale MITM PID file found; system state may be orphaned (offer Repair)', 'warn')
    }
  }

  let dnsConfigured = false
  try {
    dnsConfigured = agentId ? checkDNSEntryForAgent(agentId, dnsOptions) : checkDNSEntry(dnsOptions)
  } catch {
    // Sin archivo de hosts legible, el DNS no está puesto.
  }

  const certExists = fs.existsSync(activeCertPath())
  return { running, pid, dnsConfigured, certExists, orphanedStateDetected }
}

type CertMode = 'legacy' | 'root-ca'

export interface MitmStartDeps {
  db?: Database
  gheCopilotProviderData?: readonly unknown[]
  /** El guion del servidor que se lanza con el mismo ejecutable. */
  serverEntry?: string
  startupGraceMs?: number
  installCert?: (sudoPassword: string, certPath: string, mode: CertMode) => Promise<{ installed: boolean; reason?: string }>
  provisionDns?: (sudoPassword: string) => Promise<void>
  runPrivilegedStep?: typeof runPrivilegedMitmStep
}

export interface MitmStartResult {
  running: true
  pid: number | null
  certTrusted: boolean
}

/**
 * Arranca el MITM. Rehúsa si ya corre, o si otro arranque está en vuelo; el
 * candado se toma antes del primer `await` y se suelta en el `finally`.
 */
export async function startMitm(
  apiKey: string,
  sudoPassword: string,
  options: { port?: number } = {},
  deps: MitmStartDeps = {},
): Promise<MitmStartResult> {
  if (serverProcess && !serverProcess.killed) throw new Error('MITM proxy is already running')
  if (!tryAcquireMitmStartLock()) throw new Error('MITM server is already starting')
  try {
    return await startMitmInternal(apiKey, sudoPassword, options, deps)
  } finally {
    releaseMitmStartLock()
  }
}

function resolvePort(port: number | undefined): number {
  return typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_PORT
}

/**
 * La CA del upstream: la variable de entorno gana a la ruta que la interfaz
 * guardó en `upstream-ca.path`; sin ninguna, `null`.
 */
export function resolveUpstreamCaPath(
  env: NodeJS.ProcessEnv = process.env,
  readStored: () => string | null = readStoredUpstreamCaPath,
): string | null {
  return env.THYROX_MITM_UPSTREAM_CA_CERT || readStored() || null
}

/** Aplica la CA; una ruta inválida se registra y el arranque sigue sin ella. */
export function applyUpstreamCa(caPath: string | null = resolveUpstreamCaPath(), report: typeof log = log): void {
  if (!caPath) return
  try {
    configureUpstreamCa(caPath)
    report(`upstream CA certificate configured: ${caPath}`)
  } catch (err) {
    report(`upstream CA path invalid (continuing without custom CA): ${String(err)}`, 'error')
  }
}

async function prepareCertificate(): Promise<{ certPath: string; mode: CertMode }> {
  const certDir = resolveMitmCertDir()
  const { mode } = resolveActiveCertPath(certDir, rootCaEnabled())
  if (mode === 'use-legacy-leaf') {
    const certPath = path.join(resolveMitmDataDir(), 'server.crt')
    if (!fs.existsSync(certPath)) await generateCert()
    return { certPath, mode: 'legacy' }
  }
  const ca = await loadOrCreateMitmCa(certDir)
  return { certPath: ca.certPath, mode: 'root-ca' }
}

function defaultInstallCert(sudoPassword: string, certPath: string, mode: CertMode) {
  return mode === 'root-ca' ? installCaCert(sudoPassword, certPath) : installCertResult(sudoPassword, certPath)
}

async function startMitmInternal(
  apiKey: string,
  sudoPassword: string,
  options: { port?: number },
  deps: MitmStartDeps,
): Promise<MitmStartResult> {
  installCleanupHandlers()
  const runPrivileged = deps.runPrivilegedStep ?? runPrivilegedMitmStep

  try {
    writeTargetsJson(ALL_TARGETS, deps.gheCopilotProviderData)
  } catch (err) {
    log(`failed to write targets.json (continuing): ${String(err)}`, 'error')
  }
  try {
    writeBypassJson(undefined, deps.db)
  } catch (err) {
    log(`failed to write bypass.json (continuing): ${String(err)}`, 'error')
  }
  applyUpstreamCa()

  const { certPath, mode } = await prepareCertificate()

  // La confianza del certificado no puede abortar el arranque: en un
  // contenedor el almacén del sistema no se escribe, y el puente arranca sin
  // confianza para que el operador confíe a mano.
  let certTrusted = false
  await runPrivileged(sudoPassword, 'Skipping MITM cert trust — no sudo password available', async () => {
    try {
      const result = await (deps.installCert ?? defaultInstallCert)(sudoPassword, certPath, mode)
      certTrusted = result.installed
      if (!result.installed) log(`MITM cert not auto-trusted (${result.reason ?? 'unknown'}); manual trust required`, 'warn')
    } catch (err) {
      log(`certificate trust threw unexpectedly (continuing): ${String(err)}`, 'error')
    }
  })

  await runPrivileged(sudoPassword, 'Skipping DNS provisioning — no sudo password available', async () => {
    try {
      await (deps.provisionDns ?? (p => provisionDnsEntries(p, { db: deps.db })))(sudoPassword)
    } catch (err) {
      log(`DNS provisioning threw unexpectedly (continuing): ${String(err)}`, 'error')
    }
  })

  const port = resolvePort(options.port)
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    THYROX_MITM_LOCAL_PORT: String(port),
    THYROX_MITM_CERT_MODE: mode,
  }
  if (apiKey) env.THYROX_PROXY_API_KEYS = apiKey

  const proc = spawn(process.execPath, [deps.serverEntry ?? DEFAULT_SERVER_ENTRY], {
    windowsHide: true,
    env,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  serverProcess = proc
  serverPid = proc.pid ?? null
  if (serverPid !== null) {
    try {
      fs.writeFileSync(pidFile(), String(serverPid))
    } catch (err) {
      log(`failed to write MITM PID file (continuing): ${String(err)}`, 'error')
    }
  }

  let stderrTail = ''
  proc.stdout?.on('data', (data: Buffer) => log(`server: ${data.toString().trim()}`))
  proc.stderr?.on('data', (data: Buffer) => {
    const chunk = data.toString()
    stderrTail = (stderrTail + chunk).slice(-STDERR_TAIL_CHARS)
    log(`server: ${chunk.trim()}`, 'error')
  })
  proc.on('exit', code => {
    log(`MITM server exited with ${code}`)
    if (serverProcess === proc) {
      serverProcess = null
      serverPid = null
    }
    removePidFile()
  })

  // Sigue vivo al cumplirse el plazo de gracia: arrancó. Se cierra antes (con
  // stderr ya drenado) o escribe su línea de fallo: no arrancó.
  const started = await new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(true), deps.startupGraceMs ?? DEFAULT_STARTUP_GRACE_MS)
    const fail = () => {
      clearTimeout(timer)
      resolve(false)
    }
    proc.once('close', fail)
    proc.stderr?.on('data', (data: Buffer) => {
      if (data.toString().includes(FAILURE_MARKER)) proc.once('exit', fail)
    })
  })
  if (!started) throw new Error(interpretMitmStartupError(stderrTail, port))

  return { running: true, pid: serverPid, certTrusted }
}

function waitForExit(proc: ChildProcess, ms: number): Promise<void> {
  if (proc.exitCode !== null || proc.signalCode !== null) return Promise.resolve()
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms)
    proc.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

async function killServerProcessOnStop(graceMs: number): Promise<void> {
  const proc = serverProcess
  if (proc && !proc.killed) {
    log('stopping MITM server')
    proc.kill('SIGTERM')
    await waitForExit(proc, graceMs)
    if (proc.exitCode === null && proc.signalCode === null && typeof proc.pid === 'number') proc.kill('SIGKILL')
  } else {
    const saved = readPidFile()
    if (saved !== null && isProcessAlive(saved)) {
      log(`killing MITM server by PID ${saved}`)
      try {
        process.kill(saved, 'SIGTERM')
        await new Promise(resolve => setTimeout(resolve, graceMs))
        if (isProcessAlive(saved)) process.kill(saved, 'SIGKILL')
      } catch {
        // Terminó entre la comprobación y la señal.
      }
    }
  }
  serverProcess = null
  serverPid = null
}

export interface MitmStopDeps {
  removeDNSEntry?: (sudoPassword: string) => Promise<void>
  removeDNSEntries?: (hosts: string[], sudoPassword: string) => Promise<void>
  collectManagedHosts?: () => string[]
  runPrivilegedStep?: typeof runPrivilegedMitmStep
  stopGraceMs?: number
}

/**
 * Detiene el MITM: primero el DNS (ver la cabecera del módulo), después el
 * proceso —el de memoria o el del archivo de PID—, y al final la contraseña
 * guardada y el archivo de PID.
 */
export async function stopMitm(sudoPassword: string, deps: MitmStopDeps = {}): Promise<{ running: false; pid: null }> {
  const teardown = {
    removeDNSEntry: deps.removeDNSEntry ?? ((p: string) => removeDNSEntry(p)),
    removeDNSEntries: deps.removeDNSEntries ?? ((h: string[], p: string) => removeDNSEntries(h, p)),
    collectManagedHosts: deps.collectManagedHosts ?? (() => collectManagedHosts()),
  }
  await (deps.runPrivilegedStep ?? runPrivilegedMitmStep)(
    sudoPassword,
    'Skipping DNS teardown — no sudo password available',
    () => removeStopDnsEntries(teardown, sudoPassword),
  )
  await killServerProcessOnStop(deps.stopGraceMs ?? DEFAULT_STOP_GRACE_MS)
  clearCachedPassword()
  removePidFile()
  return { running: false, pid: null }
}
