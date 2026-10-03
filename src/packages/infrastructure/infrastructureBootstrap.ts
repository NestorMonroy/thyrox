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

import { lockCollisionRemedy } from '@thyrox/podman-execution/podmanLockCollision.ts'
import {
  InvalidDesiredResourceError,
  ensureResource,
  redactSecrets,
  type DesiredResource,
  type EnsureOutcome,
  type ResourceMaterializationDeps,
} from '@thyrox/podman-execution/resourceMaterialization.ts'

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

const OWNER_KIND = 'infrastructure'
/** Gravedad de cada salida para elegir la de la ejecución: rehusar pesa más que una colisión, y ésta más que un fallo. */
const EXIT_SEVERITY: Record<number, number> = { [EXIT_HEALTHY]: 0, [EXIT_FAILED]: 1, [EXIT_LOCK_COLLISION]: 2, [EXIT_REFUSED]: 3 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(record: Record<string, unknown>, field: string, index: number): void {
  if (typeof record[field] !== 'string' || record[field] === '') {
    throw new InvalidInfrastructureDeclarationError(`[${index}].${field}`, `la declaración ${index} no trae ${field}`)
  }
}

function requireSecretsByName(record: Record<string, unknown>, index: number): void {
  const secrets = record.secrets ?? []
  if (!Array.isArray(secrets)) throw new InvalidInfrastructureDeclarationError(`[${index}].secrets`, 'secrets no es un arreglo')
  secrets.forEach((secret, at) => {
    const field = `[${index}].secrets[${at}]`
    if (!isRecord(secret) || typeof secret.valueFrom !== 'string' || secret.valueFrom === '') {
      throw new InvalidInfrastructureDeclarationError(`${field}.valueFrom`, `${field} se declara con valueFrom, la variable que da su valor`)
    }
    if ('value' in secret) throw new InvalidInfrastructureDeclarationError(`${field}.value`, `${field} no lleva su valor: se declara con valueFrom`)
  })
}

/** Lee el arreglo JSON que imprime la declaración; rehúsa nombrando el campo que falta. */
export function parseInfrastructureDeclarations(text: string): InfrastructureDeclaration[] {
  const parsed: unknown = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new InvalidInfrastructureDeclarationError('$', 'se espera un arreglo de declaraciones')
  parsed.forEach((declaration, index) => {
    if (!isRecord(declaration)) throw new InvalidInfrastructureDeclarationError(`[${index}]`, `la declaración ${index} no es un objeto`)
    requireString(declaration, 'name', index)
    requireString(declaration, 'image', index)
    if (!isRecord(declaration.network)) throw new InvalidInfrastructureDeclarationError(`[${index}].network`, `la declaración ${index} no trae network`)
    requireSecretsByName(declaration, index)
  })
  return parsed as InfrastructureDeclaration[]
}

function statusLine(outcome: EnsureOutcome): string {
  const yesNo = (value: boolean) => (value ? 'yes' : 'no')
  const volumes = outcome.volumes.map(volume => `${volume.volume}:${volume.state}`).join(',') || '-'
  return `${outcome.name} action=${outcome.action} drift=${outcome.drift.join(',') || '-'} created=${yesNo(outcome.created)} started=${yesNo(outcome.started)} health=${outcome.health} provision=${outcome.provision ?? 'not-checked'} volumes=${volumes}`
}

type Verdict = { exitCode: number; problem?: string }

function verdictOf(outcome: EnsureOutcome): Verdict {
  if (outcome.action !== 'failed') return { exitCode: EXIT_HEALTHY }
  if (outcome.drift.includes('ownership-collision')) {
    return { exitCode: EXIT_REFUSED, problem: `${outcome.name}: un contenedor con ese nombre pertenece a otro dueño; no se adopta ni se toca` }
  }
  const failure = outcome.failure
  const detail = failure ? `${failure.stage}: ${failure.message}` : 'fallo sin etapa'
  if (failure?.lockCollision) return { exitCode: EXIT_LOCK_COLLISION, problem: `${outcome.name}: ${detail}\n${lockCollisionRemedy(outcome.name)}` }
  return { exitCode: EXIT_FAILED, problem: `${outcome.name}: ${detail}` }
}

/** Los valores de los secretos declarados, o las variables que faltan. */
function resolveSecrets(declaration: InfrastructureDeclaration, environment: Readonly<Record<string, string | undefined>>): { values: Map<string, string>; missing: DeclaredSecret[] } {
  const values = new Map<string, string>()
  const missing: DeclaredSecret[] = []
  for (const secret of declaration.secrets ?? []) {
    const value = environment[secret.valueFrom]
    if (value) values.set(secret.secret, value)
    else missing.push(secret)
  }
  return { values, missing }
}

function desiredOf(declaration: InfrastructureDeclaration, ownerPid: number): DesiredResource {
  const { secrets, ...rest } = declaration
  return {
    ...rest,
    kind: 'infrastructure',
    owner: { kind: OWNER_KIND, id: INFRASTRUCTURE_OWNER_ID, pid: ownerPid },
    secrets: (secrets ?? []).map(({ secret, target }) => ({ secret, target })),
  }
}

function moreSevere(current: number, candidate: number): number {
  return (EXIT_SEVERITY[candidate] ?? 0) > (EXIT_SEVERITY[current] ?? 0) ? candidate : current
}

/**
 * Materializa cada declaración, en orden, por la primitiva. Un secreto sin
 * valor o una declaración inválida rehúsan ese recurso sin tocar Podman; los
 * demás siguen. La salida es la más grave de todas.
 */
export async function bootstrapInfrastructure(
  deps: ResourceMaterializationDeps,
  declarations: readonly InfrastructureDeclaration[],
  environment: Readonly<Record<string, string | undefined>>,
  ownerPid: number,
): Promise<BootstrapReport> {
  const report: BootstrapReport = { exitCode: EXIT_HEALTHY, outcomes: [], lines: [], problems: [] }
  for (const declaration of declarations) {
    const { values, missing } = resolveSecrets(declaration, environment)
    if (missing.length > 0) {
      for (const secret of missing) report.problems.push(`${declaration.name}: falta ${secret.valueFrom}, el valor del secreto ${secret.secret}; no se materializa`)
      report.exitCode = moreSevere(report.exitCode, EXIT_REFUSED)
      continue
    }
    let outcome: EnsureOutcome
    try {
      outcome = await ensureResource(deps, desiredOf(declaration, ownerPid), values)
    } catch (error) {
      if (!(error instanceof InvalidDesiredResourceError)) throw error
      report.problems.push(`${declaration.name}: declaración inválida en ${error.field}: ${redactSecrets(error.message, values)}`)
      report.exitCode = moreSevere(report.exitCode, EXIT_REFUSED)
      continue
    }
    report.outcomes.push(outcome)
    report.lines.push(statusLine(outcome))
    const verdict = verdictOf(outcome)
    if (verdict.problem) report.problems.push(verdict.problem)
    report.exitCode = moreSevere(report.exitCode, verdict.exitCode)
  }
  return report
}
