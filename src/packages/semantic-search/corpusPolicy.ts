/**
 * La política de ingesta del corpus (ADR-THYROX-008, D5): qué orígenes entran
 * y con qué visibilidad. Un archivo no entra por existir; entra porque su
 * dominio está declarado aquí.
 *
 * Visibilidad:
 * - `shared`: corpus durable compartido. Sin dueño y sin TTL.
 * - `private`: contenido de un usuario o workspace que se decidió persistir.
 *   Lleva siempre a su dueño y tampoco caduca.
 * - `ephemeral`: no entra al corpus durable. Pasar a `private` o `shared` es
 *   una promoción explícita del llamador, nunca un efecto de ingerir.
 *
 * La política es un parámetro de quien abre el store; la inicial es la que el
 * ejecutor decidió para la primera versión.
 */
import type { DocumentInput } from './corpus.ts'
import { EphemeralContentError, InvalidCorpusInputError, UndeclaredCorpusDomainError } from './errors.ts'

export type CorpusVisibility = 'shared' | 'private' | 'ephemeral'

/** Las visibilidades que persisten; `ephemeral` nunca llega a una fila. */
export type DurableVisibility = Exclude<CorpusVisibility, 'ephemeral'>

export type DomainDeclaration = { domain: string; visibility: DurableVisibility }

export type CorpusPolicy = { domains: readonly DomainDeclaration[] }

/** La visibilidad con que un documento admitido se guarda, y su dueño si es privado. */
export type Admission = { visibility: DurableVisibility; owner: string | null }

/** D5, primera versión: findings, errors, ADRs, documentación técnica, runbooks y evidencia durable declarada. */
export const INITIAL_CORPUS_POLICY: CorpusPolicy = {
  domains: [
    { domain: 'finding', visibility: 'shared' },
    { domain: 'error', visibility: 'shared' },
    { domain: 'adr', visibility: 'shared' },
    { domain: 'technical-doc', visibility: 'shared' },
    { domain: 'runbook', visibility: 'shared' },
    { domain: 'evidence', visibility: 'shared' },
  ],
}

function declarationOf(policy: CorpusPolicy, domain: string): DomainDeclaration {
  const matches = policy.domains.filter(declaration => declaration.domain === domain)
  if (matches.length > 1) throw new InvalidCorpusInputError(`domain '${domain}' is declared twice in the corpus policy`)
  const [declaration] = matches
  if (!declaration) throw new UndeclaredCorpusDomainError(domain, policy.domains.map(candidate => candidate.domain))
  return declaration
}

function ownerOf(input: DocumentInput, visibility: DurableVisibility): string | null {
  const owner = input.owner ?? null
  if (visibility === 'shared') {
    if (owner !== null) throw new InvalidCorpusInputError(`shared document '${input.domainId}' cannot have an owner, got '${owner}'`)
    return null
  }
  if (owner === null || owner.trim() === '') throw new InvalidCorpusInputError(`private document '${input.domainId}' needs a non-blank owner`)
  return owner
}

/** Decide si el documento entra al corpus durable y con qué visibilidad; rehúsa nombrando la causa. */
export function admitDocument(policy: CorpusPolicy, input: DocumentInput): Admission {
  if (input.visibility === 'ephemeral') throw new EphemeralContentError(input.domainId)
  const declaration = declarationOf(policy, input.domain)
  if (input.visibility !== undefined && input.visibility !== declaration.visibility) {
    throw new InvalidCorpusInputError(
      `domain '${input.domain}' is declared ${declaration.visibility}; document '${input.domainId}' asked for ${input.visibility}`,
    )
  }
  return { visibility: declaration.visibility, owner: ownerOf(input, declaration.visibility) }
}
