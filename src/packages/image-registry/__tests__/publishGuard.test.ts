/**
 * Publicar de extremo a extremo con la credencial real del publicador y el
 * adapter de Docker Hub sobre la primitiva: el secreto no pasa por argv, no
 * queda en disco, no aparece en el resultado ni en un error, y una imagen que
 * lleva algo del entorno de build no se publica.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { registryAuthFor, secretForms } from '@thyrox/registry-credentials/registryAuthFile.ts'
import { PUBLISHER_ENV, resolvePublisherCredential } from '@thyrox/registry-credentials/registryCredential.ts'

import { createDockerHubRegistry } from '../dockerHubRegistry.ts'
import { EphemeralImageError } from '../imageRetention.ts'
import { ImageLeakError, publishImage } from '../publishGuard.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

const TOKEN = 'dckr_pat_SECRET-publish-0123456789'
const CREDENTIAL = resolvePublisherCredential({ [PUBLISHER_ENV.username]: 'th3rox', [PUBLISHER_ENV.token]: TOKEN })
const SOURCE = 'localhost/thyrox-model-quantizer:dev'
const DESTINATION = { registry: 'docker.io', repository: 'th3rox/thyrox-model-quantizer', tag: 'v1' }

function setUp() {
  const runtime = mkdtempSync(join(tmpdir(), 'image-registry-publish-'))
  const podman = createFakePodmanRegistry()
  const registry = createDockerHubRegistry({ podman, auth: registryAuthFor(CREDENTIAL, { runtimeDir: runtime, workspaceRoots: [] }) })
  return { runtime, podman, registry }
}

const guard = { forbiddenValues: secretForms(CREDENTIAL) }

describe('publicar con la credencial del publicador', () => {
  test('el token no pasa por argv; el authfile existió 0600 durante el push y desapareció', async () => {
    const { runtime, podman, registry } = setUp()
    const pinned = await publishImage(registry, podman, SOURCE, DESTINATION, guard)
    expect(pinned.repository).toBe('th3rox/thyrox-model-quantizer')
    expect(podman.calls.flat().join(' ')).not.toContain(TOKEN)
    expect(podman.authFilesSeen.map(seen => seen.mode)).toEqual([0o600])
    expect(podman.authFilesSeen[0]?.content).toContain(Buffer.from(`th3rox:${TOKEN}`).toString('base64'))
    expect(existsSync(podman.authFilesSeen[0]?.path ?? '')).toBe(false)
    expect(readdirSync(runtime)).toEqual([])
    expect(JSON.stringify(pinned)).not.toContain(TOKEN)
  })

  test('si el push falla, el error no lleva el token aunque Podman lo repita, y el authfile se retira', async () => {
    const { runtime, podman, registry } = setUp()
    podman.failNext = { command: 'push', stderr: `denied: th3rox:${TOKEN}` }
    const attempt = publishImage(registry, podman, SOURCE, DESTINATION, guard)
    await expect(attempt).rejects.toThrow(/denied/)
    await attempt.catch(error => expect(String(error)).not.toContain(TOKEN))
    expect(readdirSync(runtime)).toEqual([])
  })
})

describe('guarda de la imagen', () => {
  const leaks: [string, (podman: ReturnType<typeof createFakePodmanRegistry>) => void, RegExp][] = [
    ['una variable de proxy con un valor de otra construcción', podman => (podman.history = '|3 HTTPS_PROXY=http://10.0.0.9:15004 /bin/sh -c pip install torch'), /HTTPS_PROXY/],
    ['una variable de proxy en Config.Env', podman => (podman.env = '["PATH=/usr/bin","https_proxy=http://10.0.0.9:3128"]'), /https_proxy/],
    ['el token en el historial', podman => (podman.history = `RUN echo ${TOKEN}`), /1 valor/],
  ]

  for (const [name, plant, named] of leaks) {
    test(`rehúsa ${name}, sin repetir el valor y sin llamar a push`, async () => {
      const { podman, registry } = setUp()
      plant(podman)
      const attempt = publishImage(registry, podman, SOURCE, DESTINATION, guard)
      await expect(attempt).rejects.toBeInstanceOf(ImageLeakError)
      await attempt.catch(error => {
        expect(String(error)).toMatch(named)
        expect(String(error)).not.toMatch(new RegExp(`${TOKEN}|10\\.0\\.0\\.9`))
      })
      expect(podman.calls.some(call => call[0] === 'push')).toBe(false)
    })
  }

  for (const retention of ['ephemeral', '']) {
    test(`rehúsa publicar una imagen con retención «${retention || 'sin declarar'}»: sólo una durable sale del almacén`, async () => {
      const { podman, registry } = setUp()
      podman.retention = retention
      const attempt = publishImage(registry, podman, SOURCE, DESTINATION, guard)
      await expect(attempt).rejects.toBeInstanceOf(EphemeralImageError)
      await expect(attempt).rejects.toThrow(/io\.thyrox\.image\.retention/)
      expect(podman.calls.some(call => call[0] === 'push')).toBe(false)
    })
  }

  test('una imagen limpia se publica', async () => {
    const { podman, registry } = setUp()
    await expect(publishImage(registry, podman, SOURCE, DESTINATION, guard)).resolves.toMatchObject({ registry: 'docker.io' })
  })
})
