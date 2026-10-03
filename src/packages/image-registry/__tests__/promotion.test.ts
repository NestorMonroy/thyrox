/**
 * Construir no es publicar (contratos 13 y 14 de TASK-THYROX-0691): sólo una
 * imagen promovida llega al registro, y sólo se promueve una imagen declarada
 * permanente que trae definición reproducible, validación aprobada y
 * procedencia, y que no lleva nada del entorno de build ni de la credencial.
 * La publicación usa la credencial real del publicador, que no pasa por argv,
 * no queda en disco ni aparece en un error.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { registryAuthFor, secretForms } from '@thyrox/registry-credentials/registryAuthFile.ts'
import { PUBLISHER_ENV, resolvePublisherCredential } from '@thyrox/registry-credentials/registryCredential.ts'

import { createDockerHubRegistry } from '../dockerHubRegistry.ts'
import { LIFECYCLE_LABEL } from '../imageLifecycle.ts'
import { ImageLeakError, promoteCandidate, PromotionRefusedError, publishPromotedImage, type PromotedImage } from '../promotion.ts'
import { createFakePodmanRegistry } from '../testing/fakePodmanRegistry.ts'

const TOKEN = 'dckr_pat_SECRET-publish-0123456789'
const CREDENTIAL = resolvePublisherCredential({ [PUBLISHER_ENV.username]: 'th3rox', [PUBLISHER_ENV.token]: TOKEN })
const SOURCE = 'localhost/thyrox-model-quantizer:candidate'
const DESTINATION = { registry: 'docker.io', repository: 'th3rox/thyrox-model-quantizer', tag: 'v1' }
const EVIDENCE = {
  definition: { repository: 'NestorMonroy/thyrox', commit: 'a'.repeat(40), path: 'src/packages/model-artifacts/quantizer-image/Containerfile' },
  validation: { passed: true as const, evidenceRef: '.claude/workbench/quantizer-validation/report.json' },
  provenance: { builder: 'podman 4.9.3' },
}
const GUARD = { forbiddenValues: secretForms(CREDENTIAL) }

/** `null` deja la imagen sin clase declarada. */
function setUp(lifecycle: string | null = 'permanent') {
  const runtime = mkdtempSync(join(tmpdir(), 'image-registry-publish-'))
  const podman = createFakePodmanRegistry()
  podman.addLocalImage(SOURCE, lifecycle === null ? {} : { [LIFECYCLE_LABEL]: lifecycle })
  const registry = createDockerHubRegistry({ podman, auth: registryAuthFor(CREDENTIAL, { runtimeDir: runtime, workspaceRoots: [] }) })
  return { runtime, podman, registry }
}

describe('promoción', () => {
  for (const lifecycle of ['ephemeral', 'cache', 'infrastructure', null]) {
    test(`rehúsa promover una imagen con ciclo de vida «${lifecycle ?? 'sin declarar'}»`, async () => {
      const { podman } = setUp(lifecycle)
      await expect(promoteCandidate(podman, SOURCE, EVIDENCE, GUARD)).rejects.toBeInstanceOf(PromotionRefusedError)
    })
  }

  test('rehúsa sin definición reproducible fijada por commit o sin validación aprobada', async () => {
    const { podman } = setUp()
    await expect(promoteCandidate(podman, SOURCE, { ...EVIDENCE, definition: { ...EVIDENCE.definition, commit: 'main' } }, GUARD)).rejects.toThrow(/commit/)
    await expect(promoteCandidate(podman, SOURCE, { ...EVIDENCE, validation: { passed: false as never, evidenceRef: 'x' } }, GUARD)).rejects.toThrow(/validación/)
  })

  test('un objeto con la forma de una promovida no se publica: sólo la que produjo promoteCandidate', async () => {
    const { podman, registry } = setUp()
    const forged = { localImage: SOURCE, evidence: EVIDENCE } as unknown as PromotedImage
    await expect(publishPromotedImage(registry, forged, DESTINATION)).rejects.toBeInstanceOf(PromotionRefusedError)
    expect(podman.calls.some(call => call[0] === 'push')).toBe(false)
  })

  const leaks: [string, (podman: ReturnType<typeof createFakePodmanRegistry>) => void, RegExp][] = [
    ['una variable de proxy con un valor de otra construcción', podman => (podman.history = '|3 HTTPS_PROXY=http://10.0.0.9:15004 /bin/sh -c pip install torch'), /HTTPS_PROXY/],
    ['una variable de proxy en Config.Env', podman => (podman.env = '["PATH=/usr/bin","https_proxy=http://10.0.0.9:3128"]'), /https_proxy/],
    ['el token en el historial', podman => (podman.history = `RUN echo ${TOKEN}`), /1 valor/],
  ]
  for (const [name, plant, named] of leaks) {
    test(`rehúsa promover con ${name}, sin repetir el valor`, async () => {
      const { podman } = setUp()
      plant(podman)
      const attempt = promoteCandidate(podman, SOURCE, EVIDENCE, GUARD)
      await expect(attempt).rejects.toBeInstanceOf(ImageLeakError)
      await attempt.catch(error => {
        expect(String(error)).toMatch(named)
        expect(String(error)).not.toMatch(new RegExp(`${TOKEN}|10\\.0\\.0\\.9`))
      })
    })
  }
})

describe('publicar lo promovido con la credencial del publicador', () => {
  test('el token no pasa por argv; el authfile existió 0600 durante el push y desapareció', async () => {
    const { runtime, podman, registry } = setUp()
    const promoted = await promoteCandidate(podman, SOURCE, EVIDENCE, GUARD)
    const pinned = await publishPromotedImage(registry, promoted, DESTINATION)
    expect(pinned.repository).toBe('th3rox/thyrox-model-quantizer')
    expect(podman.calls.flat().join(' ')).not.toContain(TOKEN)
    expect(podman.authFilesSeen.map(seen => seen.mode)).toEqual([0o600])
    expect(existsSync(podman.authFilesSeen[0]?.path ?? '')).toBe(false)
    expect(readdirSync(runtime)).toEqual([])
    expect(JSON.stringify(pinned)).not.toContain(TOKEN)
  })

  test('si el push falla, el error no lleva el token aunque Podman lo repita, y el authfile se retira', async () => {
    const { runtime, podman, registry } = setUp()
    const promoted = await promoteCandidate(podman, SOURCE, EVIDENCE, GUARD)
    podman.failNext = { command: 'push', stderr: `denied: th3rox:${TOKEN}` }
    const attempt = publishPromotedImage(registry, promoted, DESTINATION)
    await expect(attempt).rejects.toThrow(/denied/)
    await attempt.catch(error => expect(String(error)).not.toContain(TOKEN))
    expect(readdirSync(runtime)).toEqual([])
  })
})
