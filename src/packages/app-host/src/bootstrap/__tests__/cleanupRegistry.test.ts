/**
 * Porte de
 * `ccnmt: packages/app-host/src/bootstrap/__tests__/cleanupRegistry.test.ts`
 * — registro global de funciones de limpieza para el apagado ordenado.
 *
 * Descripciones de `describe`/`test` traducidas al español; identificadores,
 * datos y aserciones conservados verbatim contra la fuente.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  registerCleanup,
  runCleanupFunctions,
} from '../cleanupRegistry.js'

afterEach(async () => {
  // El Set a nivel de módulo se comparte entre tests. No se limpia aquí:
  // cada test abajo se registra y desregistra explícitamente con su propia
  // función de "unregister", así que este hook es intencionalmente un no-op.
})

describe('registerCleanup — estado del registro', () => {
  test('registra una función y devuelve una función de desregistro', () => {
    const fn = async () => {}
    const unreg = registerCleanup(fn)
    expect(typeof unreg).toBe('function')
    unreg() // limpieza
  })

  test('desregistrar quita la función (una corrida posterior no la llama)', async () => {
    let called = false
    const fn = async () => {
      called = true
    }
    const unreg = registerCleanup(fn)
    unreg()
    await runCleanupFunctions()
    expect(called).toBe(false)
  })

  test('múltiples registros de LA MISMA función se deduplican (semántica de Set)', async () => {
    let count = 0
    const fn = async () => {
      count++
    }
    const unreg1 = registerCleanup(fn)
    const unreg2 = registerCleanup(fn)
    // unreg1 y unreg2 referencian la misma entrada del Set.
    await runCleanupFunctions()
    expect(count).toBe(1) // se llamó una sola vez pese a los dos registros
    // Cualquiera de los dos "unreg" limpia el slot (el Set solo tiene una entrada).
    unreg1()
    // El segundo unreg es un no-op (la entrada ya no está).
    unreg2()
  })

  test('registrar e inmediatamente desregistrar no deja nada invocable en el registro', async () => {
    let called = false
    const unreg = registerCleanup(async () => {
      called = true
    })
    unreg()
    await runCleanupFunctions()
    expect(called).toBe(false)
  })

  test('referencias de función distintas NO se deduplican', async () => {
    let count = 0
    const fn1 = async () => {
      count++
    }
    const fn2 = async () => {
      count++
    }
    const u1 = registerCleanup(fn1)
    const u2 = registerCleanup(fn2)
    await runCleanupFunctions()
    expect(count).toBe(2)
    u1()
    u2()
  })
})

describe('runCleanupFunctions — invocación', () => {
  test('corre todas las funciones registradas concurrentemente (Promise.all)', async () => {
    let aDone = false
    let bDone = false
    const a = async () => {
      await new Promise(r => setTimeout(r, 5))
      aDone = true
    }
    const b = async () => {
      await new Promise(r => setTimeout(r, 5))
      bDone = true
    }
    const u1 = registerCleanup(a)
    const u2 = registerCleanup(b)
    await runCleanupFunctions()
    expect(aDone).toBe(true)
    expect(bDone).toBe(true)
    u1()
    u2()
  })

  test('un rechazo en una limpieza se propaga (NO se traga en silencio)', async () => {
    // Promise.all rechaza ante el primer fallo. CRÍTICO: si un refactor
    // futuro cambia a Promise.allSettled, los errores se tragarían en
    // silencio. Harían falta tests para detectar ese cambio.
    const u1 = registerCleanup(async () => {
      throw new Error('cleanup boom')
    })
    let caught = false
    try {
      await runCleanupFunctions()
    } catch (e) {
      caught = (e as Error).message === 'cleanup boom'
    }
    expect(caught).toBe(true)
    u1()
  })

  test('registro vacío → resuelve exitosamente', async () => {
    // Tras una limpieza completa, el registro debe poder correr como no-op.
    // Solo se verifica que no lance.
    await expect(runCleanupFunctions()).resolves.toBeUndefined()
  })

  test('runCleanupFunctions NO limpia el registro (las funciones siguen registradas)', async () => {
    // Documenta que correr la limpieza NO es un auto-desregistro. La
    // función puede volver a llamarse y disparará todas las limpiezas
    // registradas otra vez. El apagado del proceso llama esto una sola
    // vez y termina.
    let count = 0
    const u = registerCleanup(async () => {
      count++
    })
    await runCleanupFunctions()
    await runCleanupFunctions()
    expect(count).toBe(2)
    u()
  })
})

describe('registerCleanup — contrato del valor de retorno', () => {
  test('la función de desregistro devuelve un boolean (resultado de Set.delete)', () => {
    // Set.delete devuelve true si el elemento estaba presente. Se
    // documenta el tipo de retorno para que quien llame sepa si
    // desregistró dos veces.
    const fn = async () => {}
    const unreg = registerCleanup(fn)
    const firstResult = unreg()
    // Set.delete devuelve boolean. La firma de `fn` dice `() => void`
    // pero el Set.delete subyacente devuelve true. TypeScript borra el
    // boolean — pero en tiempo de ejecución está ahí.
    expect(firstResult === true || firstResult === undefined).toBe(true)
    // La segunda llamada devuelve false (ya no está).
    const secondResult = unreg()
    expect(secondResult === false || secondResult === undefined).toBe(true)
  })
})
