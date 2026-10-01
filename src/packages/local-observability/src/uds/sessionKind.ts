/**
 * Qué clase de sesión es ésta según su entorno y su anfitrión: interactiva,
 * de fondo o de demonio; si la maneja otro proceso; y en qué directorio vive
 * su trabajo de fondo.
 *
 * Porte de `oJ`, `vt`, `fm`, `Ip`, `tc`, `tz`, `jte`, `NNr` y `qKn`
 * (`chunk-t6pwageh.js`) de 2.1.283. La toma de control de un trabajo (`fb`,
 * del estado de worktree), el puente del REPL (`Ul`), el teammate declarado
 * por extensión (`dR`) y el adjuntador (`md`) viven en otros paquetes: llegan
 * por `configureSessionKindHost`.
 */
import { basename, join } from 'node:path'

import { getConfigHomeDir } from '@thyrox/config/env/configHome'

import { isValidPathSegment, storageKeys } from '../storageKeys.ts'

export type SessionKind = 'bg' | 'daemon' | 'daemon-worker'
export type BackgroundTakeover = { jobDir?: string }

export type SessionKindHost = {
  env: Record<string, string | undefined>
  configHome: () => string
  /** `fb`. */
  bgTakeover: () => BackgroundTakeover | null
  /** `Ul`. */
  replBridgeActive: () => boolean
  /** `dR`. */
  teammateAgentId: () => string | undefined
  /** `md`. */
  attacherCaps: () => unknown
}

export const processSessionKindHost: SessionKindHost = {
  get env() {
    return process.env
  },
  configHome: getConfigHomeDir,
  bgTakeover: () => null,
  replBridgeActive: () => false,
  teammateAgentId: () => undefined,
  attacherCaps: () => undefined,
}

/** Instala las lecturas que otros paquetes aportan al anfitrión del proceso. */
export function configureSessionKindHost(parts: Partial<Omit<SessionKindHost, 'env'>>): void {
  Object.assign(processSessionKindHost, parts)
}

/** `oJ`. */
export function sessionKind(host: SessionKindHost = processSessionKindHost): SessionKind | undefined {
  const kind = host.env.THYROX_CODE_SESSION_KIND
  if (kind === 'bg' || kind === 'daemon' || kind === 'daemon-worker') return kind
  return undefined
}

/** `vt`. */
export function isBackgroundSession(host: SessionKindHost = processSessionKindHost): boolean {
  return sessionKind(host) === 'bg'
}

/** `fm`: la sesión la maneja otro proceso — el puente del REPL, el trabajo de fondo o un líder. */
export function isRemoteDrivenSession(host: SessionKindHost = processSessionKindHost): boolean {
  return host.replBridgeActive() || isBackgroundSession(host) || host.teammateAgentId() !== undefined
}

/** `Ip`: sesión de fondo sin nadie adjunto. */
export function isDetachedBackgroundSession(host: SessionKindHost = processSessionKindHost): boolean {
  return isBackgroundSession(host) && !host.attacherCaps()
}

/** `tc`. */
export function hasBackgroundJob(host: SessionKindHost = processSessionKindHost): boolean {
  return isBackgroundSession(host) || host.bgTakeover() !== null
}

/** `tz`. */
export function currentJobDir(host: SessionKindHost = processSessionKindHost): string | undefined {
  return host.bgTakeover()?.jobDir ?? host.env.THYROX_JOB_DIR
}

/** `jte`. */
export function usesDaemonBackend(host: SessionKindHost = processSessionKindHost): boolean {
  return host.env.THYROX_BG_BACKEND === 'daemon'
}

/** `NNr`. */
export function jobsRootDir(host: SessionKindHost = processSessionKindHost): string {
  return join(host.configHome(), 'jobs')
}

/** `qKn`: la clave de storage de un archivo del trabajo, si su directorio cuelga de la raíz de trabajos. */
export function jobStorageKey(jobDir: string, relPath: readonly string[], host: SessionKindHost = processSessionKindHost) {
  const jobId = basename(jobDir)
  if (!isValidPathSegment(jobId) || jobDir !== join(jobsRootDir(host), jobId)) return undefined
  return storageKeys.job(jobId, relPath)
}
