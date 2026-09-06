/**
 * Resolución de rutas de caché para directorios de logs/transcripts/mcp-logs.
 *
 * Adaptación fiel de `ccnmt: packages/storage/src/cache-paths.ts`. Sigue
 * viviendo en storage porque estas rutas determinan dónde se persisten en
 * disco los transcripts, logs de error y logs de MCP. El directorio de
 * caché es por-proyecto, derivado del cwd.
 *
 * Deps host-provided:
 *   - cwdFn: retorna process.cwd() (o un valor mockeado en tests)
 *   - djb2HashFn: hash de respaldo para nombres de proyecto largos
 *
 * Ambos tienen defaults sensatos basados en built-ins de Node.
 */

import envPaths from 'env-paths'
import { join } from 'path'

const paths = envPaths('claude-cli')

// ---------------------------------------------------------------------------
// Inyección de dependencias basada en setters — mantiene storage libre de
// imports cruzados a otros paquetes del árbol.
// ---------------------------------------------------------------------------

let _cwd: () => string = () => process.cwd()
let _djb2Hash: (s: string) => number = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return h >>> 0
}

export function setCwdFn(fn: () => string): void {
  _cwd = fn
}

export function setDjb2HashFn(fn: (s: string) => number): void {
  _djb2Hash = fn
}

// ---------------------------------------------------------------------------
// sanitizePath local, usando djb2Hash — NO la versión compartida que otro
// módulo del paquete pudiera exponer con un hash distinto (p. ej. wyhash de
// Bun). Los nombres de directorio de caché deben permanecer estables entre
// actualizaciones para no huerfanar la caché existente (logs de error, logs
// de MCP).
// ---------------------------------------------------------------------------

const MAX_SANITIZED_LENGTH = 200

function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-')
  if (sanitized.length <= MAX_SANITIZED_LENGTH) return sanitized
  return `${sanitized.slice(0, MAX_SANITIZED_LENGTH)}-${Math.abs(_djb2Hash(name)).toString(36)}`
}

function getProjectDir(cwd: string): string {
  return sanitizePath(cwd)
}

export const CACHE_PATHS = {
  baseLogs: () => join(paths.cache, getProjectDir(_cwd())),
  errors: () => join(paths.cache, getProjectDir(_cwd()), 'errors'),
  messages: () => join(paths.cache, getProjectDir(_cwd()), 'messages'),
  mcpLogs: (serverName: string) =>
    join(
      paths.cache,
      getProjectDir(_cwd()),
      // Sanea el nombre del servidor para compat con Windows (':' está
      // reservado para letras de unidad).
      `mcp-logs-${sanitizePath(serverName)}`,
    ),
}
