/**
 * Local-only event logger — installs a Logger that writes `event(name, meta)`
 * calls to a local jsonl file. NEVER opens a network connection.
 *
 * Audited 2026-05-07: nothing in packages/local-observability/src reaches
 * the network. Datadog / GrowthBook / Statsig stubs return early.
 * sessionDataUploader is a 3-line `() => {}` stub.
 *
 * Gate:
 *   default OFF — logEvent stays no-op so events file doesn't fill up
 *     for users who don't ask for telemetry.
 *   `THYROX_CODE_LOCAL_TELEMETRY=1` → install file-writing logger.
 *
 * Output: <config home>/telemetry/events-<YYYY-MM-DD>.jsonl, one event per
 * line as `{"ts": iso, "name": str, "metadata": obj}`. Date suffix so
 * old days can be deleted/archived without truncating in-use file.
 * `THYROX_CODE_LOCAL_TELEMETRY_DIR` overrides the directory.
 *
 * Bypasses the existing logForDebugging path because that gates on DEBUG
 * mode — events should fire whenever the env var is set, regardless of
 * whether the user is actively debugging.
 *
 * @dynamicRequire
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { resolveDataDir } from '@thyrox/config/env/configHome'
import type { EventMetadata, Logger, LocalObservability } from './contracts.js'
import { installLocalObservability } from './core.js'
import { logForDebugging } from './debug.js'

export const LOCAL_TELEMETRY_DIR_ENV = 'THYROX_CODE_LOCAL_TELEMETRY_DIR'
export const LOCAL_TELEMETRY_DATA_SUBDIR = 'telemetry'

/**
 * Directorio de los eventos: `Eo.join(Se(),"telemetry")` en el ejecutable de
 * referencia (2.1.283, `Hn()` de `chunk-t6pwageh.js`) — subdirectorio fijo
 * del hogar de configuración, no de `homedir()/.claude` a mano.
 */
export function resolveLocalTelemetryDir(env: Record<string, string | undefined> = process.env): string {
  return resolveDataDir(LOCAL_TELEMETRY_DIR_ENV, LOCAL_TELEMETRY_DATA_SUBDIR, env)
}

let eventFilePath: string | null = null
let eventFileDate: string | null = null

function getEventFilePath(): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  if (eventFilePath && eventFileDate === today) return eventFilePath
  const dir = resolveLocalTelemetryDir()
  try {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  } catch {
    // best-effort
  }
  eventFilePath = join(dir, `events-${today}.jsonl`)
  eventFileDate = today
  return eventFilePath
}

function writeEvent(name: string, metadata: EventMetadata): void {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      name,
      metadata: metadata ?? {},
    }) + '\n'
    appendFileSync(getEventFilePath(), line, { mode: 0o600 })
  } catch {
    // best-effort; never let telemetry crash the caller
  }
}

function fileLogger(): Logger {
  return {
    debug: (msg: string) => logForDebugging(msg, { level: 'debug' }),
    info: (msg: string) => logForDebugging(msg, { level: 'info' }),
    warn: (msg: string) => logForDebugging(msg, { level: 'warn' }),
    error: (msg: string) => logForDebugging(msg, { level: 'error' }),
    event: (name: string, metadata: EventMetadata) => writeEvent(name, metadata),
  }
}

/**
 * Install the local-file event logger. Called from app-host bootstrap when
 * the gate is satisfied. Idempotent — safe to call multiple times.
 */
export function installLocalEventLogger(
  override: Partial<LocalObservability> = {},
): void {
  installLocalObservability({ logger: fileLogger(), ...override })
}

/**
 * Whether the local-only telemetry gate is satisfied. Pure helper so the
 * caller can choose to skip installation entirely.
 */
export function isLocalTelemetryEnabled(): boolean {
  const v = process.env.THYROX_CODE_LOCAL_TELEMETRY
  return v === '1' || v === 'true'
}
