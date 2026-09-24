/**
 * El experimento en sombra `tengu_playful_lobster` — porte de 2.1.281
 * (`chunk-mm8vme0b.js`): `isShadowExperimentOn` ≙ `mi`,
 * `shouldLogShadowPath` ≙ `Cr`, `recordShadowFired` ≙ `mr`,
 * `isHardLinkedFile` ≙ `pi`, `SHADOW_LOG_CAP` ≙ `gi`.
 *
 * Mide cuántas lecturas se permiten por modo o por directorio de trabajo
 * sobre un archivo con más de un enlace duro — una lectura así alcanza
 * contenido que también vive en otra ruta. No cambia ninguna decisión.
 *
 * Divergencia declarada: el binario guarda el conjunto de rutas ya
 * registradas por anfitrión (`fi.of(W().host)`); este árbol tiene un solo
 * anfitrión por proceso, así que el conjunto es del módulo. Los envoltorios
 * de metadato de analítica del binario (`c(...)`, `b(...)`) sólo marcan el
 * tipo del valor; aquí se pasan las cadenas tal cual.
 */
import * as nodeFs from 'node:fs'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'
import { logEvent } from '@thyrox/local-observability'

const SHADOW_LOG_CAP = 256
const loggedPaths = new Set<string>()

export type ShadowStep = 'editImpliesRead' | 'workingDir'

export function isShadowExperimentOn(): boolean {
  return getFeatureValue_CACHED_MAY_BE_STALE('tengu_playful_lobster', true)
}

export function shouldLogShadowPath(key: string): boolean {
  return loggedPaths.size < SHADOW_LOG_CAP && !loggedPaths.has(key)
}

export function recordShadowFired(path: string, step: ShadowStep, permissionMode: string | undefined): void {
  const key = `${permissionMode}:${path}`
  if (!shouldLogShadowPath(key)) return
  loggedPaths.add(key)
  logEvent('tengu_playful_lobster_fired', { step, mode: 'shadow', permissionMode })
}

export function isHardLinkedFile(path: string): boolean {
  try {
    const stat = nodeFs.statSync(path)
    return stat.isFile() && stat.nlink > 1
  } catch {
    return false
  }
}

export function resetShadowLoggedPathsForTesting(): void {
  loggedPaths.clear()
}
