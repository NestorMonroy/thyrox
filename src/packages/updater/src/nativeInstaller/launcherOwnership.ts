/**
 * Puerto de `ccnmt: packages/updater/src/nativeInstaller/launcherOwnership.ts`
 * (26 líneas fuente, 100% portado). Determina si un symlink de
 * lanzador apunta a una versión gestionada por este updater
 * ('managed'), a un binario externo ('external'), o no existe
 * ('missing').
 */

import { lstat, readlink } from 'fs/promises'
import { dirname, join, resolve, sep } from 'path'
import { getUserBinDir, getXDGDataHome } from '@thyrox/storage/xdg.js'
import { getBinaryName, getPlatform } from './platform.js'

export type LauncherOwnership = 'missing' | 'managed' | 'external'

export async function getLauncherOwnership(
  launcherPath: string,
  versionTarget: string,
): Promise<LauncherOwnership> {
  const info = await lstat(launcherPath).catch(() => null)
  if (!info) return 'missing'
  if (!info.isSymbolicLink()) return 'external'
  const target = resolve(dirname(launcherPath), await readlink(launcherPath))
  const versionsDir = resolve(dirname(versionTarget)) + sep
  return target.startsWith(versionsDir) ? 'managed' : 'external'
}

export async function getExternalLauncherPath(): Promise<string | null> {
  const launcher = join(getUserBinDir(), getBinaryName(getPlatform()))
  const target = join(getXDGDataHome(), 'ccb', 'versions', 'placeholder')
  return (await getLauncherOwnership(launcher, target)) === 'external'
    ? launcher
    : null
}
