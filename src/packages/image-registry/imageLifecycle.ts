/**
 * El ciclo de vida de una imagen (contrato 12 de TASK-THYROX-0691).
 *
 * - `ephemeral`: construida para un trabajo concreto; tiene dueño, no se
 *   publica y se retira al terminar, o la recupera el barrido si el dueño murió.
 * - `cache`: cara de reconstruir pero prescindible; se reutiliza por su clave y
 *   se desaloja por presión de disco. Perderla nunca impide reconstruir.
 * - `permanent`: la consumen otras sesiones; vive en un registro, fijada por
 *   digest. El almacén local es sólo su caché.
 * - `infrastructure`: la de un servicio gestionado (Redis, PostgreSQL); la
 *   gobierna `infrastructure_ensure`, nunca un GC de tareas.
 *
 * La clase la declara quien construye o pide la imagen, y viaja como etiqueta
 * OCI. Nunca se deduce del nombre, de la etiqueta de versión ni de que la
 * imagen esté en el almacén.
 */

export const IMAGE_LIFECYCLES = ['ephemeral', 'cache', 'permanent', 'infrastructure'] as const

export type ImageLifecycle = (typeof IMAGE_LIFECYCLES)[number]

export const LIFECYCLE_LABEL = 'io.thyrox.image.lifecycle'
export const OWNER_KIND_LABEL = 'io.thyrox.image.owner-kind'
export const OWNER_ID_LABEL = 'io.thyrox.image.owner-id'
export const CACHE_KEY_LABEL = 'io.thyrox.image.cache-key'

export const OWNER_KINDS = ['task', 'run', 'service'] as const

export type ImageOwner = { kind: (typeof OWNER_KINDS)[number]; id: string }

/** La clase declarada en las etiquetas; `undefined` si no declara ninguna válida. */
export function lifecycleOf(labels: Readonly<Record<string, string>>): ImageLifecycle | undefined {
  const declared = labels[LIFECYCLE_LABEL]
  return IMAGE_LIFECYCLES.find(lifecycle => lifecycle === declared)
}

export function ownerOf(labels: Readonly<Record<string, string>>): ImageOwner | undefined {
  const kind = OWNER_KINDS.find(candidate => candidate === labels[OWNER_KIND_LABEL])
  const id = labels[OWNER_ID_LABEL]
  return kind === undefined || id === undefined || id === '' ? undefined : { kind, id }
}
