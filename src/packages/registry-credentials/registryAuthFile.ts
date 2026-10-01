/**
 * El authfile temporal con que Podman publica (TASK-THYROX-0725).
 *
 * No se hace `podman login`: dejaría la credencial en el authfile por defecto
 * del usuario (`${XDG_RUNTIME_DIR}/containers/auth.json`) después de
 * terminar, y la primitiva no puede pasar el secreto por stdin. En su lugar se
 * escribe un authfile propio —el formato que Podman lee con `--authfile`—, 0600
 * dentro de un directorio 0700 creado para esta operación, fuera de todo
 * workspace, y se borra al terminar el cuerpo, haya ido bien o mal.
 *
 * El authfile guarda `usuario:token` en base64, que no es cifrado: por eso
 * vive sólo lo que dura el `push`. Un error que salga del cuerpo se devuelve
 * con el token y su base64 sustituidos.
 */
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

import type { RegistryCredential } from './registryCredential.ts'

const AUTH_FILE_NAME = 'auth.json'
const DIRECTORY_MODE = 0o700
const FILE_MODE = 0o600
const REDACTED = '<redactado>'

export type AuthFileOptions = {
  /** Dónde crear el directorio temporal; sin él, `XDG_RUNTIME_DIR` o el temporal del sistema. */
  runtimeDir?: string
  /** Raíces dentro de las que no se admite el authfile; sin ellas, el directorio actual y `THYROX_ROOT`. */
  workspaceRoots?: readonly string[]
}

export class AuthFileLocationError extends Error {
  constructor(directory: string, root: string) {
    super(`el authfile no puede vivir en ${directory}: está dentro del workspace ${root}`)
    this.name = 'AuthFileLocationError'
  }
}

function defaultWorkspaceRoots(): string[] {
  return [process.cwd(), process.env.THYROX_ROOT].filter((root): root is string => root !== undefined && root !== '')
}

function isInside(directory: string, root: string): boolean {
  const path = relative(resolve(root), resolve(directory))
  return path === '' || (!path.startsWith('..') && !path.startsWith('/'))
}

/** Las formas en que el secreto puede aparecer en un texto: el token y el base64 del par usuario:token. */
export function secretForms(credential: RegistryCredential): string[] {
  const token = credential.revealToken()
  return [token, Buffer.from(`${credential.username}:${token}`).toString('base64')]
}

/** Devuelve el error con toda forma del secreto sustituida en su mensaje y su pila. */
export function redactSecret(error: unknown, credential: RegistryCredential): Error {
  const failure = error instanceof Error ? error : new Error(String(error))
  for (const form of secretForms(credential)) {
    failure.message = failure.message.replaceAll(form, REDACTED)
    if (failure.stack !== undefined) failure.stack = failure.stack.replaceAll(form, REDACTED)
  }
  return failure
}

function authFileContent(credential: RegistryCredential): string {
  const auth = Buffer.from(`${credential.username}:${credential.revealToken()}`).toString('base64')
  return `${JSON.stringify({ auths: { [credential.registry]: { auth } } })}\n`
}

/** Corre `body` con la ruta de un authfile temporal y lo retira siempre al terminar. */
export async function withRegistryAuthFile<T>(
  credential: RegistryCredential,
  body: (authFile: string) => Promise<T>,
  options: AuthFileOptions = {},
): Promise<T> {
  const runtimeDir = options.runtimeDir ?? (process.env.XDG_RUNTIME_DIR || tmpdir())
  for (const root of options.workspaceRoots ?? defaultWorkspaceRoots()) {
    if (isInside(runtimeDir, root)) throw new AuthFileLocationError(runtimeDir, root)
  }
  const directory = mkdtempSync(join(runtimeDir, 'thyrox-registry-'))
  try {
    chmodSync(directory, DIRECTORY_MODE)
    const authFile = join(directory, AUTH_FILE_NAME)
    writeFileSync(authFile, authFileContent(credential), { mode: FILE_MODE })
    return await body(authFile)
  } catch (error) {
    throw redactSecret(error, credential)
  } finally {
    rmSync(directory, { recursive: true, force: true })
    if (existsSync(directory)) throw new Error(`no se pudo retirar el authfile temporal ${directory}`)
  }
}

/**
 * La credencial como proveedor de authfiles temporales: la forma que un
 * adapter de registro recibe (`RegistryAuth` de `@thyrox/image-registry`). El
 * adapter nunca ve el secreto, sólo la ruta mientras dura su operación.
 */
export function registryAuthFor(
  credential: RegistryCredential,
  options: AuthFileOptions = {},
): { withAuthFile<T>(body: (authFile: string) => Promise<T>): Promise<T> } {
  return { withAuthFile: body => withRegistryAuthFile(credential, body, options) }
}

/** Usuario y token para una API propietaria que pide la credencial en cada operación. */
export function credentialPairOf(credential: RegistryCredential): () => { username: string; token: string } {
  return () => ({ username: credential.username, token: credential.revealToken() })
}
