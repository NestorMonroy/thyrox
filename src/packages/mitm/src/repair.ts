/**
 * La reparación del MITM: deshace todo lo que el arranque cambió en el
 * sistema —las entradas DNS de cada host que pudo desviar, la confianza en
 * sus certificados y el proxy del sistema— sin tocar el estado en memoria
 * del gestor. Cada paso es de mejor esfuerzo y la función devuelve los que
 * completó.
 *
 * Porte de `omniroute: src/mitm/repair.ts` (MIT). Diferencias:
 *  - retira la confianza de los dos certificados que haya en el directorio
 *    del MITM, la CA raíz (`ca.crt`) y la hoja (`server.crt`): con el modelo
 *    de CA lo instalado es `ca.crt`, y quitar sólo `server.crt` la dejaba
 *    confiada;
 *  - los hosts propios salen del store del AgentBridge (`deps.db`, o el del
 *    directorio de datos si no se inyecta), y los de GitHub Enterprise de los
 *    datos de proveedor que el llamador pase: thyrox aún no tiene registro de
 *    conexiones;
 *  - la reversión del proxy se importa estática, y cada paso del sistema se
 *    puede inyectar.
 */
import type { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'

import { errorMessage } from '@thyrox/local-observability/errorHelpers.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'

import { uninstallCert } from './cert/install.ts'
import { resolveMitmCertDir } from './cert/rootCa.ts'
import { removeDNSEntries, removeDNSEntry } from './dns/dnsConfig.ts'
import { clearSystemProxy, getSystemProxyState } from './inspector/captureState.ts'
import { revert } from './inspector/systemProxyConfig.ts'
import { gheCopilotHostsFrom } from './state/gheCopilotHosts.ts'
import { listCustomHosts } from './state/inspectorCustomHosts.ts'
import { openMitmStateStore } from './state/stateStore.ts'
import { ALL_TARGETS } from './targets/index.ts'

// Los certificados que el MITM pudo instalar, en el orden en que se retiran.
const TRUSTED_CERT_FILES = ['ca.crt', 'server.crt']

export interface ManagedHostsSource {
  /** El store del AgentBridge; sin él se abre el del directorio de datos. */
  db?: Database
  /** `provider_specific_data` de las conexiones `ghe-copilot` activas. */
  gheCopilotProviderData?: readonly unknown[]
}

function logError(message: string, err: unknown): void {
  logForDebugging(`[mitm-repair] ${message}: ${errorMessage(err)}`, { level: 'error' })
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
 * Todos los hosts que el MITM pudo escribir en el archivo hosts. Es un
 * conjunto de más a propósito: retirar un host ausente no cuesta nada, y
 * olvidar uno deja el desvío en toda la máquina.
 */
export function collectManagedHosts(source: ManagedHostsSource = {}): string[] {
  const hosts = new Set<string>()
  for (const target of ALL_TARGETS) {
    for (const host of target.hosts) hosts.add(host)
    if (target.id === 'ghe-copilot') {
      for (const host of gheCopilotHostsFrom(source.gheCopilotProviderData ?? [])) hosts.add(host)
    }
  }
  try {
    for (const custom of withStore(source.db, db => listCustomHosts(db))) hosts.add(custom.host)
  } catch (err) {
    logError('collectManagedHosts: failed to read custom hosts (continuing)', err)
  }
  return [...hosts]
}

export interface RepairPlan {
  dnsHostsToRemove: string[]
  removeCert: boolean
  revertSystemProxy: boolean
}

/** Qué debe deshacer una reparación, sin tocar el sistema. */
export function buildRepairPlan(source: ManagedHostsSource = {}): RepairPlan {
  return { dnsHostsToRemove: collectManagedHosts(source), removeCert: true, revertSystemProxy: true }
}

/**
 * Revierte el proxy del sistema si se aplicó en este proceso: el estado
 * anterior vive en memoria, así que tras una caída ya no hay qué revertir.
 */
async function revertSystemProxyIfApplied(): Promise<boolean> {
  try {
    const state = getSystemProxyState()
    if (!state.applied || !state.previousState) return false
    await revert(state.previousState)
    clearSystemProxy()
    return true
  } catch (err) {
    logError('revertSystemProxyIfApplied failed (continuing)', err)
    return false
  }
}

export interface RepairDeps extends ManagedHostsSource {
  certDir?: string
  removeDNSEntry?: (sudoPassword: string) => Promise<void>
  removeDNSEntries?: (hosts: string[], sudoPassword: string) => Promise<void>
  uninstallCert?: (sudoPassword: string, certPath: string) => Promise<void>
  revertSystemProxy?: () => Promise<boolean>
}

export async function performRepairSteps(sudoPassword: string, deps: RepairDeps = {}): Promise<string[]> {
  const plan = buildRepairPlan(deps)
  const repaired: string[] = []

  try {
    await (deps.removeDNSEntry ?? (password => removeDNSEntry(password)))(sudoPassword)
    if (plan.dnsHostsToRemove.length > 0) {
      await (deps.removeDNSEntries ?? ((hosts, password) => removeDNSEntries(hosts, password)))(
        plan.dnsHostsToRemove,
        sudoPassword,
      )
    }
    repaired.push('dns')
  } catch (err) {
    logError('repairMitm: DNS cleanup failed (continuing)', err)
  }

  if (plan.removeCert) {
    const certDir = deps.certDir ?? resolveMitmCertDir()
    const untrust = deps.uninstallCert ?? ((password, certPath) => uninstallCert(password, certPath))
    let removed = false
    for (const file of TRUSTED_CERT_FILES) {
      const certPath = path.join(certDir, file)
      if (!fs.existsSync(certPath)) continue
      try {
        await untrust(sudoPassword, certPath)
        removed = true
      } catch (err) {
        logError(`repairMitm: removal of ${file} failed (continuing)`, err)
      }
    }
    if (removed) repaired.push('cert')
  }

  if (plan.revertSystemProxy && (await (deps.revertSystemProxy ?? revertSystemProxyIfApplied)())) {
    repaired.push('system-proxy')
  }
  return repaired
}
