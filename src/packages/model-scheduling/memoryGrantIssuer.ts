/**
 * `MemoryGrantIssuer`: el emisor de `ExecutionGrant` del coordinador de un
 * anfitrión (ADR-007 1.14.0). Vive en el proceso del coordinador, que es la
 * única autoridad de admisión, así que su registro de grants vigentes es
 * memoria del proceso y no estado compartido.
 *
 * Emite sólo con una identidad coherente (`assertConsistentIdentity`): un plan
 * cuyo nombre contractual no abrevia sus campos no recibe grant. Cada grant
 * tiene un plazo; uno revocado o caducado deja de estar vigente aunque alguien
 * conserve su copia.
 */
import { isDeepStrictEqual } from 'node:util'

import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'
import { assertConsistentIdentity, InconsistentModelIdentityError } from '@thyrox/model-artifacts/resolvedModelArtifact.ts'

import type { ExecutionPlan, GrantIssuer, IssueOutcome } from './scheduler.ts'

export interface MemoryGrantIssuerOptions {
  /** Vida de un grant desde que se emite. */
  readonly ttlMs: number
  readonly now: () => Date
  /** Identificador único de un grant; inyectable para pruebas reproducibles. */
  readonly newGrantId: () => string
}

export class MemoryGrantIssuer implements GrantIssuer {
  /** Grants vigentes por identificador; se guarda una copia propia, no la que recibe quien la pide. */
  private readonly issued = new Map<string, ExecutionGrant>()

  constructor(private readonly options: MemoryGrantIssuerOptions) {}

  async issue(plan: ExecutionPlan, generation: number): Promise<IssueOutcome> {
    const inconsistency = identityInconsistency(plan)
    if (inconsistency !== undefined) return { status: 'failed', reason: inconsistency }
    const grant = this.grantFor(plan, generation)
    this.issued.set(grant.grantId, structuredClone(grant))
    return { status: 'issued', grant }
  }

  async revoke(grantId: string): Promise<'revoked' | 'absent'> {
    return this.issued.delete(grantId) ? 'revoked' : 'absent'
  }

  /** El grant está emitido, no revocado, sin alterar y dentro de su plazo. */
  isCurrent(grant: ExecutionGrant): boolean {
    return this.isRegisteredAsIs(grant) && this.isWithinTerm(grant)
  }

  private grantFor(plan: ExecutionPlan, generation: number): ExecutionGrant {
    const issuedAt = this.options.now()
    const expiresAt = new Date(issuedAt.getTime() + this.options.ttlMs)
    return {
      grantId: this.options.newGrantId(),
      requestId: plan.requestId,
      artifact: plan.artifact,
      runtime: plan.runtime,
      placement: plan.placement,
      residency: { mode: 'create', instance: plan.residencyKey, generation },
      residencyVramMib: plan.residencyVramMib,
      requestVramMib: plan.requestVramMib,
      contextLength: plan.contextLength,
      kvCacheType: plan.kvCacheType,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
  }

  private isRegisteredAsIs(grant: ExecutionGrant): boolean {
    return isDeepStrictEqual(this.issued.get(grant.grantId), grant)
  }

  private isWithinTerm(grant: ExecutionGrant): boolean {
    return this.options.now().getTime() < Date.parse(grant.expiresAt)
  }
}

/** El motivo por el que la identidad del plan no es coherente, o `undefined` si lo es. */
function identityInconsistency(plan: ExecutionPlan): string | undefined {
  try {
    assertConsistentIdentity(plan.artifact)
    return undefined
  } catch (error) {
    if (error instanceof InconsistentModelIdentityError) return error.message
    throw error
  }
}
