/**
 * Conductor de las pruebas del backend de Linux: corre UNA operación de
 * `@ant/computer-use-input` en un proceso propio y escribe su resultado como
 * JSON por stdout.
 *
 * Existe porque `Bun.spawnSync` sin `env` resuelve el ejecutable contra el PATH
 * con que ARRANCÓ el proceso, no contra `process.env.PATH` mutado en caliente
 * (medido en el banco `napi-contracts-20260927T073211`, `probe-spawn-path.ts`).
 * El `xdotool` falso sólo se ve desde un proceso que nace con él en el PATH.
 */
import * as input from '../../src/index.ts'

const [operation, argsJson] = process.argv.slice(2)
const args = JSON.parse(argsJson ?? '[]') as unknown[]
const target = (input as Record<string, unknown>)[operation!]
if (typeof target !== 'function') {
  console.error(`operación desconocida: ${operation}`)
  process.exit(2)
}
const result = await (target as (...a: unknown[]) => unknown)(...args)
console.log(JSON.stringify(result ?? null))
