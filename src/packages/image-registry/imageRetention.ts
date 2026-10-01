/**
 * Imágenes efímeras y permanentes (TASK-THYROX-0725).
 *
 * Una imagen que se construye para ejecutar una tarea —un ayudante de pruebas,
 * una sonda, un paso de un pool— es **efímera**: vive en el almacén local, no
 * se publica y se puede retirar al terminar su tarea. Una imagen que otras
 * sesiones consumen —el runtime del laboratorio de cuantización— es
 * **permanente**: se publica, se fija por digest y la recupera cualquier clon.
 *
 * La clase la declara quien construye, con la etiqueta OCI
 * `io.thyrox.image.retention`. Una imagen sin la etiqueta no se publica: no se
 * supone permanente lo que nadie declaró así.
 */
import type { PodmanExecutor } from '@thyrox/podman-execution/podmanExecutor.ts'

export const RETENTION_LABEL = 'io.thyrox.image.retention'

export type ImageRetention = 'ephemeral' | 'durable'

export const IMAGE_RETENTIONS: readonly ImageRetention[] = ['ephemeral', 'durable']

/** El argumento de build que declara la clase de una imagen. */
export function retentionLabelArgs(retention: ImageRetention): string[] {
  return ['--label', `${RETENTION_LABEL}=${retention}`]
}

export class EphemeralImageError extends Error {
  constructor(image: string, declared: string) {
    super(
      `la imagen ${image} declara ${RETENTION_LABEL}=${declared === '' ? '(sin declarar)' : declared}; sólo una imagen durable se publica`,
    )
    this.name = 'EphemeralImageError'
  }
}

/** La clase declarada de una imagen local; cadena vacía si no la declara. */
export async function readImageRetention(podman: PodmanExecutor, image: string): Promise<string> {
  const result = await podman.run(['image', 'inspect', image, '--format', `{{index .Labels "${RETENTION_LABEL}"}}`])
  if (result.exitCode !== 0) throw new Error(`no se pudo leer la retención de ${image}: ${result.stderr.trim()}`)
  const value = result.stdout.trim()
  return value === '<no value>' ? '' : value
}

export async function assertDurableImage(podman: PodmanExecutor, image: string): Promise<void> {
  const declared = await readImageRetention(podman, image)
  if (declared !== 'durable') throw new EphemeralImageError(image, declared)
}
