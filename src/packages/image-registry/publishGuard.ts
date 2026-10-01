/**
 * Publicar una imagen sólo si está declarada durable y no lleva nada del
 * entorno de build ni de la credencial (TASK-THYROX-0725).
 *
 * El historial completo de una imagen y su `Config.Env` viajan con ella, y un
 * ARG declarado en el Containerfile deja ahí su valor. Se buscan dos cosas:
 *
 * - los **valores** que el llamador declara prohibidos (el secreto de la
 *   credencial, los valores actuales del entorno de build);
 * - los **nombres** de variables de entorno de build que nunca deben quedar
 *   grabados, con cualquier valor. Un valor de una construcción anterior no
 *   coincide con el del entorno actual, así que comparar sólo valores no lo ve.
 *
 * El mensaje de rechazo nombra las variables halladas y cuenta los valores,
 * sin repetir ninguno.
 */
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

import type { ImageReference, PinnedImageReference } from './imageReference.ts'
import { type ImageRegistry, requireWriter } from './imageRegistry.ts'
import { assertDurableImage } from './imageRetention.ts'

export const BUILD_ENVIRONMENT_KEYS: readonly string[] = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']

export type PublishGuard = {
  /** Valores que no pueden viajar en la imagen: el secreto y los del entorno de build. */
  forbiddenValues: readonly string[]
  /** Variables que no pueden quedar grabadas con ningún valor; sin declarar, las de proxy. */
  forbiddenKeys?: readonly string[]
}

export class ImageLeakError extends Error {
  constructor(source: string, keys: readonly string[], valueCount: number) {
    const parts = [keys.length > 0 ? `las variables ${keys.join(', ')}` : '', valueCount > 0 ? `${valueCount} valor(es) prohibido(s)` : ''].filter(part => part !== '')
    super(`la imagen ${source} lleva ${parts.join(' y ')} en su historial o su Config.Env; no se publica`)
    this.name = 'ImageLeakError'
  }
}

async function imageText(podman: PodmanExecutor, args: readonly string[]): Promise<string> {
  const result = await podman.run(args)
  if (result.exitCode !== 0) throw new Error(`no se pudo leer la imagen (${args.slice(0, 2).join(' ')}): ${result.stderr.trim()}`)
  return result.stdout
}

function recordsKey(text: string, key: string): boolean {
  return new RegExp(`(^|[\\s"|])${key}=`).test(text)
}

export async function assertImageFreeOf(podman: PodmanExecutor, source: string, guard: PublishGuard): Promise<void> {
  const history = await imageText(podman, ['history', '--no-trunc', '--format', '{{.CreatedBy}}', source])
  const env = await imageText(podman, ['image', 'inspect', source, '--format', '{{json .Config.Env}}'])
  const recorded = `${history}\n${env}`
  const keys = (guard.forbiddenKeys ?? BUILD_ENVIRONMENT_KEYS).filter(key => recordsKey(recorded, key))
  const values = guard.forbiddenValues.filter(value => value !== '' && recorded.includes(value))
  if (keys.length > 0 || values.length > 0) throw new ImageLeakError(source, keys, values.length)
}

/** Comprueba la imagen local y la publica con el registro que se le dé, sea cual sea su proveedor. */
export async function publishImage(
  registry: ImageRegistry,
  podman: PodmanExecutor,
  localImage: string,
  destination: ImageReference,
  guard: PublishGuard,
): Promise<PinnedImageReference> {
  const writer = requireWriter(registry)
  await assertDurableImage(podman, localImage)
  await assertImageFreeOf(podman, localImage, guard)
  return writer.push(localImage, destination)
}
