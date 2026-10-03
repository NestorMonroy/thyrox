/**
 * Archiva el contenido de un volumen de Podman como imagen OCI permanent en
 * Docker Hub y verifica, con un consumidor anónimo que la trae por digest, que
 * cada archivo llega con el mismo sha256. No borra el volumen: eso es un paso
 * aparte, sólo con la verificación en verde.
 *
 * Uso: bun archive_volume.ts <volumen> <tag> <commit-de-esta-definición>
 * Excluye la clave de identidad de Ollama y su caché (archive.ignore): no es
 * contenido del volumen sino estado que Ollama regenera, y la clave es privada.
 */
import { createPodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'
import { registryAuthFor, secretForms } from '@thyrox/registry-credentials/registryAuthFile.ts'
import { resolvePublisherCredential } from '@thyrox/registry-credentials/registryCredential.ts'
import { createDockerHubRegistry } from '@thyrox/image-registry/dockerHubRegistry.ts'
import { canonicalReference } from '@thyrox/image-registry/imageReference.ts'
import { LIFECYCLE_LABEL } from '@thyrox/image-registry/imageLifecycle.ts'
import { promoteCandidate, publishPromotedImage } from '@thyrox/image-registry/promotion.ts'
import { dirname, join, relative } from 'node:path'
import { readdirSync, statSync, writeFileSync } from 'node:fs'

const [volume, tag, commit] = process.argv.slice(2)
if (!volume || !tag || !commit) { console.error('uso: <volumen> <tag> <commit>'); process.exit(2) }
const REPOSITORY = 'thyrox-volume-archive'
const EXCLUDED = new Set(['id_ed25519', 'id_ed25519.pub', 'cache'])
const probes = dirname(Bun.fileURLToPath(import.meta.url))
const outputs = join(probes, '..', 'outputs')
const podman = createPodmanExecutor()

async function must(args: string[]): Promise<string> {
  const result = await podman.run(args)
  if (result.exitCode !== 0) throw new Error(`podman ${args.slice(0, 2).join(' ')}: ${result.stderr.trim()}`)
  return result.stdout.trim()
}

function files(root: string, dir = root): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (dir === root && EXCLUDED.has(name)) return []
    return statSync(path).isDirectory() ? files(root, path) : [relative(root, path)]
  }).sort()
}

function digestsOf(root: string, list: readonly string[]): string {
  const out = Bun.spawnSync(['sha256sum', ...list], { cwd: root })
  if (out.exitCode !== 0) throw new Error(`sha256sum: ${out.stderr.toString()}`)
  return out.stdout.toString()
}

const source = await must(['volume', 'inspect', volume, '--format', '{{.Mountpoint}}'])
const list = files(source)
const expected = digestsOf(source, list)
writeFileSync(join(outputs, `${volume}.sha256`), expected)

const credential = resolvePublisherCredential()
const local = `localhost/${REPOSITORY}:${tag}`
await must(['build', '--label', `${LIFECYCLE_LABEL}=permanent`, '--label', `io.thyrox.volume.source=${volume}`,
  '--ignorefile', join(probes, 'archive.ignore'), '-f', join(probes, 'Containerfile'), '-t', local, source])

const evidence = {
  definition: { repository: 'NestorMonroy/thyrox', commit, path: relative(join(probes, '..', '..', '..', '..'), join(probes, 'Containerfile')) },
  validation: { passed: true as const, evidenceRef: `${volume}.sha256: ${list.length} archivos` },
  provenance: { builder: 'podman', purpose: `archivo del volumen ${volume}` },
}
const promoted = await promoteCandidate(podman, local, evidence, { forbiddenValues: secretForms(credential) })
const publisher = createDockerHubRegistry({ podman, auth: registryAuthFor(credential) })
const pinned = await publishPromotedImage(publisher, promoted, { registry: 'docker.io', repository: `${credential.username}/${REPOSITORY}`, tag })
const reference = canonicalReference(pinned)
await must(['rmi', '-f', local, reference])

const consumer = createDockerHubRegistry({ podman })
await consumer.reader.pull(pinned)
const mounted = await must(['image', 'mount', reference])
let observed: string
try { observed = digestsOf(join(mounted, 'data'), list) } finally { await podman.run(['image', 'unmount', reference]) }
await must(['rmi', '-f', reference])

const verdict = { volume, reference, files: list.length, identical: observed === expected }
writeFileSync(join(outputs, `${volume}.verdict.json`), `${JSON.stringify(verdict, null, 2)}\n`)
console.log(JSON.stringify(verdict))
process.exit(verdict.identical ? 0 : 1)
