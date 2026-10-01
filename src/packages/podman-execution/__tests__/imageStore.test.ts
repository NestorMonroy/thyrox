import { describe, expect, test } from 'bun:test'

import { buildImage, ImageStoreError, imageExists, listImages, removeImage } from '../imageStore.js'
import type { PodmanCommandResult, PodmanExecutor } from '../podmanExecutor.js'

const OK: PodmanCommandResult = { exitCode: 0, stdout: '', stderr: '' }

function fakePodman(responses: Partial<Record<string, PodmanCommandResult>> = {}): PodmanExecutor & { calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async run(args) {
      calls.push([...args])
      return responses[args[0] === 'image' ? `image ${args[1]}` : (args[0] ?? '')] ?? OK
    },
  }
}

describe('almacén local de imágenes', () => {
  test('build pasa cada etiqueta y devuelve el id', async () => {
    const podman = fakePodman({ 'image inspect': { ...OK, stdout: 'abc123\n' } })
    const id = await buildImage(podman, { context: '/ctx', tag: 'localhost/t:1', labels: { 'io.example/a': 'x', b: 'y' } })
    expect(id).toBe('abc123')
    expect(podman.calls[0]).toEqual(['build', '--label', 'io.example/a=x', '--label', 'b=y', '-t', 'localhost/t:1', '/ctx'])
  })

  test('exists responde por el código de salida, sin traer nada', async () => {
    expect(await imageExists(fakePodman(), 'r')).toBe(true)
    expect(await imageExists(fakePodman({ 'image exists': { ...OK, exitCode: 1 } }), 'r')).toBe(false)
  })

  test('list filtra por cada etiqueta y traduce el JSON de Podman', async () => {
    const stdout = JSON.stringify([{ Id: 'i1', Names: ['localhost/t:1'], Labels: { k: 'v' }, Created: 100, Size: 42 }, { Id: 'i2', Names: null, Labels: null, Created: 50, Size: 7 }])
    const podman = fakePodman({ images: { ...OK, stdout } })
    expect(await listImages(podman, { k: 'v', o: 'w' })).toEqual([
      { id: 'i1', names: ['localhost/t:1'], labels: { k: 'v' }, createdAt: 100, sizeBytes: 42 },
      { id: 'i2', names: [], labels: {}, createdAt: 50, sizeBytes: 7 },
    ])
    expect(podman.calls[0]).toEqual(['images', '--filter', 'label=k=v', '--filter', 'label=o=w', '--format', 'json'])
  })

  test('un fallo nombra la operación', async () => {
    await expect(removeImage(fakePodman({ rmi: { exitCode: 2, stdout: '', stderr: 'image in use' } }), 'i1')).rejects.toThrow(ImageStoreError)
    await expect(removeImage(fakePodman({ rmi: { exitCode: 2, stdout: '', stderr: 'image in use' } }), 'i1')).rejects.toThrow(/rmi.*in use/)
  })
})

describe('etiquetas de una imagen', () => {
  test('readLabels traduce el JSON y una imagen sin etiquetas da un objeto vacío', async () => {
    const { readLabels } = await import('../imageStore.js')
    expect(await readLabels(fakePodman({ 'image inspect': { ...OK, stdout: '{"a":"1"}\n' } }), 'r')).toEqual({ a: '1' })
    expect(await readLabels(fakePodman({ 'image inspect': { ...OK, stdout: 'null\n' } }), 'r')).toEqual({})
  })
})

describe('construcción con egreso por el proxy del anfitrión', () => {
  test('red, argumentos y montajes de sólo lectura van antes del contexto', async () => {
    const podman = fakePodman({ 'image inspect': { ...OK, stdout: 'abc123\n' } })
    await buildImage(podman, {
      context: '/ctx',
      tag: 'localhost/t:1',
      labels: {},
      network: 'host',
      buildArgs: { HTTPS_PROXY: 'http://127.0.0.1:1' },
      readOnlyMounts: [{ source: '/ca.crt', destination: '/etc/ssl/certs/proxy-ca.crt' }],
    })
    expect(podman.calls[0]).toEqual([
      'build', '--network', 'host', '--build-arg', 'HTTPS_PROXY=http://127.0.0.1:1',
      '-v', '/ca.crt:/etc/ssl/certs/proxy-ca.crt:ro', '-t', 'localhost/t:1', '/ctx',
    ])
  })

  test('un argumento que nombra una credencial se rehúsa antes de invocar Podman', async () => {
    const podman = fakePodman()
    await expect(buildImage(podman, { context: '/ctx', tag: 't', labels: {}, buildArgs: { NPM_TOKEN: 'x' } })).rejects.toThrow('credencial')
    expect(podman.calls).toEqual([])
  })
})
