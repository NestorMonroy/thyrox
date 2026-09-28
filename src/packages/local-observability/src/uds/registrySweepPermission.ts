/**
 * Si esta sesión puede barrer el registro de sesiones: porte de
 * `probeRegistrySweepPermitted` (`By`, `chunk-t6pwageh.js`) y `gfn`
 * (`chunk-x5vr5vwm.js`) de 2.1.283.
 *
 * Barrer es borrar los registros de sesiones cuyo pid murió. Sólo es seguro
 * si los pids que se ven son los del anfitrión: dentro de un sandbox, un
 * contenedor o un espacio de pids propio, un pid «muerto» puede ser una
 * sesión viva de fuera.
 */
import { readdir, readlink } from 'node:fs/promises'

import { isTruthyFlag } from '@thyrox/config/entrypoint'
import { envDynamic } from '@thyrox/config/env/dynamic'
import { getPlatform } from '@thyrox/config/platform'
import { getIsInteractive } from '@thyrox/app-host/bootstrap/state.js'

/** `y`: con menos pids visibles, `/proc` es de un espacio de pids propio. */
const MIN_VISIBLE_PIDS = 16

export type SweepPermissionDeps = {
  platform: () => string
  /** `_u`. */
  isInteractive: () => boolean
  env: Record<string, string | undefined>
  pid: number
  isBubblewrapSandbox: () => boolean
  isDocker: () => Promise<boolean>
  readlink: (path: string) => Promise<string>
  readdirNames: (path: string) => Promise<string[]>
}

export const processSweepPermissionDeps: SweepPermissionDeps = {
  platform: () => getPlatform(),
  isInteractive: () => getIsInteractive(),
  get env() {
    return process.env
  },
  get pid() {
    return process.pid
  },
  isBubblewrapSandbox: () => (envDynamic.getIsBubblewrapSandbox as () => boolean)(),
  isDocker: () => (envDynamic.getIsDocker as () => Promise<boolean>)(),
  readlink: path => readlink(path),
  readdirNames: path => readdir(path),
}

/** `gfn`: en linux, `/proc/self` es este proceso y `/proc` enseña bastantes pids. */
async function procfsShowsHostPids(deps: SweepPermissionDeps): Promise<boolean> {
  const platform = deps.platform()
  if (platform !== 'linux' && platform !== 'wsl') return true
  const self = await deps.readlink('/proc/self').catch(() => null)
  if (self === null || self !== String(deps.pid)) return false
  const names = await deps.readdirNames('/proc').catch(() => null)
  if (!names) return false
  return names.filter(name => /^\d+$/.test(name)).length >= MIN_VISIBLE_PIDS
}

function isWindowsContainer(env: SweepPermissionDeps['env']): boolean {
  return env.CONTAINER_SANDBOX_MOUNT_POINT !== undefined || env.USERNAME === 'ContainerAdministrator' || env.USERNAME === 'ContainerUser'
}

/** `probeRegistrySweepPermitted`. */
export async function probeRegistrySweepPermitted(deps: SweepPermissionDeps = processSweepPermissionDeps): Promise<boolean> {
  const platform = deps.platform()
  if (platform === 'wsl') return false
  if (!deps.isInteractive() && platform !== 'windows' && platform !== 'macos') return false
  if (platform === 'windows' && isWindowsContainer(deps.env)) return false
  if (deps.isBubblewrapSandbox() || isTruthyFlag(deps.env.IS_SANDBOX) || (await deps.isDocker())) return false
  return procfsShowsHostPids(deps)
}
