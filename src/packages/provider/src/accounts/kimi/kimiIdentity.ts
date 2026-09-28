/**
 * La identidad de dispositivo con que Kimi Code firma cada petición: la
 * plataforma, la versión del CLI y el dispositivo (id, nombre, modelo y
 * versión del sistema). El id de dispositivo se declara o se persiste una
 * vez, para que el refresco use el mismo con que se concedió el grant.
 *
 * Porte de `omniroute: open-sse/config/providers/registry/kimi/coding/runtime.ts`,
 * `open-sse/utils/kimiDevice.ts` y de `getKimiDeviceId` en
 * `src/lib/oauth/providers/kimi-coding.ts` (MIT).
 */
import { randomUUID } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { type Environment, readVariable } from '../oauth/flows/clientId.ts'

const KIMI_CODE_CLI_PLATFORM = 'kimi_code_cli'
const KIMI_CODE_CLI_VERSION = '0.26.0'
const OWNER_ONLY = 0o600
const HEX_DEVICE_ID = /^[0-9a-f]{32}$/i
const UUID_GROUPS = [8, 4, 4, 4, 12]

export interface KimiDeviceIdentity {
  deviceId?: unknown
  deviceName?: unknown
  deviceModel?: unknown
  osVersion?: unknown
}

/** Sólo ASCII imprimible: una cabecera HTTP no admite otra cosa. */
export function sanitizeKimiHeaderValue(value: unknown, fallback = 'unknown'): string {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return text.replace(/[^\x20-\x7e]/g, '').trim() || fallback
}

/** Un id de 32 hexadecimales se escribe con los guiones de un UUID. */
export function normalizeKimiDeviceId(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const deviceId = sanitizeKimiHeaderValue(raw)
  if (!HEX_DEVICE_ID.test(deviceId)) return deviceId
  let offset = 0
  return UUID_GROUPS.map(size => deviceId.slice(offset, (offset += size))).join('-')
}

export function kimiCliVersion(env: Environment = process.env): string {
  return sanitizeKimiHeaderValue(readVariable(env, 'THYROX_KIMI_CLI_VERSION'), KIMI_CODE_CLI_VERSION)
}

export function buildKimiCodeIdentityHeaders(identity: KimiDeviceIdentity, version: string): Record<string, string> {
  return {
    'X-Msh-Platform': KIMI_CODE_CLI_PLATFORM,
    'X-Msh-Version': sanitizeKimiHeaderValue(version, KIMI_CODE_CLI_VERSION),
    'X-Msh-Device-Name': sanitizeKimiHeaderValue(identity.deviceName),
    'X-Msh-Device-Model': sanitizeKimiHeaderValue(identity.deviceModel),
    'X-Msh-Os-Version': sanitizeKimiHeaderValue(identity.osVersion),
    'X-Msh-Device-Id': sanitizeKimiHeaderValue(normalizeKimiDeviceId(identity.deviceId)),
  }
}

export interface SystemDescription {
  type: string
  release: string
  arch: string
  /** La versión de producto de macOS (`sw_vers -productVersion`); si falla, se usa la del núcleo. */
  macProductVersion?: () => string
}

export function kimiDeviceModel(system: SystemDescription): string {
  if (system.type === 'Darwin') {
    let productVersion = system.release
    try {
      productVersion = system.macProductVersion?.().trim() || system.release
    } catch {
      // Sin sw_vers queda la versión del núcleo.
    }
    return `macOS ${productVersion} ${system.arch}`
  }
  if (system.type === 'Windows_NT') return `Windows ${system.release} ${system.arch}`
  return `${system.type} ${system.release} ${system.arch}`.trim()
}

export interface DeviceIdSource {
  env: Environment
  /** El archivo donde se persiste el id generado. */
  path: string
  newId?: () => string
}

/** El id declarado; si no, el persistido; si no, uno nuevo que se persiste con modo 0600. */
export function resolveKimiDeviceId(source: DeviceIdSource): string {
  const declared = readVariable(source.env, 'THYROX_KIMI_CODING_DEVICE_ID')
  if (declared) return declared
  const newId = source.newId ?? randomUUID
  try {
    if (existsSync(source.path)) {
      const existing = readFileSync(source.path, 'utf8').trim()
      if (existing) return normalizeKimiDeviceId(existing)
    }
    mkdirSync(dirname(source.path), { recursive: true })
    const deviceId = newId()
    writeFileSync(source.path, deviceId, { encoding: 'utf8', mode: OWNER_ONLY })
    chmodSync(source.path, OWNER_ONLY)
    return deviceId
  } catch {
    return newId()
  }
}
