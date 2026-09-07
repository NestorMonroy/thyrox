/**
 * Porte fiel de `ccnmt: packages/shell/src/terminal/iTermBackup.ts` —
 * respaldo y restauración del plist de preferencias de iTerm2 al
 * instalar el hook de shell de este harness.
 *
 * Porte COMPLETO: los dos símbolos exportados de la fuente
 * (`markITerm2SetupComplete`, `checkAndRestoreITerm2Backup`) están
 * presentes.
 *
 * Divergencia medida: `getGlobalConfig`/`saveGlobalConfig` se resuelven
 * vía `requireGlobalConfig()` de `../internal/pendingCrossPackageDeps.js`
 * — BLOQUEADO, ver el docstring de ese módulo. Este archivo carga sin
 * error; sólo `checkAndRestoreITerm2Backup` y `markITerm2SetupComplete`
 * lanzan si de verdad se invocan, antes de que exista la pieza real.
 *
 * @module
 */
import { copyFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logError } from '@thyrox/local-observability/log.js'
import { requireGlobalConfig } from '../internal/pendingCrossPackageDeps.js'

export function markITerm2SetupComplete(): void {
  requireGlobalConfig().saveGlobalConfig(current => ({
    ...current,
    iterm2SetupInProgress: false,
  }))
}

function getIterm2RecoveryInfo(): {
  inProgress: boolean
  backupPath: string | null
} {
  const config = requireGlobalConfig().getGlobalConfig()
  return {
    inProgress: config.iterm2SetupInProgress ?? false,
    backupPath: config.iterm2BackupPath || null,
  }
}

function getITerm2PlistPath(): string {
  return join(
    homedir(),
    'Library',
    'Preferences',
    'com.googlecode.iterm2.plist',
  )
}

type RestoreResult =
  | {
      status: 'restored' | 'no_backup'
    }
  | {
      status: 'failed'
      backupPath: string
    }

export async function checkAndRestoreITerm2Backup(): Promise<RestoreResult> {
  const { inProgress, backupPath } = getIterm2RecoveryInfo()
  if (!inProgress) {
    return { status: 'no_backup' }
  }

  if (!backupPath) {
    markITerm2SetupComplete()
    return { status: 'no_backup' }
  }

  try {
    await stat(backupPath)
  } catch {
    markITerm2SetupComplete()
    return { status: 'no_backup' }
  }

  try {
    await copyFile(backupPath, getITerm2PlistPath())

    markITerm2SetupComplete()
    return { status: 'restored' }
  } catch (restoreError) {
    logError(
      new Error(`Failed to restore iTerm2 settings with: ${restoreError}`),
    )
    markITerm2SetupComplete()
    return { status: 'failed', backupPath }
  }
}
