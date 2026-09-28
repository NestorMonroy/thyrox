/**
 * La ruta que el usuario pasa en `--messaging-socket-path`. Porte de `G1o` de
 * 2.1.283 (`chunk-yg53q7yp.js`).
 *
 * A diferencia de la ruta automática, no hay respaldo: la ruta es la que el
 * usuario pidió, y cada rechazo es un `CliUserError` que dice qué corregir.
 * El directorio tiene que ser suyo, real y privado; si no existe, se crea con
 * modo 0700, sin atravesar un ancestro de otro usuario.
 */
import type { Stats } from 'node:fs'
import { lstat, mkdir } from 'node:fs/promises'
import { basename, dirname, isAbsolute, normalize } from 'node:path'

import { CliUserError, getErrnoCode, isENOENT } from '../errorHelpers.ts'
import { MAX_SOCKET_PATH_BYTES, isUsableLocalSocketAddress } from './socketPath.ts'

export type ExplicitSocketPathDeps = { getuid: () => number | undefined }

const PRIVATE_DIR_MODE = 0o700
const GROUP_OR_OTHER_BITS = 0o077
const PRIVATE_DIR_ADVICE = 'Use a private directory you own that only you use, e.g. mkdir -m 700 <dir> (or chmod 700 an existing one).'
const UNUSABLE_DIR_ERRNOS = new Set(['ENOTDIR', 'EACCES', 'ELOOP', 'ENAMETOOLONG'])

function checkShape(path: string): string {
  if (!isAbsolute(path)) {
    throw new CliUserError(path === ''
      ? '--messaging-socket-path was given an empty value (an unset shell variable?). Pass an absolute socket path.'
      : `--messaging-socket-path must be an absolute path, got: ${path}`)
  }
  if (path.split('/').includes('..')) throw new CliUserError(`--messaging-socket-path must not contain '..' segments, got: ${path}`)
  const last = path.split('/').at(-1)
  if (last === '' || last === '.') throw new CliUserError(`--messaging-socket-path must name a socket file inside a directory, got: ${path}`)
  const normalized = normalize(path).replace(/\/+$/, '')
  if (normalized === '' || !normalized.startsWith('/') || basename(normalized) === '') {
    throw new CliUserError(`--messaging-socket-path must name a socket file inside a directory, got: ${path}`)
  }
  if (!isUsableLocalSocketAddress(normalized) || !isUsableLocalSocketAddress(path)) {
    throw new CliUserError(`--messaging-socket-path must be a local socket path, got: ${path}`)
  }
  const bytes = Buffer.byteLength(normalized)
  if (bytes > MAX_SOCKET_PATH_BYTES) {
    throw new CliUserError(`--messaging-socket-path is too long for a Unix socket (${bytes} bytes, max ${MAX_SOCKET_PATH_BYTES}): ${normalized}. Choose a shorter path, e.g. under $XDG_RUNTIME_DIR or /tmp/<private-dir>.`)
  }
  return normalized
}

/** `G1o`: valida la ruta explícita y deja su directorio creado y privado; devuelve la ruta normalizada. */
export async function validateExplicitSocketPath(path: string, deps: ExplicitSocketPathDeps = { getuid: () => process.getuid?.() }): Promise<string> {
  const normalized = checkShape(path)
  const dir = dirname(normalized)
  const uid = deps.getuid()
  const checkDir = (stats: Stats) => {
    if (stats.isSymbolicLink()) throw new CliUserError(`--messaging-socket-path directory must be a real directory, not a symlink: ${dir}. ${PRIVATE_DIR_ADVICE}`)
    if (!stats.isDirectory()) throw new CliUserError(`--messaging-socket-path parent is not a directory: ${dir}.`)
    if (uid !== undefined && stats.uid !== uid) throw new CliUserError(`--messaging-socket-path directory ${dir} is not owned by you (uid ${stats.uid}). ${PRIVATE_DIR_ADVICE}`)
    if ((stats.mode & GROUP_OR_OTHER_BITS) !== 0) {
      throw new CliUserError(`--messaging-socket-path directory ${dir} is not private (mode ${(stats.mode & 0o7777).toString(8)}); the socket directory must be mode 0700 so no other user or group can reach or replace the socket. ${PRIVATE_DIR_ADVICE}`)
    }
  }
  const statDir = async (): Promise<Stats | undefined> => {
    try {
      return await lstat(dir)
    } catch (error) {
      const code = getErrnoCode(error)
      if (isENOENT(error)) return undefined
      if (code !== undefined && UNUSABLE_DIR_ERRNOS.has(code)) {
        throw new CliUserError(`--messaging-socket-path directory is not usable: ${dir} (${code}). Fix the path or its permissions, or choose another path. ${PRIVATE_DIR_ADVICE}`)
      }
      throw new CliUserError(`--messaging-socket-path directory could not be examined: ${dir} (${code ?? String(error)}). ${PRIVATE_DIR_ADVICE}`)
    }
  }
  const existing = await statDir()
  if (existing !== undefined) {
    checkDir(existing)
    return normalized
  }
  const missingAncestors: string[] = []
  for (let ancestor = dirname(dir); ; ancestor = dirname(ancestor)) {
    let stats: Stats | undefined
    try {
      stats = await lstat(ancestor)
    } catch (error) {
      if (!isENOENT(error)) throw new CliUserError(`--messaging-socket-path: cannot inspect ${ancestor} (${getErrnoCode(error) ?? String(error)}). ${PRIVATE_DIR_ADVICE}`)
      missingAncestors.unshift(ancestor)
    }
    if (stats !== undefined) {
      if (uid !== undefined && stats.uid !== uid && stats.uid !== 0) {
        const kind = stats.isSymbolicLink() ? 'is a symlink' : 'is a directory'
        const how = stats.isSymbolicLink() ? 'through' : 'inside'
        throw new CliUserError(`--messaging-socket-path: ${ancestor} ${kind} owned by another user — refusing to create your sockets directory ${how} it. ${PRIVATE_DIR_ADVICE}`)
      }
      break
    }
    if (dirname(ancestor) === ancestor) break
  }
  try {
    for (const ancestor of missingAncestors) {
      try {
        await mkdir(ancestor, { mode: PRIVATE_DIR_MODE })
      } catch (error) {
        if (getErrnoCode(error) !== 'EEXIST') throw error
        const raced = await lstat(ancestor)
        if (!raced.isDirectory() || (uid !== undefined && raced.uid !== uid)) {
          throw new CliUserError(`--messaging-socket-path: ${ancestor} appeared while your sockets directory was being created and is not a directory you own — refusing to use it. ${PRIVATE_DIR_ADVICE}`)
        }
      }
    }
    try {
      await mkdir(dir, { mode: PRIVATE_DIR_MODE })
    } catch (error) {
      if (getErrnoCode(error) !== 'EEXIST') throw error
    }
  } catch (error) {
    if (error instanceof CliUserError) throw error
    throw new CliUserError(`--messaging-socket-path directory ${dir} does not exist and could not be created (${getErrnoCode(error) ?? String(error)}). ${PRIVATE_DIR_ADVICE}`)
  }
  const created = await statDir()
  if (created === undefined) throw new CliUserError(`--messaging-socket-path directory ${dir} vanished while being set up. ${PRIVATE_DIR_ADVICE}`)
  checkDir(created)
  return normalized
}
