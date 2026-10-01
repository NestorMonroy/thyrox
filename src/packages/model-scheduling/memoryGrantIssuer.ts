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
import type { ExecutionGrant } from '@thyrox/model-artifacts/executionGrant.ts'

import type { ExecutionPlan, GrantIssuer, IssueOutcome } from './scheduler.ts'

export interface MemoryGrantIssuerOptions {
  /** Vida de un grant desde que se emite. */
  readonly ttlMs: number
  readonly now: () => Date
  /** Identificador único de un grant; inyectable para pruebas reproducibles. */
  readonly newGrantId: () => string
}

export class MemoryGrantIssuer implements GrantIssuer {
  constructor(private readonly options: MemoryGrantIssuerOptions) {}

  async issue(plan: ExecutionPlan, generation: number): Promise<IssueOutcome> {
    void plan; void generation; void this.options
    throw new Error('MemoryGrantIssuer.issue: por implementar')
  }

  async revoke(grantId: string): Promise<'revoked' | 'absent'> {
    void grantId
    throw new Error('MemoryGrantIssuer.revoke: por implementar')
  }

  /** El grant está emitido, no revocado y dentro de su plazo. */
  isCurrent(grant: ExecutionGrant): boolean {
    void grant
    throw new Error('MemoryGrantIssuer.isCurrent: por implementar')
  }
}
