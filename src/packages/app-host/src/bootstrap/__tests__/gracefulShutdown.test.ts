/**
 * El apagado ordenado, ejecutado — no leído como texto.
 *
 * `gracefulShutdown.behavior.test.ts` fija la FORMA del código; éste fija la
 * CONDUCTA: importa el módulo y lo ejecuta con `process.exit` y
 * `process.kill` sustituidos por espías que registran y vuelven.
 *
 * `forceExit` es el de producción (2.1.283, `Zmo.forceExit`, extraído con
 * `bin/binary symbol chunk-csayct82.js Zmo`): si `process.exit` lanza, se
 * mata con SIGKILL; y si `process.exit` VUELVE —sólo posible con un espía—
 * lanza `unreachable`. No hay rama por `NODE_ENV`: las pruebas observan la
 * misma conducta que un proceso real. Por eso cada apagado aquí termina
 * rechazado con `unreachable`, y la versión síncrona, cuyo manejador de
 * fallo vuelve a llamar a `forceExit` (igual que el ejecutable), sale dos
 * veces.
 *
 * Qué haría fallar a este control:
 * - que el apagado no corriera las funciones de limpieza registradas antes
 *   de salir (anulado, medido: sin `runCleanupFunctions` caen los casos 1
 *   y 2, porque los dos cuentan la limpieza);
 * - que un segundo apagado concurrente volviera a limpiar o a salir (caso 2);
 * - que `gracefulShutdownSync` no fijara `process.exitCode` antes de volver
 *   (caso 3);
 * - que un `process.exit` que lanza no terminara en SIGKILL, o que uno que
 *   vuelve pasara en silencio (casos 5 y 6): era la conducta del porte
 *   anterior bajo `NODE_ENV=test`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { installConfigHostBindings } from '@thyrox/config'
import { InMemoryConfig } from '@thyrox/config/testing'
import { registerCleanup } from '../cleanupRegistry.js'
import {
  getPendingShutdownForTesting,
  gracefulShutdown,
  gracefulShutdownSync,
  isShuttingDown,
  resetShutdownState,
} from '../gracefulShutdown.js'

let exits: number[] = []
let kills: Array<[number, string]> = []
let exitSpy: ReturnType<typeof spyOn>
let killSpy: ReturnType<typeof spyOn>
const unregister: Array<() => void> = []
const previousExitCode = process.exitCode

beforeAll(() => {
  installConfigHostBindings(new InMemoryConfig().bindings)
})

beforeEach(() => {
  exits = []
  kills = []
  exitSpy = spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code ?? 0)
  }) as never)
  killSpy = spyOn(process, 'kill').mockImplementation(((pid: number, signal: string) => {
    kills.push([pid, signal])
    return true
  }) as never)
  resetShutdownState()
})

afterEach(async () => {
  await getPendingShutdownForTesting()
  exitSpy.mockRestore()
  killSpy.mockRestore()
  for (const off of unregister.splice(0)) off()
  resetShutdownState()
  process.exitCode = previousExitCode
})

describe('gracefulShutdown', () => {
  test('1. corre la limpieza registrada y luego sale con su código', async () => {
    const order: string[] = []
    unregister.push(registerCleanup(async () => { order.push('cleanup') }))
    exitSpy.mockImplementation(((code?: number) => { order.push(`exit:${code}`); exits.push(code ?? 0) }) as never)
    await expect(gracefulShutdown(3)).rejects.toThrow('unreachable')
    expect(order).toEqual(['cleanup', 'exit:3'])
    expect(process.exitCode).toBe(3)
  })

  test('2. un segundo apagado mientras el primero corre no limpia ni sale otra vez', async () => {
    let cleanups = 0
    unregister.push(registerCleanup(async () => { cleanups++ }))
    const first = gracefulShutdown(0)
    expect(isShuttingDown()).toBe(true)
    await gracefulShutdown(9)
    await expect(first).rejects.toThrow('unreachable')
    expect([cleanups, exits]).toEqual([1, [0]])
  })

  test('3. la versión síncrona fija process.exitCode antes de volver', async () => {
    gracefulShutdownSync(7)
    expect(process.exitCode).toBe(7)
    await getPendingShutdownForTesting()
    expect(exits).toEqual([7, 7])
  })

  test('4. resetShutdownState deja volver a apagar', async () => {
    await expect(gracefulShutdown(1)).rejects.toThrow('unreachable')
    resetShutdownState()
    expect(isShuttingDown()).toBe(false)
    await expect(gracefulShutdown(2)).rejects.toThrow('unreachable')
    expect(exits).toEqual([1, 2])
  })
})

describe('forceExit — el mecanismo de producción', () => {
  test('5. si process.exit lanza, el proceso se mata con SIGKILL', async () => {
    exitSpy.mockImplementation((() => { throw Object.assign(new Error('write EIO'), { code: 'EIO' }) }) as never)
    await expect(gracefulShutdown(4)).rejects.toThrow('unreachable')
    expect(kills).toEqual([[process.pid, 'SIGKILL']])
  })

  test('6. si process.exit vuelve, forceExit no pasa en silencio', async () => {
    await expect(gracefulShutdown(5)).rejects.toThrow('unreachable')
    expect([exits, kills]).toEqual([[5], []])
  })
})
