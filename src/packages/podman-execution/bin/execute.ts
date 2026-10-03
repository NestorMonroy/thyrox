#!/usr/bin/env bun
/** Entrada de `bin/podman-execution-execute`; la orden vive en `executionCommand.ts`. */
import { resolve } from 'node:path'

import { retireOwnedContainers, runExecutionCommand, runnerEnvironment, type ExecutionCommandDeps } from '../executionCommand.ts'
import { createPodmanExecutor } from '../podmanExecutor.ts'

const repositoryRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '../../../..')
const output = {
  stdout: (text: string) => { process.stdout.write(text) },
  stderr: (text: string) => { process.stderr.write(text) },
}
const deps: ExecutionCommandDeps = {
  env: runnerEnvironment(process.env, repositoryRoot),
  readStdin: () => Bun.stdin.text(),
  output,
  pid: process.pid,
  now: () => Date.now(),
  podman: createPodmanExecutor(),
  repositoryRoot,
  isProcessAlive: pid => {
    try {
      process.kill(pid, 0)
      return true
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'EPERM'
    }
  },
}

/** Al recibir la señal, el runner retira su contenedor antes de salir (TASK-THYROX-0919 r2). */
const SIGNAL_EXIT_CODES: Readonly<Record<'SIGTERM' | 'SIGINT', number>> = { SIGTERM: 143, SIGINT: 130 }
for (const [signal, code] of Object.entries(SIGNAL_EXIT_CODES)) {
  process.on(signal, () => {
    void retireOwnedContainers(deps).finally(() => process.exit(code))
  })
}

process.exit(await runExecutionCommand(process.argv.slice(2), deps))
