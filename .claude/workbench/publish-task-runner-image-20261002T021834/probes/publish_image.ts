/**
 * Promueve y publica una imagen candidata `permanent` en Docker Hub por el
 * camino declarado (promoteCandidate -> publishPromotedImage), y la verifica
 * con un consumidor anónimo que la resuelve por digest.
 *
 * Uso: bun publish_image.ts <imagen-local> <repositorio> <tag> <commit> <evidencia-de-validación>
 * La credencial de publicación sale del entorno (`resolvePublisherCredential`);
 * nunca se imprime.
 */
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { registryAuthFor, secretForms } from '@thyrox/registry-credentials/registryAuthFile.ts'
import { resolvePublisherCredential } from '@thyrox/registry-credentials/registryCredential.ts'
import { createDockerHubRegistry } from '@thyrox/image-registry/dockerHubRegistry.ts'
import { canonicalReference } from '@thyrox/image-registry/imageReference.ts'
import { promoteCandidate, publishPromotedImage } from '@thyrox/image-registry/promotion.ts'
import { dirname, join } from 'node:path'
import { writeFileSync } from 'node:fs'

const [localImage, repository, tag, commit, validationRef] = process.argv.slice(2)
if (!localImage || !repository || !tag || !commit || !validationRef) {
  console.error('uso: <imagen-local> <repositorio> <tag> <commit> <evidencia-de-validación>')
  process.exit(2)
}
const outputs = join(dirname(Bun.fileURLToPath(import.meta.url)), '..', 'outputs')
const podman = createPodmanExecutor()
const credential = resolvePublisherCredential()

const evidence = {
  definition: { repository: 'NestorMonroy/thyrox', commit, path: 'src/packages/podman-execution/task-runner-image/Containerfile' },
  validation: { passed: true as const, evidenceRef: validationRef },
  provenance: { builder: 'podman build-image (podman-execution-primitive)', purpose: 'imagen de ejecución de las tareas de thyrox' },
}
const promoted = await promoteCandidate(podman, localImage, evidence, { forbiddenValues: secretForms(credential) })
const publisher = createDockerHubRegistry({ podman, auth: registryAuthFor(credential) })
const pinned = await publishPromotedImage(publisher, promoted, { registry: 'docker.io', repository: `${credential.username}/${repository}`, tag })
const reference = canonicalReference(pinned)

// Consumidor anónimo: resolver la etiqueta publicada y exigir el mismo digest.
const consumer = createDockerHubRegistry({ podman })
const resolved = await consumer.reader.resolve({ registry: 'docker.io', repository: `${credential.username}/${repository}`, tag })
const verdict = { localImage, reference, resolvedDigest: canonicalReference(resolved), sameDigest: canonicalReference(resolved) === reference }
writeFileSync(join(outputs, 'publication.json'), `${JSON.stringify(verdict, null, 2)}\n`)
console.log(JSON.stringify(verdict))
process.exit(verdict.sameDigest ? 0 : 1)
