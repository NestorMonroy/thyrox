/**
 * Porte fiel de `ccnmt: packages/shell/src/terminal/appleTerminalBackup.ts`
 * — respaldo y restauración de las preferencias de Terminal.app
 * (`com.apple.Terminal.plist`, vía `defaults export`/`import`) al
 * instalar el hook de shell de este harness.
 *
 * Porte COMPLETO: los cinco símbolos exportados de la fuente están
 * presentes (`markTerminalSetupInProgress`, `markTerminalSetupComplete`,
 * `getTerminalPlistPath`, `backupTerminalPreferences`,
 * `checkAndRestoreTerminalBackup`).
 *
 * Divergencia medida: `getGlobalConfig`/`saveGlobalConfig` se resuelven
 * vía `requireGlobalConfig()` — BLOQUEADO, mismo caso que
 * `terminal/iTermBackup.ts` (hermano de este módulo); ver el docstring
 * de `../internal/pendingCrossPackageDeps.ts`.
 *
 * @module
 */
import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { logError } from '@thyrox/local-observability/log.js'
import { execFileNoThrow } from '../execFileNoThrow.js'
import { requireGlobalConfig } from '../internal/pendingCrossPackageDeps.js'

export function markTerminalSetupInProgress(backupPath: string): void {
  requireGlobalConfig().saveGlobalConfig(current => ({
    ...current,
    appleTerminalSetupInProgress: true,
    appleTerminalBackupPath: backupPath,
  }))
}

export function markTerminalSetupComplete(): void {
  requireGlobalConfig().saveGlobalConfig(current => ({
    ...current,
    appleTerminalSetupInProgress: false,
  }))
}

function getTerminalRecoveryInfo(): {
  inProgress: boolean
  backupPath: string | null
} {
  const config = requireGlobalConfig().getGlobalConfig()
  return {
    inProgress: config.appleTerminalSetupInProgress ?? false,
    backupPath: config.appleTerminalBackupPath || null,
  }
}

export function getTerminalPlistPath(): string {
  return join(homedir(), 'Library', 'Preferences', 'com.apple.Terminal.plist')
}

export async function backupTerminalPreferences(): Promise<string | null> {
  const terminalPlistPath = getTerminalPlistPath()
  const backupPath = `${terminalPlistPath}.bak`

  try {
    const { code } = await execFileNoThrow('defaults', [
      'export',
      'com.apple.Terminal',
      terminalPlistPath,
    ])

    if (code !== 0) {
      return null
    }

    try {
      await stat(terminalPlistPath)
    } catch {
      return null
    }

    await execFileNoThrow('defaults', [
      'export',
      'com.apple.Terminal',
      backupPath,
    ])

    markTerminalSetupInProgress(backupPath)

    return backupPath
  } catch (error) {
    logError(error)
    return null
  }
}

type RestoreResult =
  | {
      status: 'restored' | 'no_backup'
    }
  | {
      status: 'failed'
      backupPath: string
    }

export async function checkAndRestoreTerminalBackup(): Promise<RestoreResult> {
  const { inProgress, backupPath } = getTerminalRecoveryInfo()
  if (!inProgress) {
    return { status: 'no_backup' }
  }

  if (!backupPath) {
    markTerminalSetupComplete()
    return { status: 'no_backup' }
  }

  try {
    await stat(backupPath)
  } catch {
    markTerminalSetupComplete()
    return { status: 'no_backup' }
  }

  try {
    const { code } = await execFileNoThrow('defaults', [
      'import',
      'com.apple.Terminal',
      backupPath,
    ])

    if (code !== 0) {
      return { status: 'failed', backupPath }
    }

    await execFileNoThrow('killall', ['cfprefsd'])

    markTerminalSetupComplete()
    return { status: 'restored' }
  } catch (restoreError) {
    logError(
      new Error(
        `Failed to restore Terminal.app settings with: ${restoreError}`,
      ),
    )
    markTerminalSetupComplete()
    return { status: 'failed', backupPath }
  }
}
