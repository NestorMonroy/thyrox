/**
 * Puerto de `ccnmt: packages/memory/src/consolidationLock.ts` (verbatim).
 *
 * Rastreador delgado de "última corrida de /dream" — usado solo por la UI
 * de `/memory` para mostrar "corrió por última vez hace X" (y por
 * `/dream consolidate` para refrescar ese mtime).
 *
 * Historia: ccb originalmente usaba un lock cross-proceso más completo
 * (acquire/rollback) para condicionar los disparos de autoDream en el
 * stop-hook. Ese autoDream se eliminó cuando `/dream` pasó a programarse
 * por cron (subsistema 1 de KAIROS). Upstream v2.1.123 conservó solo estas
 * dos funciones por la misma razón de UI; ccb ahora coincide con upstream —
 * solo sobreviven `recordConsolidation` (escribe mtime) y
 * `readLastConsolidatedAt` (lee mtime). El nombre de archivo
 * `.consolidate-lock` se preserva para que quienes actualicen desde un ccb
 * pre-KAIROS conserven su timestamp de última corrida.
 */

import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getMemoryHostBindings } from './host.js'
import { getAutoMemPath } from './paths.js'

const LOCK_FILE = '.consolidate-lock'

function lockPath(): string {
  return join(getAutoMemPath(), LOCK_FILE)
}

export async function readLastConsolidatedAt(): Promise<number> {
  try {
    const s = await stat(lockPath())
    return s.mtimeMs
  } catch {
    return 0
  }
}

export async function recordConsolidation(): Promise<void> {
  const bindings = getMemoryHostBindings()
  try {
    await mkdir(getAutoMemPath(), { recursive: true })
    await writeFile(lockPath(), String(process.pid))
  } catch (e: unknown) {
    bindings.logDebug?.(
      `[dream] recordConsolidation write failed: ${(e as Error).message}`,
    )
  }
}
