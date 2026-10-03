/**
 * Verifica la publicación con un consumidor anónimo:
 * 1. HEAD del manifiesto por etiqueta (`docker-content-digest`): el digest
 *    que el registro sirve, sin pasar por el almacén local;
 * 2. pull por ESE digest, que sólo existe si el registro lo tiene.
 * Uso: bun verify_anonymous.ts <repo> <tag> <digest-esperado>
 */
import { OciDistributionClient } from '@thyrox/artifact-registry/ociDistribution.ts'
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { pullImage } from '@thyrox/podman-execution/imageTransfer.ts'
import { dirname, join } from 'node:path'
import { writeFileSync } from 'node:fs'

const [repository, tag, expected] = process.argv.slice(2)
if (!repository || !tag || !expected) { console.error('uso: <repo> <tag> <digest-esperado>'); process.exit(2) }
const outputs = join(dirname(Bun.fileURLToPath(import.meta.url)), '..', 'outputs')
const ACCEPT = 'application/vnd.oci.image.manifest.v1+json,application/vnd.oci.image.index.v1+json,'
  + 'application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json'
const client = new OciDistributionClient({ baseUrl: 'https://registry-1.docker.io', credential: { kind: 'anonymous' } })
const head = await client.headManifest(repository, tag, ACCEPT)
if (head.status !== 'success') { console.error(JSON.stringify(head)); process.exit(1) }
const pinned = `docker.io/${repository}@${head.value.digest}`
await pullImage(createPodmanExecutor(), pinned)
const verdict = { tag, expected, served: head.value.digest, mediaType: head.value.mediaType, pulledByDigest: pinned,
  sameDigest: head.value.digest === expected }
writeFileSync(join(outputs, 'anonymous-verification.json'), `${JSON.stringify(verdict, null, 2)}\n`)
console.log(JSON.stringify(verdict))
process.exit(verdict.sameDigest ? 0 : 1)
