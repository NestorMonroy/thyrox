/**
 * Porte de `ccnmt: packages/app-host/src/bootstrap/__tests__/cwd.test.ts`
 * — el directorio de trabajo actual, con override por `AsyncLocalStorage`
 * para que agentes concurrentes vean cada uno su propio cwd.
 *
 * Descripciones traducidas al español; identificadores, datos y
 * aserciones conservados verbatim contra la fuente.
 */
import { describe, expect, test } from 'bun:test'
import { pwd, runWithCwdOverride, getCwd } from '../cwd.js'

describe('runWithCwdOverride — aislamiento por AsyncLocalStorage', () => {
  test('dentro del override, pwd() devuelve el valor sobrepuesto', () => {
    runWithCwdOverride('/tmp/override-1', () => {
      expect(pwd()).toBe('/tmp/override-1')
    })
  })

  test('fuera del override, pwd() devuelve el cwd global', () => {
    // Sin un override activo, pwd() recae en getCwdState(). Solo se
    // verifica que devuelva algo (una cadena de ruta real).
    expect(typeof pwd()).toBe('string')
    expect(pwd().length).toBeGreaterThan(0)
  })

  test('el override es async-local — corridas concurrentes NO colisionan', async () => {
    // Dos corridas paralelas con cwds distintos. Cada una debe ver solo el suyo.
    const a = runWithCwdOverride('/tmp/a', async () => {
      await new Promise(r => setTimeout(r, 0))
      return pwd()
    })
    const b = runWithCwdOverride('/tmp/b', async () => {
      await new Promise(r => setTimeout(r, 0))
      return pwd()
    })
    const [resA, resB] = await Promise.all([a, b])
    expect(resA).toBe('/tmp/a')
    expect(resB).toBe('/tmp/b')
  })

  test('overrides anidados — el interno reemplaza al externo; el externo se restaura al salir', () => {
    runWithCwdOverride('/outer', () => {
      expect(pwd()).toBe('/outer')
      runWithCwdOverride('/inner', () => {
        expect(pwd()).toBe('/inner')
      })
      // Tras salir del interno, el externo se restaura.
      expect(pwd()).toBe('/outer')
    })
  })

  test('runWithCwdOverride devuelve el valor de retorno del callback', () => {
    expect(runWithCwdOverride('/x', () => 42)).toBe(42)
  })

  test('callback async — el contexto sobrevive al await', async () => {
    const result = await runWithCwdOverride('/async-cwd', async () => {
      await new Promise(r => setTimeout(r, 0))
      return pwd()
    })
    expect(result).toBe('/async-cwd')
  })
})

describe('getCwd — envoltorio defensivo', () => {
  // NOTA: otros tests de la suite (notablemente
  // packages/storage/src/__tests__/path.test.ts) hacen mock.module del
  // módulo cwd.js para sobrescribir getCwd. mock.module en bun:test es
  // GLOBAL a través de toda la corrida de tests — ver
  // ~/.claude/.../memory/feedback_bun_mock_module_global_scope.md.
  //
  // Aquí SOLO se puede probar el camino dentro-del-override, porque ese
  // camino pasa por pwd() (no mockeado) → cwdOverrideStorage.getStore()
  // (real). El camino de caída pasa por getCwdState(), que otro test ya
  // pudo haber sombreado vía mock.module — se estaría aseverando contra
  // el valor mockeado.

  test('devuelve un string (con override o con la caída por defecto)', () => {
    expect(typeof getCwd()).toBe('string')
    expect(getCwd().length).toBeGreaterThan(0)
  })
})
