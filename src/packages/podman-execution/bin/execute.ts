#!/usr/bin/env bun
/** Entrada de `bin/thyrox-exec`; la orden vive en `executionCommand.ts`. */
import { resolve } from 'node:path'

import { runExecutionCommand } from '../executionCommand.ts'
import { createPodmanExecutor } from '../podmanExecutor.ts'

const repositoryRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '../../../..')
const output = {
  stdout: (text: string) => { process.stdout.write(text) },
  stderr: (text: string) => { process.stderr.write(text) },
}
process.exit(
  await runExecutionCommand(process.argv.slice(2), {
    env: process.env,
    readStdin: () => Bun.stdin.text(),
    output,
    pid: process.pid,
    now: () => Date.now(),
    podman: createPodmanExecutor(),
    repositoryRoot,
  }),
)
