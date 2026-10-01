/**
 * El puerto de registro de imágenes de Thyrox (TASK-THYROX-0725).
 *
 * El contrato se escribe desde lo que Thyrox necesita, no desde la API de un
 * proveedor. El núcleo es OCI estándar y lo cumple cualquier registro:
 * resolver una etiqueta a su digest, publicar, consumir por digest e
 * inspeccionar. Lo administrativo —crear o borrar un repositorio, cambiar su
 * visibilidad, borrar una imagen— depende del proveedor y es una capacidad
 * opcional: un consumidor que sólo publica o sólo consume no depende de ella.
 *
 * El puerto no conoce credenciales: un adapter recibe un `RegistryAuth`, que
 * entrega un authfile temporal y lo retira. El secreto pertenece a quien
 * implementa ese puerto, nunca al registro.
 */
import type { ImageReference, PinnedImageReference } from './imageReference.ts'

export const CORE_CAPABILITIES = ['resolve', 'pull', 'push', 'inspect'] as const

export const ADMINISTRATIVE_CAPABILITIES = ['deleteImage', 'createRepository', 'setVisibility', 'deleteRepository'] as const

export type CoreCapability = (typeof CORE_CAPABILITIES)[number]

export type AdministrativeCapability = (typeof ADMINISTRATIVE_CAPABILITIES)[number]

export type RegistryCapability = CoreCapability | AdministrativeCapability

export type RepositoryVisibility = 'public' | 'private'

/** Lo que se sabe de una imagen fijada por digest. */
export type ImageDescription = { reference: PinnedImageReference }

/** Entrega un authfile temporal para una operación y lo retira al terminar. */
export interface RegistryAuth {
  withAuthFile<T>(body: (authFile: string) => Promise<T>): Promise<T>
}

/** Consumir: resolver una etiqueta, traer y describir una imagen fijada por digest. */
export interface RegistryReader {
  resolve(reference: ImageReference): Promise<PinnedImageReference>
  pull(reference: PinnedImageReference): Promise<PinnedImageReference>
  inspect(reference: PinnedImageReference): Promise<ImageDescription>
}

/** Publicar: subir una imagen local y devolverla fijada por el digest que asignó el registro. */
export interface RegistryWriter {
  push(localImage: string, destination: ImageReference): Promise<PinnedImageReference>
}

/** Operaciones propias del proveedor; cada una existe sólo si su capacidad está declarada. */
export interface RegistryAdministrator {
  createRepository?(repository: string, visibility: RepositoryVisibility): Promise<void>
  setVisibility?(repository: string, visibility: RepositoryVisibility): Promise<void>
  deleteRepository?(repository: string): Promise<void>
  deleteImage?(reference: PinnedImageReference): Promise<void>
}

export interface ImageRegistry {
  readonly provider: string
  readonly registry: string
  readonly capabilities: ReadonlySet<RegistryCapability>
  readonly reader: RegistryReader
  readonly writer?: RegistryWriter
  readonly administrator?: RegistryAdministrator
}

export class UnsupportedRegistryCapabilityError extends Error {
  constructor(
    readonly provider: string,
    readonly capability: RegistryCapability,
  ) {
    super(`el proveedor de registro '${provider}' no ofrece la capacidad '${capability}'`)
    this.name = 'UnsupportedRegistryCapabilityError'
  }
}

export class ForeignRegistryError extends Error {
  constructor(provider: string, expected: string, received: string) {
    super(`el proveedor '${provider}' opera sobre el registro ${expected}; la referencia es de ${received}`)
    this.name = 'ForeignRegistryError'
  }
}

export function supports(registry: ImageRegistry, capability: RegistryCapability): boolean {
  return registry.capabilities.has(capability)
}

export function requireWriter(registry: ImageRegistry): RegistryWriter {
  if (!supports(registry, 'push') || registry.writer === undefined) throw new UnsupportedRegistryCapabilityError(registry.provider, 'push')
  return registry.writer
}

export function requireAdministration<K extends AdministrativeCapability>(
  registry: ImageRegistry,
  capability: K,
): NonNullable<RegistryAdministrator[K]> {
  const operation = registry.administrator?.[capability]
  if (!supports(registry, capability) || operation === undefined) throw new UnsupportedRegistryCapabilityError(registry.provider, capability)
  return operation.bind(registry.administrator) as NonNullable<RegistryAdministrator[K]>
}
