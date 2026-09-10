/**
 * Puerto de `ccnmt: packages/local-observability/src/localEventLogger.ts`
 * (89 líneas fuente, 100 % portado). Logger de eventos sólo-local —
 * instala un `Logger` que escribe llamadas `event(name, meta)` a un
 * archivo jsonl local. NUNCA abre una conexión de red. Sin dependencias
 * de paquete hermano.
 *
 * Gate: apagado por defecto — `logEvent` se queda no-op para que el
 * archivo de eventos no crezca para quien no pidió telemetría.
 * `CLAUDE_CODE_LOCAL_TELEMETRY=1` → instala el logger que escribe a
 * archivo.
 *
 * Salida: `~/.claude/telemetry/events-<YYYY-MM-DD>.jsonl`, un evento por
 * línea como `{"ts": iso, "name": str, "metadata": obj}`.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { EventMetadata, Logger, LocalObservability } from './contracts.js'
import { installLocalObservability } from './core.js'
import { logForDebugging } from './debug.js'

let eventFilePath: string | null = null
let eventFileDate: string | null = null

function getEventFilePath(): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  if (eventFilePath && eventFileDate === today) return eventFilePath
  const dir = join(homedir(), '.claude', 'telemetry')
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
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        name,
        metadata: metadata ?? {},
      }) + '\n'
    appendFileSync(getEventFilePath(), line, { mode: 0o600 })
  } catch {
    // best-effort; el logging nunca debe tumbar al llamador
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
 * Instala el logger de eventos de archivo local. Se llama desde el
 * bootstrap de app-host cuando el gate se satisface. Idempotente —
 * seguro de llamar varias veces.
 */
export function installLocalEventLogger(
  override: Partial<LocalObservability> = {},
): void {
  installLocalObservability({ logger: fileLogger(), ...override })
}

/**
 * Si el gate de telemetría sólo-local está satisfecho. Helper puro para
 * que el llamador pueda elegir omitir la instalación por completo.
 */
export function isLocalTelemetryEnabled(): boolean {
  const v = process.env.CLAUDE_CODE_LOCAL_TELEMETRY
  return v === '1' || v === 'true'
}
