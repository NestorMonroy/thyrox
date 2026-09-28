/**
 * La configuración del servidor MITM: qué puerto escucha, a qué proxy local
 * reenvía y con qué clave, qué certificado presenta, cuánto registra, si
 * verifica el TLS de los upstream y con qué token publica al inspector. Y el
 * conjunto de hosts de destino: los de antigravity, que siempre están, más
 * los que `targets.json` declare por agente.
 *
 * Porte de la configuración de `omniroute: src/mitm/server.cjs` (MIT). El
 * destino y la clave son los de `@thyrox/provider/proxy/proxyEndpoint`
 * (`THYROX_PROXY_*`), la misma declaración que leen los handlers; sin clave
 * se reenvía sin `Authorization` en vez de rehusar arrancar, porque el proxy
 * local puede no exigirla. El directorio de datos es el del MITM.
 */
import fs from 'node:fs'
import path from 'node:path'

import { type ProxyEnv, proxyBaseUrl, proxyClientKey } from '@thyrox/provider/proxy/proxyEndpoint'

import { resolveMitmDataDir } from '../dataDir.ts'
import { parseVerboseLevel } from './bypass.ts'

export type MitmCertMode = 'legacy' | 'root-ca'

export interface MitmServerConfig {
  localPort: number
  dataDir: string
  routerBaseUrl: string
  apiKey: string
  certMode: MitmCertMode
  verbose: number
  disableTlsVerify: boolean
  ingestToken: string
}

const DEFAULT_LOCAL_PORT = 443

function parsePort(value: string | undefined): number {
  const port = Number.parseInt(value ?? '', 10)
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : DEFAULT_LOCAL_PORT
}

export function readMitmServerConfig(env: ProxyEnv = process.env): MitmServerConfig {
  return {
    localPort: parsePort(env.THYROX_MITM_LOCAL_PORT),
    dataDir: resolveMitmDataDir(),
    routerBaseUrl: proxyBaseUrl(env).replace(/\/+$/, ''),
    apiKey: proxyClientKey(env),
    certMode: env.THYROX_MITM_CERT_MODE === 'root-ca' ? 'root-ca' : 'legacy',
    verbose: parseVerboseLevel(env.THYROX_MITM_VERBOSE),
    disableTlsVerify: env.THYROX_MITM_DISABLE_TLS_VERIFY === '1',
    ingestToken: env.THYROX_INSPECTOR_INTERNAL_INGEST_TOKEN ?? '',
  }
}

// Los hosts de antigravity: la base que se mantiene aunque `targets.json`
// falte o esté mal formado.
const BASELINE_HOSTS = [
  'daily-cloudcode-pa.sandbox.googleapis.com',
  'daily-cloudcode-pa.googleapis.com',
  'cloudcode-pa.googleapis.com',
  'autopush-cloudcode-pa.sandbox.googleapis.com',
]

/** El nombre del archivo de destinos dinámicos, junto a los certificados. */
export const TARGETS_JSON_FILE = 'targets.json'

/**
 * Los hosts de destino y el agente de cada uno. `targets.json` tiene la forma
 * `{ targets: [{ id, hosts: string[] }] }`; un host ya presente conserva su
 * agente, y uno sin `id` queda como `unknown`.
 */
export function loadTargetHosts(targetsJsonPath: string): Map<string, string> {
  const hosts = new Map<string, string>(BASELINE_HOSTS.map(h => [h, 'antigravity']))
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(targetsJsonPath, 'utf-8'))
  } catch {
    return hosts
  }
  const targets = (parsed as { targets?: unknown } | null)?.targets
  if (!Array.isArray(targets)) return hosts
  for (const target of targets) {
    if (!target || typeof target !== 'object') continue
    const { id, hosts: list } = target as { id?: unknown; hosts?: unknown }
    const agentId = typeof id === 'string' ? id : 'unknown'
    if (!Array.isArray(list)) continue
    for (const host of list) {
      if (typeof host !== 'string' || !host) continue
      const lower = host.toLowerCase()
      if (!hosts.has(lower)) hosts.set(lower, agentId)
    }
  }
  return hosts
}

/** La ruta de `targets.json` en el directorio de datos del MITM. */
export function targetsJsonPath(dataDir: string): string {
  return path.join(dataDir, TARGETS_JSON_FILE)
}
