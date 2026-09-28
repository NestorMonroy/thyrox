/**
 * ¿Qué cuenta de Kiro guardada es la que llega? Sin comparar tokens ni
 * claves: por el ARN del perfil (sólo si además hay un identificador de
 * cuenta que no lo contradiga), el client id, el email o el nombre.
 *
 * Porte de `omniroute: src/lib/oauth/kiroConnectionIdentity.ts` (MIT).
 */
export interface KiroConnectionLike {
  id?: unknown
  authType?: unknown
  name?: unknown
  email?: unknown
  providerSpecificData?: unknown
  [key: string]: unknown
}

export interface KiroConnectionIdentity {
  authType?: unknown
  profileArn?: unknown
  clientId?: unknown
  email?: unknown
  name?: unknown
}

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function folded(value: unknown): string {
  return trimmed(value).toLowerCase()
}

function providerData(connection: KiroConnectionLike): Record<string, unknown> {
  const value = connection.providerSpecificData
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function hasAccountIdentifier(identity: KiroConnectionIdentity): boolean {
  return Boolean(folded(identity.email) || trimmed(identity.clientId))
}

/** Un campo que los dos lados traen y no coincide: son cuentas distintas. */
function contradictsAccount(connection: KiroConnectionLike, identity: KiroConnectionIdentity): boolean {
  const email = folded(identity.email)
  const existingEmail = folded(connection.email)
  if (email && existingEmail && email !== existingEmail) return true
  const clientId = trimmed(identity.clientId)
  const existingClientId = trimmed(providerData(connection).clientId)
  return Boolean(clientId && existingClientId && clientId !== existingClientId)
}

export function findKiroConnectionByIdentity(connections: KiroConnectionLike[], identity: KiroConnectionIdentity): KiroConnectionLike | null {
  const authType = folded(identity.authType)
  const candidates = authType ? connections.filter(connection => folded(connection.authType) === authType) : connections

  // Un ARN identifica el PERFIL, no la cuenta: dos cuentas Builder ID lo comparten.
  const profileArn = trimmed(identity.profileArn)
  if (profileArn) {
    const match = candidates.find(connection => trimmed(providerData(connection).profileArn) === profileArn)
    if (match && hasAccountIdentifier(identity) && !contradictsAccount(match, identity)) return match
  }

  const matchers: Array<[string, (connection: KiroConnectionLike) => string]> = [
    [trimmed(identity.clientId), connection => trimmed(providerData(connection).clientId)],
    [folded(identity.email), connection => folded(connection.email)],
    [folded(identity.name), connection => folded(connection.name)],
  ]
  for (const [wanted, read] of matchers) {
    if (!wanted) continue
    const match = candidates.find(connection => read(connection) === wanted)
    if (match) return match
  }
  return null
}
