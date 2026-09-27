/**
 * Conductor de las pruebas del backend de Linux: corre UNA operación de
 * `ComputerUseAPI` en un proceso propio y escribe su resultado como JSON.
 *
 * `Bun.spawnSync` sin `env` resuelve el ejecutable contra el PATH con que
 * arrancó el proceso (banco `napi-contracts-20260927T073211`,
 * `probe-spawn-path.ts`): las CLI falsas sólo se ven desde un proceso que
 * nace con ellas delante.
 *
 * `path` nombra la operación como `<superficie>.<método>`:
 * `display.listAll`, `apps.open`, `screenshot.captureRegion`.
 */
import { ComputerUseAPI } from '../../src/index.ts'

const [path, argsJson] = process.argv.slice(2)
const [surface, method] = (path ?? '').split('.')
const api = new ComputerUseAPI() as unknown as Record<string, Record<string, unknown>>
const target = api[surface!]?.[method!]
if (typeof target !== 'function') {
  console.error(`operación desconocida: ${path}`)
  process.exit(2)
}
const args = JSON.parse(argsJson ?? '[]') as unknown[]
const result = await (target as (...a: unknown[]) => unknown).apply(api[surface!], args)
console.log(JSON.stringify(result ?? null))
