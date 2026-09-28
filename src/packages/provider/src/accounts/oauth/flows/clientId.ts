/**
 * El client id de un flujo OAuth sale de su variable y de nada más: sin ella
 * el flujo rehúsa nombrándola, en vez de usar un id de cliente ajeno
 * incrustado en el código.
 */
export type Environment = Record<string, string | undefined>

export interface ClientIdSource {
  clientId: string | null
  /** La variable que lo declara, para nombrarla cuando falta. */
  clientIdVariable: string
}

export function readVariable(env: Environment, name: string): string | null {
  const value = env[name]?.trim()
  return value ? value : null
}

export function requireClientId(source: ClientIdSource): string {
  if (!source.clientId) {
    throw new Error(`${source.clientIdVariable} is not set: declare the OAuth client id of this provider to log in.`)
  }
  return source.clientId
}
