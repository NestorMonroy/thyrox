/**
 * El transporte de imágenes de la primitiva (TASK-THYROX-0725): la credencial
 * llega como ruta de authfile y nunca como argumento propio; el push devuelve
 * el digest del registro; un digest ilegible o un rechazo de Podman fallan con
 * su etapa.
 */
import { describe, expect, test } from 'bun:test'
import { writeFileSync } from 'node:fs'

import { ImageTransferError, pullImage, pushImage, storedDigest } from '../imageTransfer.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }
const DIGEST = `sha256:${'a'.repeat(64)}`
const AUTH_FILE = '/run/user/0/thyrox-registry-x/auth.json'
const DESTINATION = 'registry.example.com/lab/quantizer:v1'

function fakePodman(options: { digest?: string; failing?: string } = {}): PodmanExecutor & { calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args) {
      calls.push([...args])
      if (args[0] === options.failing) return { exitCode: 125, stdout: '', stderr: `${args[0]} failed: unauthorized` }
      if (args[0] === 'push') writeFileSync(args[args.indexOf('--digestfile') + 1] ?? '', options.digest ?? DIGEST)
      if (args[0] === 'image') return { ...OK, stdout: `${options.digest ?? DIGEST}\n` }
      return OK
    },
  }
}

describe('push', () => {
  test('pasa el authfile y el digestfile, y devuelve el digest que asignó el registro', async () => {
    const podman = fakePodman()
    expect(await pushImage(podman, 'localhost/quantizer:dev', DESTINATION, AUTH_FILE)).toBe(DIGEST)
    expect(podman.calls[0]?.slice(0, 3)).toEqual(['push', '--authfile', AUTH_FILE])
    expect(podman.calls[0]).toContain('--digestfile')
    expect(podman.calls[0]?.slice(-2)).toEqual(['localhost/quantizer:dev', DESTINATION])
  })

  test('sin authfile no añade la opción', async () => {
    const podman = fakePodman()
    await pushImage(podman, 'localhost/quantizer:dev', DESTINATION)
    expect(podman.calls[0]).not.toContain('--authfile')
  })

  test('un digest ilegible rehúsa', async () => {
    await expect(pushImage(fakePodman({ digest: 'latest' }), 's', DESTINATION, AUTH_FILE)).rejects.toThrow(ImageTransferError)
  })

  test('un rechazo nombra la etapa y lo que dijo Podman', async () => {
    await expect(pushImage(fakePodman({ failing: 'push' }), 's', DESTINATION, AUTH_FILE)).rejects.toThrow(/push.*unauthorized/)
  })
})

describe('pull y digest del almacén', () => {
  test('pull usa el authfile sólo si se da', async () => {
    const podman = fakePodman()
    await pullImage(podman, DESTINATION)
    await pullImage(podman, DESTINATION, AUTH_FILE)
    expect(podman.calls).toEqual([['pull', DESTINATION], ['pull', '--authfile', AUTH_FILE, DESTINATION]])
  })

  test('storedDigest lee el digest del almacén y rehúsa uno ilegible', async () => {
    expect(await storedDigest(fakePodman(), DESTINATION)).toBe(DIGEST)
    await expect(storedDigest(fakePodman({ digest: '<none>' }), DESTINATION)).rejects.toThrow(/ilegible/)
  })
})
