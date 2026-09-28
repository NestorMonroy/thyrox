/**
 * Cerrar Sentry al apagar no carga Sentry (#183).
 *
 * `gracefulShutdown` importaba `closeSentry` de `sentry.ts`, y con él
 * `@sentry/node` entero, en todo arranque —incluidos los que nunca inicializan
 * Sentry porque `SENTRY_DSN` no está—. El cierre vive ahora en
 * `sentryShutdown.ts`, sin dependencias: `initSentry` le registra su cierre, y
 * sin registro el cierre no hace nada.
 *
 * Qué lo haría fallar: que `sentryShutdown.ts` vuelva a importar `@sentry/node`
 * (caso de módulos cargados), o que el cierre registrado no se invoque.
 */
import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import { closeSentry, registerSentryCloser } from '../src/sentryShutdown.ts'

const MODULE = join(import.meta.dir, '..', 'src', 'sentryShutdown.ts')

describe('cierre de Sentry al apagar', () => {
  test('importar el cierre no carga @sentry/node', () => {
    const script = `await import(${JSON.stringify(MODULE)}); console.log(Object.keys(require.cache).filter(p => p.includes('@sentry')).length)`
    const done = Bun.spawnSync(['bun', '-e', script], { stdin: 'ignore' })
    expect(done.stdout.toString().trim()).toBe('0')
  })

  test('sin cierre registrado, cerrar no hace nada y resuelve', async () => {
    registerSentryCloser(undefined)
    await expect(closeSentry(10)).resolves.toBeUndefined()
  })

  test('el cierre registrado recibe el plazo', async () => {
    const seen: number[] = []
    registerSentryCloser(async timeoutMs => { seen.push(timeoutMs) })
    await closeSentry(1234)
    registerSentryCloser(undefined)
    expect(seen).toEqual([1234])
  })

  test('un cierre que falla no rompe el apagado', async () => {
    registerSentryCloser(async () => { throw new Error('network down') })
    await expect(closeSentry(10)).resolves.toBeUndefined()
    registerSentryCloser(undefined)
  })
})
