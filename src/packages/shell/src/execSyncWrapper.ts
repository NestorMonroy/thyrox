/**
 * Porte fiel de `ccnmt: packages/shell/src/execSyncWrapper.ts`.
 *
 * Envoltorio de `execSync` con logging de operaciones lentas. Usar en
 * vez de `execSync` de `node:child_process` directo para detectar
 * problemas de rendimiento.
 *
 * @todo Migrar a los llamadores al camino asíncrono cuando sea posible.
 * `execSync` bloquea el event loop; el camino async vive en
 * `execFileNoThrow`.
 *
 * @example
 * import { execSync } from './execSyncWrapper.js'
 * const result = execSync('git status', { encoding: 'utf8' })
 *
 * Porte COMPLETO: las cuatro sobrecargas de tipo y la implementación de
 * la fuente están presentes.
 *
 * @module
 */
import {
  type ExecSyncOptions,
  type ExecSyncOptionsWithBufferEncoding,
  type ExecSyncOptionsWithStringEncoding,
  execSync as nodeExecSync,
} from 'node:child_process'
import { slowLogging } from '@thyrox/local-observability/slowOperations.js'

export function execSync(command: string): Buffer
export function execSync(
  command: string,
  options: ExecSyncOptionsWithStringEncoding,
): string
export function execSync(
  command: string,
  options: ExecSyncOptionsWithBufferEncoding,
): Buffer
export function execSync(
  command: string,
  options?: ExecSyncOptions,
): Buffer | string
export function execSync(
  command: string,
  options?: ExecSyncOptions,
): Buffer | string {
  using _ = slowLogging`execSync: ${command.slice(0, 100)}`
  return nodeExecSync(command, options)
}
