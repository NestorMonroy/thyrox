/**
 * `InfrastructureBootstrap` (ADR-007 Regla 4, enmienda 1.15.0): el dueño de la
 * infraestructura gestionada. Recibe el estado deseado que declara
 * `src/lib/infrastructure.sh`, resuelve el valor de cada secreto desde la
 * variable que la declaración nombra y materializa cada recurso SÓLO por
 * `ensureResource` de `@thyrox/podman-execution`, con dueño `infrastructure`.
 * No compone ningún comando de Podman.
 *
 * Salida: una línea por recurso con su acción, deriva, salud y volúmenes;
 * los fallos van aparte, sin valores secretos.
 */

import type { DesiredResource, EnsureOutcome, ResourceMaterializationDeps } from '@thyrox/podman-execution/resourceMaterialization.ts'

/** Identificador de dueño con que este bootstrap etiqueta sus contenedores. */
export const INFRASTRUCTURE_OWNER_ID = 'infrastructure-bootstrap'

export const EXIT_HEALTHY = 0
export const EXIT_FAILED = 1
export const EXIT_REFUSED = 2
export const EXIT_LOCK_COLLISION = 3

/** Un secreto declarado: su nombre en Podman, su destino montado y la variable que da su valor. */
export type DeclaredSecret = { secret: string; target: string; valueFrom: string }

/** Lo que declara `thyrox_infrastructure_desired_resource`: el recurso sin dueño ni tipo, con secretos por nombre. */
export type InfrastructureDeclaration = Omit<DesiredResource, 'kind' | 'owner' | 'secrets'> & { secrets?: DeclaredSecret[] }

export type BootstrapReport = {
  exitCode: number
  outcomes: EnsureOutcome[]
  /** Una línea por recurso, para stdout. */
  lines: string[]
  /** Los fallos y rehúsos, sin valores secretos, para stderr. */
  problems: string[]
}

/** La declaración no es un JSON de recursos válido; nombra el campo. */
export class InvalidInfrastructureDeclarationError extends Error {
  constructor(readonly field: string, message: string) {
    super(message)
    this.name = 'InvalidInfrastructureDeclarationError'
  }
}

export function parseInfrastructureDeclarations(_text: string): InfrastructureDeclaration[] {
  throw new Error('parseInfrastructureDeclarations: sin implementar')
}

export async function bootstrapInfrastructure(
  _deps: ResourceMaterializationDeps,
  _declarations: readonly InfrastructureDeclaration[],
  _environment: Readonly<Record<string, string | undefined>>,
  _ownerPid: number,
): Promise<BootstrapReport> {
  throw new Error('bootstrapInfrastructure: sin implementar')
}
