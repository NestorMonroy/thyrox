/**
 * Un `PodmanExecutor` que simula un registro remoto y el almacén local, para
 * probar los adapters y el ciclo de vida de imágenes sin red ni runtime.
 *
 * Una imagen local guarda sus nombres, sus etiquetas, su digest y un instante
 * de creación que avanza con cada build o pull. Las etiquetas viajan con la
 * imagen: una imagen traída del registro conserva las de su construcción.
 * Registra cada argv y, si el comando lleva authfile, lo que ese archivo
 * contenía y sus permisos.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs'

import type { PodmanCommandResult, PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import { digestOfLocalImage } from './inMemoryRegistry.ts'

export type AuthFileObservation = { path: string; content: string; mode: number }

export type FakeImage = { id: string; names: string[]; labels: Record<string, string>; digest: string; createdAt: number; sizeBytes: number }

type RemoteImage = { digest: string; labels: Record<string, string> }

export type FakePodmanRegistry = PodmanExecutor & {
  readonly calls: string[][]
  readonly remote: Map<string, RemoteImage>
  readonly images: Map<string, FakeImage>
  authFilesSeen: AuthFileObservation[]
  failNext?: { command: string; stderr: string }
  history: string
  env: string
  /** Pone una imagen local, como si se hubiera construido antes. */
  addLocalImage(name: string, labels?: Record<string, string>): FakeImage
  findImage(reference: string): FakeImage | undefined
}

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const DIGEST_SEPARATOR = '@'
const IMAGE_SIZE_BYTES = 1000

function failure(stderr: string): PodmanCommandResult {
  return { exitCode: 125, stdout: '', stderr }
}

function lastTwo(args: readonly string[]): [string, string] {
  return [args[args.length - 2] ?? '', args[args.length - 1] ?? '']
}

function repositoryOf(reference: string): string {
  return reference.split(DIGEST_SEPARATOR)[0]?.replace(/:[^/:]+$/, '') ?? reference
}

function labelsOf(args: readonly string[]): Record<string, string> {
  const labels: Record<string, string> = {}
  args.forEach((arg, index) => {
    if (arg !== '--label') return
    const [key, ...value] = (args[index + 1] ?? '').split('=')
    if (key !== undefined) labels[key] = value.join('=')
  })
  return labels
}

function filtersOf(args: readonly string[]): [string, string][] {
  return args.flatMap((arg, index) => {
    if (arg !== '--filter') return []
    const [key, ...value] = (args[index + 1] ?? '').replace(/^label=/, '').split('=')
    return key === undefined ? [] : [[key, value.join('=')] as [string, string]]
  })
}

export function createFakePodmanRegistry(): FakePodmanRegistry {
  let clock = 0
  let sequence = 0
  const nextId = () => `image-${++sequence}`

  const fake: FakePodmanRegistry = {
    calls: [],
    remote: new Map(),
    images: new Map(),
    authFilesSeen: [],
    history: '/bin/sh -c apt-get update\n',
    env: '["PATH=/usr/bin"]\n',
    addLocalImage(name, labels = {}) {
      const image: FakeImage = { id: nextId(), names: [name], labels, digest: digestOfLocalImage(`${name}#${sequence}`), createdAt: ++clock, sizeBytes: IMAGE_SIZE_BYTES }
      fake.images.set(image.id, image)
      return image
    },
    findImage(reference) {
      return [...fake.images.values()].find(image => image.id === reference || image.names.includes(reference))
    },
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
        case 'build': {
          const tag = args[args.indexOf('-t') + 1] ?? ''
          for (const image of fake.images.values()) image.names = image.names.filter(name => name !== tag)
          fake.addLocalImage(tag, labelsOf(args))
          return OK
        }
        case 'push': {
          const [source, destination] = lastTwo(args)
          const local = fake.findImage(source)
          const remote = { digest: local?.digest ?? digestOfLocalImage(source), labels: local?.labels ?? {} }
          fake.remote.set(destination, remote)
          fake.remote.set(`${repositoryOf(destination)}${DIGEST_SEPARATOR}${remote.digest}`, remote)
          writeFileSync(args[args.indexOf('--digestfile') + 1] ?? '', remote.digest)
          return OK
        }
        case 'pull': {
          const reference = args[args.length - 1] ?? ''
          const remote = fake.remote.get(reference)
          if (remote === undefined) return failure(`manifest unknown: ${reference}`)
          const existing = fake.findImage(reference)
          if (existing !== undefined) existing.digest = remote.digest
          else fake.images.set(nextId(), { id: `image-${sequence}`, names: [reference], labels: remote.labels, digest: remote.digest, createdAt: ++clock, sizeBytes: IMAGE_SIZE_BYTES })
          return OK
        }
        case 'image': {
          const reference = args[2] ?? ''
          const image = fake.findImage(reference)
          if (args[1] === 'exists') return image === undefined ? { ...OK, exitCode: 1 } : OK
          const format = args[4] ?? ''
          if (format === '{{json .Config.Env}}') return { ...OK, stdout: fake.env }
          if (image === undefined) return failure(`image not known: ${reference}`)
          if (format === '{{.Id}}') return { ...OK, stdout: `${image.id}\n` }
          if (format === '{{.Digest}}') return { ...OK, stdout: `${image.digest}\n` }
          if (format === '{{json .Labels}}') return { ...OK, stdout: `${JSON.stringify(image.labels)}\n` }
          const label = /^\{\{index \.Labels "(.+)"\}\}$/.exec(format)?.[1]
          if (label !== undefined) return { ...OK, stdout: `${image.labels[label] ?? '<no value>'}\n` }
          return OK
        }
        case 'images': {
          const wanted = filtersOf(args)
          const listed = [...fake.images.values()].filter(image => wanted.every(([key, value]) => image.labels[key] === value))
          return { ...OK, stdout: JSON.stringify(listed.map(image => ({ Id: image.id, Names: image.names, Labels: image.labels, Created: image.createdAt, Size: image.sizeBytes }))) }
        }
        case 'rmi': {
          const image = fake.findImage(args[1] ?? '')
          if (image === undefined) return failure(`image not known: ${args[1]}`)
          fake.images.delete(image.id)
          return OK
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
