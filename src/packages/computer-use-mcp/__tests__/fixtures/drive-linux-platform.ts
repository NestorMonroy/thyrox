/**
 * Conductor de las pruebas de `legacy/platforms/linux.ts`: corre UNA operación
 * de su `platform` en un proceso propio y escribe el resultado como JSON; si la
 * operación rechaza, escribe `{"threw": "<mensaje>"}`.
 *
 * `Bun.spawnSync` sin `env` resuelve el ejecutable contra el PATH con que
 * arrancó el proceso (banco `napi-contracts-20260927T073211`,
 * `probe-spawn-path.ts`): las CLI falsas sólo se ven desde un proceso que nace
 * con ellas delante.
 */
import { platform } from '../../src/legacy/platforms/linux.ts'

const [path, argsJson] = process.argv.slice(2)
const [surface, method] = (path ?? '').split('.')
const target = (platform as unknown as Record<string, Record<string, unknown>>)[surface!]?.[method!]
if (typeof target !== 'function') {
  console.error(`operación desconocida: ${path}`)
  process.exit(2)
}
const args = JSON.parse(argsJson ?? '[]') as unknown[]
try {
  const result = await (target as (...a: unknown[]) => unknown).apply(
    (platform as unknown as Record<string, unknown>)[surface!], args)
  console.log(JSON.stringify(result ?? null))
} catch (error) {
  console.log(JSON.stringify({ threw: String(error) }))
}
