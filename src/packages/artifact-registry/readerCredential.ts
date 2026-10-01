/**
 * La credencial con que un consumidor LEE de un registry. Sin declarar, la
 * lectura es anónima; declarada, es una credencial propia de sólo lectura.
 * Nunca es la de publicación: un consumidor que lee no necesita escribir, y
 * repartir el PAT de publicación entre sesiones lo expondría donde no hace
 * falta.
 */
import type { RegistryCredential } from './ociDistribution.js'

export const READER_ENV = {
  username: 'THYROX_REGISTRY_READER_USERNAME',
  token: 'THYROX_REGISTRY_READER_TOKEN',
} as const

const PUBLISHER_TOKEN_ENV = 'THYROX_REGISTRY_PUBLISHER_TOKEN'

export class ReaderCredentialError extends Error {
  constructor(reason: string) {
    super(`credencial de lectura inválida: ${reason}`)
    this.name = 'ReaderCredentialError'
  }
}

export function resolveReaderCredential(env: Readonly<Record<string, string | undefined>>): RegistryCredential {
  const username = env[READER_ENV.username]?.trim()
  const token = env[READER_ENV.token]?.trim()
  if (!username && !token) return { kind: 'anonymous' }
  if (!username || !token) throw new ReaderCredentialError(`declara ${READER_ENV.username} y ${READER_ENV.token} juntas, o ninguna`)
  if (token === env[PUBLISHER_TOKEN_ENV]?.trim()) throw new ReaderCredentialError('es el PAT de publicación; la lectura usa una credencial propia de sólo lectura')
  return { kind: 'basic', username, secret: () => token }
}
