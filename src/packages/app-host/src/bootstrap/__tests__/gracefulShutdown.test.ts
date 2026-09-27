/**
 * El apagado ordenado, ejecutado — no leído como texto.
 *
 * `bootstrap/gracefulShutdown.ts` declaraba este archivo pendiente porque el
 * módulo no se podía importar: seis dependencias de paquete no existían.
 * Medido el 2026-09-27: se importa y expone sus siete símbolos, así que el
 * contrato se prueba ejecutándolo. `gracefulShutdown.behavior.test.ts` sigue
 * fijando la FORMA del código; éste fija la CONDUCTA.
 *
 * `process.exit` se sustituye por un espía que registra el código y vuelve:
 * con `NODE_ENV=test`, `forceExit` admite que el espía vuelva en vez de salir.
 *
 * Qué haría fallar a este control:
 * - que el apagado no corriera las funciones de limpieza registradas antes
 *   de salir (anulado, medido: sin `runCleanupFunctions` caen los casos 1
 *   y 2, porque los dos cuentan la limpieza);
 * - que un segundo apagado concurrente volviera a limpiar o a salir (caso 2);
 * - que `gracefulShutdownSync` no fijara `process.exitCode` antes de volver
 *   (caso 3), que es lo que permite saber que se llamó.
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
let exitSpy: ReturnType<typeof spyOn>
const unregister: Array<() => void> = []
const previousExitCode = process.exitCode

beforeAll(() => {
  installConfigHostBindings(new InMemoryConfig().bindings)
})

beforeEach(() => {
  exits = []
  exitSpy = spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code ?? 0)
  }) as never)
  resetShutdownState()
})

afterEach(async () => {
  await getPendingShutdownForTesting()
  exitSpy.mockRestore()
  for (const off of unregister.splice(0)) off()
  resetShutdownState()
  process.exitCode = previousExitCode
})

describe('gracefulShutdown', () => {
  test('1. corre la limpieza registrada y luego sale con su código', async () => {
    const order: string[] = []
    unregister.push(registerCleanup(async () => { order.push('cleanup') }))
    exitSpy.mockImplementation(((code?: number) => { order.push(`exit:${code}`); exits.push(code ?? 0) }) as never)
    await gracefulShutdown(3)
    expect(order).toEqual(['cleanup', 'exit:3'])
    expect(process.exitCode).toBe(3)
  })

  test('2. un segundo apagado mientras el primero corre no limpia ni sale otra vez', async () => {
    let cleanups = 0
    unregister.push(registerCleanup(async () => { cleanups++ }))
    const first = gracefulShutdown(0)
    expect(isShuttingDown()).toBe(true)
    await gracefulShutdown(9)
    await first
    expect([cleanups, exits]).toEqual([1, [0]])
  })

  test('3. la versión síncrona fija process.exitCode antes de volver', async () => {
    gracefulShutdownSync(7)
    expect(process.exitCode).toBe(7)
    await getPendingShutdownForTesting()
    expect(exits).toEqual([7])
  })

  test('4. resetShutdownState deja volver a apagar', async () => {
    await gracefulShutdown(1)
    resetShutdownState()
    expect(isShuttingDown()).toBe(false)
    await gracefulShutdown(2)
    expect(exits).toEqual([1, 2])
  })
})
