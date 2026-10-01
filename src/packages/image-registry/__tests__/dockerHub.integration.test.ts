/**
 * Integración real con Docker Hub, detrás de una marca explícita: construye una
 * imagen mínima (`FROM scratch`, un archivo), la publica con la credencial del
 * publicador, la borra del almacén local y la vuelve a traer por digest con un
 * registro sin credencial, como lo haría un consumidor.
 *
 * Corre sólo con `THYROX_REGISTRY_INTEGRATION=dockerhub` y la credencial del
 * publicador en el entorno; si no, se declara NO MEDIDA. Publica en el
 * repositorio `<usuario>/thyrox-registry-probe`, que tiene que ser público
 * para que el pull anónimo funcione. No borra nada.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { registryAuthFor, secretForms } from '@thyrox/registry-credentials/registryAuthFile.ts'
import { resolvePublisherCredential } from '@thyrox/registry-credentials/registryCredential.ts'

import { createDockerHubRegistry } from '../dockerHubRegistry.ts'
import { canonicalReference } from '../imageReference.ts'
import { LIFECYCLE_LABEL } from '../imageLifecycle.ts'
import { promoteCandidate, publishPromotedImage } from '../promotion.ts'

const INTEGRATION_FLAG = 'THYROX_REGISTRY_INTEGRATION'
const PROBE_REPOSITORY = 'thyrox-registry-probe'
const enabled = process.env[INTEGRATION_FLAG] === 'dockerhub'
/** La sonda se define en esta misma prueba; su commit se lee del clon que la corre. */
const PROBE_DEFINITION_COMMIT = Bun.spawnSync(['git', 'rev-parse', 'HEAD']).stdout.toString().trim()

if (!enabled) {
  describe('Docker Hub real', () => {
    test.skip(`NO MEDIDO: declara ${INTEGRATION_FLAG}=dockerhub y la credencial del publicador`, () => {})
  })
} else {
  describe('Docker Hub real', () => {
    test('promueve, publica con credencial y un consumidor anónimo trae la imagen por digest', async () => {
      const credential = resolvePublisherCredential()
      const podman = createPodmanExecutor()
      const context = mkdtempSync(join(tmpdir(), 'registry-probe-'))
      writeFileSync(join(context, 'probe.txt'), `${new Date().toISOString()}\n`)
      writeFileSync(join(context, 'Containerfile'), 'FROM scratch\nCOPY probe.txt /probe.txt\n')
      const local = `localhost/${PROBE_REPOSITORY}:integration`
      expect((await podman.run(['build', '--label', `${LIFECYCLE_LABEL}=permanent`, '-t', local, context])).exitCode).toBe(0)

      const publisher = createDockerHubRegistry({ podman, auth: registryAuthFor(credential) })
      const destination = { registry: 'docker.io', repository: `${credential.username}/${PROBE_REPOSITORY}`, tag: 'integration' }
      const evidence = {
        definition: { repository: 'NestorMonroy/thyrox', commit: PROBE_DEFINITION_COMMIT, path: 'src/packages/image-registry/__tests__/dockerHub.integration.test.ts' },
        validation: { passed: true as const, evidenceRef: 'la propia prueba de integración' },
        provenance: { builder: 'podman', purpose: 'sonda de integración del registro' },
      }
      const promoted = await promoteCandidate(podman, local, evidence, { forbiddenValues: secretForms(credential) })
      const pinned = await publishPromotedImage(publisher, promoted, destination)

      expect((await podman.run(['rmi', '-f', local, canonicalReference(pinned)])).exitCode).toBe(0)
      const consumer = createDockerHubRegistry({ podman })
      expect(canonicalReference(await consumer.reader.pull(pinned))).toBe(canonicalReference(pinned))
    }, 300_000)
  })
}
