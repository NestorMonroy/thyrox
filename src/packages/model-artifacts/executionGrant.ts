/**
 * Forma de un ExecutionGrant (ADR-007 1.7.0 y 1.7.1): la decisión autorizada
 * de ejecutar un modelo. La emite el ModelScheduler (TASK-THYROX-0699) y la
 * materializa la PodmanExecutionPrimitive (TASK-THYROX-0702); el adapter del
 * runtime sólo la traduce. Sin grant válido no hay ejecución de modelo (M1).
 *
 * El grant es autorización, no ejecución: no lleva PIDs ni contenedores, que
 * son de la unidad que la primitiva crea a partir de él.
 */

import type { ResolvedModelArtifact } from './resolvedModelArtifact.js'
import type { KvCacheType } from './memoryEstimate.js'

/** Runtimes subordinados que un grant puede nombrar. */
export type ModelRuntime = 'ollama' | 'llama.cpp'

/** Dónde corre: en CPU, o en un conjunto identificado de dispositivos (M6). */
export type ExecutionPlacement =
  | { readonly kind: 'cpu' }
  | {
      readonly kind: 'gpu'
      /** UUID de cada dispositivo, como lo da el GpuMemoryBackend. Nunca vacío. */
      readonly devices: readonly string[]
    }

/**
 * La instancia residente que sirve la petición. `reuse` apunta a una
 * residencia que ya existe y no se reserva otra vez (M7); `create` pide una
 * nueva con su generación.
 */
export interface ResidencyAssignment {
  readonly mode: 'reuse' | 'create'
  readonly instance: string
  readonly generation: number
}

export interface ExecutionGrant {
  readonly grantId: string
  readonly requestId: string
  /** Identidad exacta: modelo, revisión completa, artefacto, formato y cuantización. */
  readonly artifact: ResolvedModelArtifact
  readonly runtime: ModelRuntime
  readonly placement: ExecutionPlacement
  readonly residency: ResidencyAssignment
  /** VRAM de la residencia en MiB; 0 en CPU. Con `reuse` es la ya reservada. */
  readonly residencyVramMib: number
  /** VRAM incremental de esta petición en MiB; 0 en CPU. */
  readonly requestVramMib: number
  readonly contextLength: number
  readonly kvCacheType: KvCacheType
  /** Instantes ISO 8601 en UTC. Un grant caducado no autoriza nada. */
  readonly issuedAt: string
  readonly expiresAt: string
}
