/**
 * Sirve un artefacto de un solo blob sintético desde el registro falso, para
 * medir la memoria del verificador. Escribe `baseUrl digest` en stdout y queda
 * vivo hasta recibir SIGTERM.
 *
 * Uso: bun serve_blob.ts <ruta-del-blob>
 */
import { describeArtifactFile } from '@thyrox/artifact-registry/artifactFiles.ts'
import { createOciArtifactRegistry } from '@thyrox/artifact-registry/ociArtifactRegistry.ts'
import { FAKE_PUBLISHER, startFakeOciRegistry } from '@thyrox/artifact-registry/testing/fakeOciRegistry.ts'

const [blobPath] = process.argv.slice(2)
if (!blobPath) throw new Error('falta la ruta del blob')
const registry = startFakeOciRegistry()
const publisher = createOciArtifactRegistry({
  baseUrl: registry.baseUrl,
  credential: { kind: 'basic', username: FAKE_PUBLISHER.username, secret: () => FAKE_PUBLISHER.token },
})
const file = await describeArtifactFile(blobPath, 'model.gguf', 'application/octet-stream')
// Se siembra el blob en el registro: Bun.serve rehúsa un cuerpo de más de 128 MB al subirlo.
registry.blobs.set(`sha256:${file.sha256}`, new Uint8Array(await Bun.file(blobPath).arrayBuffer()))
const pushed = await publisher.pushArtifact(
  { artifactType: 'application/vnd.thyrox.probe', files: [file], config: { mediaType: 'application/json', bytes: new TextEncoder().encode('{}') }, annotations: {} },
  { repository: 'probe/blob', tag: 'probe' },
)
if (pushed.status !== 'success') throw new Error(`push falló: ${JSON.stringify(pushed)}`)
process.stdout.write(`${registry.baseUrl} ${pushed.value.digest}\n`)
process.on('SIGTERM', () => { registry.stop(); process.exit(0) })
