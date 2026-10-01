/**
 * Un `PodmanExecutor` que simula un registro remoto y el almacén local, para
 * probar los adapters OCI sin red. Registra cada argv y, durante un push con
 * authfile, lo que ese archivo contenía y sus permisos.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs'

import type { PodmanCommandResult, PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { digestOfLocalImage } from './inMemoryRegistry.ts'

export type AuthFileObservation = { path: string; content: string; mode: number }

export type FakePodmanRegistry = PodmanExecutor & {
  readonly calls: string[][]
  readonly remote: Map<string, string>
  readonly local: Map<string, string>
  authFilesSeen: AuthFileObservation[]
  failNext?: { command: string; stderr: string }
  history: string
  env: string
  /** Valor de la etiqueta de retención de la imagen local; vacío si no la lleva. */
  retention: string
}

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const DIGEST_SEPARATOR = '@'

function failure(stderr: string): PodmanCommandResult {
  return { exitCode: 125, stdout: '', stderr }
}

function lastTwo(args: readonly string[]): [string, string] {
  return [args[args.length - 2] ?? '', args[args.length - 1] ?? '']
}

export function createFakePodmanRegistry(): FakePodmanRegistry {
  const fake: FakePodmanRegistry = {
    calls: [],
    remote: new Map(),
    local: new Map(),
    authFilesSeen: [],
    history: '/bin/sh -c apt-get update\n',
    env: '["PATH=/usr/bin"]\n',
    retention: 'durable',
    async run(args) {
      fake.calls.push([...args])
      const authIndex = args.indexOf('--authfile')
      if (authIndex !== -1) {
        const path = args[authIndex + 1] ?? ''
        fake.authFilesSeen.push({ path, content: readFileSync(path, 'utf8'), mode: statSync(path).mode & 0o777 })
      }
      if (fake.failNext !== undefined && fake.failNext.command === args[0]) {
        const { stderr } = fake.failNext
        fake.failNext = undefined
        return failure(stderr)
      }
      switch (args[0]) {
        case 'push': {
          const [source, destination] = lastTwo(args)
          const digest = digestOfLocalImage(source)
          fake.remote.set(destination, digest)
          fake.remote.set(`${destination.replace(/:[^/:]+$/, '')}${DIGEST_SEPARATOR}${digest}`, digest)
          writeFileSync(args[args.indexOf('--digestfile') + 1] ?? '', digest)
          return OK
        }
        case 'pull': {
          const reference = args[args.length - 1] ?? ''
          const digest = fake.remote.get(reference)
          if (digest === undefined) return failure(`manifest unknown: ${reference}`)
          fake.local.set(reference, digest)
          return OK
        }
        case 'image': {
          const reference = args[2] ?? ''
          const digest = fake.local.get(reference)
          if (args[4] === '{{json .Config.Env}}') return { ...OK, stdout: fake.env }
          if (args[4]?.startsWith('{{index .Labels')) return { ...OK, stdout: `${fake.retention}\n` }
          if (digest === undefined) return failure(`image not known: ${reference}`)
          return { ...OK, stdout: `${digest}\n` }
        }
        case 'history':
          return { ...OK, stdout: fake.history }
        default:
          return OK
      }
    },
  }
  return fake
}
