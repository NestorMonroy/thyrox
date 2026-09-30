/**
 * El aprovisionamiento DNS del AgentBridge: los hosts por defecto de
 * antigravity, los de cada agente con `dns_enabled` y los hosts propios
 * activados. Cada paso es de mejor esfuerzo: un fallo se registra con su
 * error completo —que lleva el stderr del comando privilegiado— y nunca
 * detiene el arranque del puente ni los pasos siguientes.
 *
 * Porte de `omniroute: src/mitm/dns/provision.ts` (MIT). La bandera de salida
 * es `THYROX_MITM_SKIP_ANTIGRAVITY_DNS`; el estado se lee del store del
 * AgentBridge (`deps.db`, o el del directorio de datos del MITM si no se
 * inyecta), y el registro por defecto va a `logForDebugging`.
 */
import type { Database } from 'bun:sqlite'

import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

import { getAllAgentBridgeStates } from '../state/agentBridgeState.ts'
import { listCustomHosts } from '../state/inspectorCustomHosts.ts'
import { openMitmStateStore } from '../state/stateStore.ts'
import { isRoot, isSudoAvailable } from '../systemCommands.ts'
import { ALL_TARGETS } from '../targets/index.ts'
import { addDNSEntries, addDNSEntry } from './dnsConfig.ts'

export interface DnsProvisionLogger {
  error: (payload: unknown, msg: string) => void
  info: (payload: unknown, msg?: string) => void
}

type AgentDnsState = { agent_id: string; dns_enabled: boolean }
type CustomHost = { host: string }

export interface DnsProvisionDeps {
  addDefaultDns?: (sudoPassword: string) => Promise<void>
  addHostsDns?: (hosts: string[], sudoPassword: string) => Promise<void>
  getAgentStates?: () => AgentDnsState[]
  listEnabledCustomHosts?: () => CustomHost[]
  /** ¿Se puede escribir el archivo hosts? (sudo instalado o root). */
  canElevate?: () => boolean
  /** El store del AgentBridge del que leen los lectores por defecto. */
  db?: Database
  logger?: DnsProvisionLogger
}

type ResolvedDeps = Required<Omit<DnsProvisionDeps, 'canElevate' | 'db'>>

function describe(payload: unknown, msg?: string): string {
  if (typeof payload === 'string') return payload
  const err = (payload as { err?: unknown } | null)?.err
  const detail = err === undefined ? JSON.stringify(payload) : errorMessage(err)
  return msg ? `${msg}: ${detail}` : detail
}

const defaultLogger: DnsProvisionLogger = {
  error: (payload, msg) => logForDebugging(`[mitm-dns-provision] ${describe(payload, msg)}`, { level: 'error' }),
  info: (payload, msg) => logForDebugging(`[mitm-dns-provision] ${describe(payload, msg)}`, { level: 'info' }),
}

async function provisionDefaultDns(sudoPassword: string, deps: ResolvedDeps): Promise<void> {
  try {
    await deps.addDefaultDns(sudoPassword)
  } catch (err) {
    deps.logger.error({ err }, 'Failed to add default DNS entries (continuing)')
  }
}

async function provisionAgentDns(sudoPassword: string, deps: ResolvedDeps): Promise<void> {
  try {
    const hosts: string[] = []
    for (const state of deps.getAgentStates()) {
      if (!state.dns_enabled) continue
      const target = ALL_TARGETS.find(t => t.id === state.agent_id)
      if (target) hosts.push(...target.hosts)
    }
    if (hosts.length > 0) {
      deps.logger.info({ count: hosts.length }, 'Adding DNS for agent host(s)...')
      await deps.addHostsDns(hosts, sudoPassword)
    }
  } catch (err) {
    deps.logger.error({ err }, 'Failed to add agent DNS entries (continuing)')
  }
}

async function provisionCustomHostsDns(sudoPassword: string, deps: ResolvedDeps): Promise<void> {
  try {
    const hosts = deps.listEnabledCustomHosts().map(h => h.host)
    if (hosts.length > 0) {
      deps.logger.info({ count: hosts.length }, 'Adding DNS for custom host(s)...')
      await deps.addHostsDns(hosts, sudoPassword)
    }
  } catch (err) {
    deps.logger.error({ err }, 'Failed to add custom host DNS entries (continuing)')
  }
}

/**
 * Aprovisiona todas las entradas DNS del AgentBridge, paso a paso y sin
 * propagar fallos. Con la bandera de salida, o sin forma de elevar (un
 * contenedor sin sudo ni root), no intenta ninguno y lo dice.
 */
export async function provisionDnsEntries(sudoPassword: string, deps: DnsProvisionDeps = {}): Promise<void> {
  const canElevate = deps.canElevate ?? (() => isSudoAvailable() || isRoot())
  const logger = deps.logger ?? defaultLogger

  if (process.env.THYROX_MITM_SKIP_ANTIGRAVITY_DNS === 'true') {
    logger.info('Skipping DNS entries - THYROX_MITM_SKIP_ANTIGRAVITY_DNS=true')
    return
  }
  if (!canElevate()) {
    logger.info('Skipping DNS entries - sudo not available and not running as root (likely a container)')
    return
  }

  // El store sólo se abre si algún lector por defecto lo necesita, y se cierra
  // al terminar si lo abrió este llamado.
  const needsStore = !deps.getAgentStates || !deps.listEnabledCustomHosts
  const ownedDb = needsStore && !deps.db ? openMitmStateStore() : null
  const db = deps.db ?? ownedDb
  try {
    const resolved: ResolvedDeps = {
      addDefaultDns: deps.addDefaultDns ?? (password => addDNSEntry(password)),
      addHostsDns: deps.addHostsDns ?? ((hosts, password) => addDNSEntries(hosts, password)),
      getAgentStates: deps.getAgentStates ?? (() => getAllAgentBridgeStates(db!)),
      listEnabledCustomHosts: deps.listEnabledCustomHosts ?? (() => listCustomHosts(db!, { enabledOnly: true })),
      logger,
    }
    await provisionDefaultDns(sudoPassword, resolved)
    await provisionAgentDns(sudoPassword, resolved)
    await provisionCustomHostsDns(sudoPassword, resolved)
  } finally {
    ownedDb?.close()
  }
}
