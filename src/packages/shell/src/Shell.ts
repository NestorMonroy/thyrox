import {
  createPsProviderFactory,
  createShellConfigFactory,
  exec as execWithShellPackage,
  findSuitableShell as findSuitableShellWithPackage,
  MAX_TASK_OUTPUT_BYTES,
  setCreateTaskOutputFn,
  setGetSandboxTmpDirNameFn,
  type ExecOptions,
  type ExecResult,
  type ShellCommand,
  type ShellConfig,
  type ShellExecContext,
  type ShellProvider,
  type ShellType,
  type TaskOutputPort,
} from './index.js'
import memoize from 'lodash-es/memoize.js'
import { isAbsolute, resolve } from 'path'
import { getOriginalCwd, getSessionId, setCwdState } from '@thyrox/app-host/bootstrap/state.js'
import { generateTaskId } from '@thyrox/tool-registry/Task.js'
import { pwd } from '@thyrox/app-host/bootstrap/cwd.js'
import { logForDebugging } from '@thyrox/local-observability/debug.js'
import { isENOENT } from '@thyrox/local-observability/errorHelpers.js'
import { getFsImplementation } from '@thyrox/storage/fsOperations.js'
import { onCwdChangedForHooks } from '@thyrox/agent/fileChangedWatcher.js'
import { getClaudeTempDirName } from '@thyrox/permission/filesystem'
import { getPlatform } from '@thyrox/config/platform'
import { logEvent } from '@thyrox/local-observability'
import { SandboxManager } from './sandbox/sandbox-adapter.js'
import { invalidateSessionEnvCache } from '@thyrox/storage/sessionEnvironment.js'
import { getSessionEnvironmentScript } from '@thyrox/storage/sessionEnvironment.js'
import { getSessionEnvVars } from '@thyrox/storage/sessionEnvVars.js'
import { getTaskOutputDir } from '@thyrox/storage/task/diskOutput.js'
import { TaskOutput } from '@thyrox/tool-registry/task/TaskOutput.js'
import { ensureSocketInitialized, getClaudeTmuxEnv, hasTmuxToolBeenUsed } from './terminal/tmuxSocket.js'
import { which } from './which.js'

setCreateTaskOutputFn(
  (
    taskId: string,
    onProgress: ((...args: unknown[]) => void) | null,
    stdoutToFile: boolean,
  ): TaskOutputPort =>
    new TaskOutput(
      taskId,
      onProgress,
      stdoutToFile,
    ),
)
setGetSandboxTmpDirNameFn(getClaudeTempDirName)

function getPlatformForShellExecContext(): 'macos' | 'linux' | 'windows' {
  const platform = getPlatform()
  // `Platform` admite 'wsl' y 'unknown'; ShellExecContext sólo distingue las
  // tres que su único consumidor compara contra 'windows'
  // (bash/ShellSnapshot.ts) — wsl y desconocido ya caen hoy en esa misma
  // rama, así que tratarlas como 'linux' aquí no cambia esa comparación.
  return platform === 'macos' || platform === 'windows' ? platform : 'linux'
}

function createShellExecContext(): ShellExecContext {
  return {
    getCwd: pwd,
    setCwd: setCwdState,
    getOriginalCwd,
    getSessionId,
    logEvent,
    logForDebugging,
    getSessionEnvVars,
    getSessionEnvironmentScript: async () => (await getSessionEnvironmentScript()) ?? '',
    wrapWithSandbox: (cmd, shell, _tmpDir, signal) =>
      SandboxManager.wrapWithSandbox(cmd, shell, undefined, signal),
    cleanupAfterSandbox: () => SandboxManager.cleanupAfterCommand(),
    onCwdChanged: onCwdChangedForHooks,
    getTmuxEnv: async () => getClaudeTmuxEnv(),
    ensureTmuxSocket: ensureSocketInitialized,
    hasTmuxToolBeenUsed,
    getPlatform: getPlatformForShellExecContext,
    which,
    invalidateSessionEnvCache,
    getTaskOutputDir,
    generateTaskId,
    getMaxTaskOutputBytes: () => MAX_TASK_OUTPUT_BYTES,
    getSandboxTmpDirName: getClaudeTempDirName,
  }
}

const getShellConfigFactory = createShellConfigFactory(createShellExecContext())
const getPsProviderFactory = createPsProviderFactory(createShellExecContext())

export async function findSuitableShell(): Promise<string> {
  return findSuitableShellWithPackage(which)
}

export const getShellConfig = memoize(async (): Promise<ShellConfig> =>
  getShellConfigFactory(),
)

export const getPsProvider = memoize(async (): Promise<ShellProvider> =>
  getPsProviderFactory(),
)

export async function exec(
  command: string,
  abortSignal: AbortSignal,
  shellType: ShellType,
  options?: ExecOptions,
): Promise<ShellCommand> {
  return execWithShellPackage(
    command,
    abortSignal,
    shellType,
    createShellExecContext(),
    options,
  )
}

export function setCwd(path: string, relativeTo?: string): void {
  const absolute = isAbsolute(path)
    ? path
    : resolve(relativeTo || getFsImplementation().cwd(), path)

  let physicalPath: string
  try {
    physicalPath = getFsImplementation().realpathSync(absolute)
  } catch (error) {
    if (isENOENT(error)) {
      throw new Error(`Path "${absolute}" does not exist`)
    }
    throw error
  }

  setCwdState(physicalPath)
  if (process.env.NODE_ENV !== 'test') {
    try {
      logEvent('tengu_shell_set_cwd', { success: true })
    } catch {
      // Telemetry failure must not block setCwd; log sink might be uninstalled
    }
  }
}

export type { ExecOptions, ExecResult }
