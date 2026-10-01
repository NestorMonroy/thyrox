/**
 * La credencial de un registro de imágenes, por rol (TASK-THYROX-0725).
 *
 * Hoy existe un solo rol con credencial: el **publicador**, con un PAT de
 * Docker Hub con permiso Read & Write y sin Delete. El consumidor de una
 * imagen pública no la necesita: hace `pull` anónimo por digest. Si algún día
 * hace falta un `pull` autenticado, será otra credencial, de sólo lectura,
 * nunca ésta.
 *
 * El secreto llega del entorno del proceso que publica (un secreto del
 * entorno de ejecución, no el `.env` del clon) y vive en un campo privado:
 * `JSON.stringify`, `String` y la inspección de la credencial no lo muestran.
 * Sólo `withRegistryAuthFile` lo lee, para escribir el authfile temporal.
 *
 * pendiente: guardarlo cifrado en un store propio es TASK-THYROX-0679, que
 * cubre todas las credenciales de infraestructura; esta pieza recibe el
 * secreto ya resuelto y no fija dónde se guarda.
 */

export const PUBLISHER_ENV = {
  username: 'THYROX_REGISTRY_PUBLISHER_USERNAME',
  token: 'THYROX_REGISTRY_PUBLISHER_TOKEN',
  registry: 'THYROX_REGISTRY_PUBLISHER_REGISTRY',
} as const

export const DEFAULT_REGISTRY = 'docker.io'

export type RegistryRole = 'publisher'

const REDACTED = '<redactado>'
const INSPECT = Symbol.for('nodejs.util.inspect.custom')

export class MissingRegistryCredentialError extends Error {
  constructor(readonly missing: readonly string[]) {
    super(`falta la credencial del publicador: declara ${missing.join(' y ')} en el entorno del proceso que publica`)
    this.name = 'MissingRegistryCredentialError'
  }
}

export class RegistryCredential {
  readonly #token: string

  constructor(
    readonly role: RegistryRole,
    readonly registry: string,
    readonly username: string,
    token: string,
  ) {
    this.#token = token
  }

  /** El secreto. Sólo lo llama quien escribe el authfile temporal. */
  revealToken(): string {
    return this.#token
  }

  toJSON(): Record<string, string> {
    return { role: this.role, registry: this.registry, username: this.username, token: REDACTED }
  }

  toString(): string {
    return `RegistryCredential(${this.role} ${this.username}@${this.registry}, token ${REDACTED})`
  }

  [INSPECT](): string {
    return this.toString()
  }
}

type Env = Readonly<Record<string, string | undefined>>

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== ''
}

/** La credencial del publicador; sin usuario o sin token rehúsa nombrando qué falta, nunca un valor. */
export function resolvePublisherCredential(env: Env = process.env): RegistryCredential {
  const username = env[PUBLISHER_ENV.username]
  const token = env[PUBLISHER_ENV.token]
  if (!present(username) || !present(token)) {
    const missing: string[] = []
    if (!present(username)) missing.push(PUBLISHER_ENV.username)
    if (!present(token)) missing.push(PUBLISHER_ENV.token)
    throw new MissingRegistryCredentialError(missing)
  }
  const registry = env[PUBLISHER_ENV.registry]
  return new RegistryCredential('publisher', present(registry) ? registry : DEFAULT_REGISTRY, username, token)
}
