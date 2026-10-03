#!/usr/bin/env bun
/** Entrada de `bin/image-registry-build-declared-image`; la orden vive en `declaredImageBuildCommand.ts`. */
import { resolve } from 'node:path'

import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { runDeclaredImageBuildCommand } from '../declaredImageBuildCommand.ts'

const repositoryRoot = process.env.THYROX_ROOT ?? resolve(import.meta.dir, '../../../..')

function git(args: string[]): string {
  const result = Bun.spawnSync(['git', '-C', repositoryRoot, ...args], { stdout: 'pipe', stderr: 'pipe' })
  if (result.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr.toString().trim()}`)
  return result.stdout.toString()
}

process.exit(
  await runDeclaredImageBuildCommand(process.argv.slice(2), {
    env: process.env,
    podman: createPodmanExecutor(),
    repositoryRoot,
    output: {
      stdout: (text: string) => { process.stdout.write(text) },
      stderr: (text: string) => { process.stderr.write(text) },
    },
    // El contexto entero, Containerfile incluido: un archivo sin commitear no tiene identidad versionada.
    definitionRevision: async context => ({
      commit: git(['rev-parse', 'HEAD']).trim(),
      clean: git(['status', '--porcelain', '--untracked-files=all', '--', context]).trim() === '',
    }),
  }),
)
