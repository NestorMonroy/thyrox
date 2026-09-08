/**
 * La mitad ROJA de `appRuntime` — el adaptador de host bindings de swarm.
 *
 * Procedencia: `ccnmt: packages/swarm/src/adapters/appRuntime.ts` (595 líneas,
 * 148 exports). Ese árbol declara `"license": "UNLICENSED"`, así que el cuerpo
 * se reimplementa y no se copia; la LISTA de nombres de binding sí se deriva de
 * la fuente, porque es el contrato y no texto.
 *
 * POR QUÉ AHORA. La tarea #240 declaraba a este módulo bloqueado porque
 * «appRuntime cruza 3 tipos». Re-medido: su único import externo es `zod`, ya
 * presente, y sus dos referencias a hermanos son reexportaciones de TIPO que
 * existen aquí. No cruza nada. Es la pieza por la que pasan los otros 31
 * módulos de swarm que faltan.
 *
 * QUÉ SE MIDE: el MECANISMO —cómo se resuelve un binding, qué pasa cuando no
 * está, y cómo se vuelve al estado inicial— y no los 124 nombres uno a uno.
 * Enumerar los nombres en el test sería copiar el contrato dos veces y hacer
 * que el segundo se pudra en silencio.
 * Ciega a: si los bindings que el anfitrión instala hacen lo que su nombre
 * promete — eso se mide al portar cada consumidor.
 */
import { afterEach, describe, expect, test } from 'bun:test'

afterEach(async () => {
  const { _test_resetSwarmAppRuntime } = await import(
    '../src/adapters/appRuntime.ts'
  )
  _test_resetSwarmAppRuntime()
})

describe('el binding no instalado LANZA nombrándose', () => {
  test('1. tocar una función sin instalar lanza, y el mensaje da el nombre', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    m._test_resetSwarmAppRuntime()
    // El nombre en el mensaje es lo que hace accionable el fallo: sin él, un
    // anfitrión al que le falta UN binding recibe el mismo error para los 105.
    expect(() => (m.getCwd as () => unknown)()).toThrow(/getCwd/)
  })

  test('2. el mensaje dice QUÉ hacer, no sólo que falló', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    m._test_resetSwarmAppRuntime()
    let mensaje = ''
    try {
      ;(m.getCwd as () => unknown)()
    } catch (e) {
      mensaje = (e as Error).message
    }
    expect(mensaje).toContain('installSwarmAppRuntime')
  })
})

describe('installSwarmAppRuntime — reapunta por nombre', () => {
  test('3. una función instalada se llama de verdad', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    m.installSwarmAppRuntime({ getCwd: () => '/un/sitio' })
    expect((m.getCwd as () => string)()).toBe('/un/sitio')
  })

  test('4. un VALOR instalado sustituye a su literal inicial', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    // Antes de instalar, los valores tienen literal —no lanzan— porque son
    // constantes con un default razonable. Instalar los reapunta.
    m.installSwarmAppRuntime({ BASH_TOOL_NAME: 'Bash' })
    expect(m.BASH_TOOL_NAME).toBe('Bash')
  })

  test('5. un binding NO declarado en el mapa sigue lanzando', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    // Instalar un mapa parcial no puede dejar los demás en un no-op silencioso:
    // el anfitrión que olvidó uno tiene que enterarse al usarlo.
    m.installSwarmAppRuntime({ getCwd: () => '/x' })
    expect(() => (m.getBranch as () => unknown)()).toThrow(/getBranch/)
  })
})

describe('_test_resetSwarmAppRuntime — no filtrar estado entre archivos', () => {
  test('6. tras el reseteo, lo que estaba instalado vuelve a lanzar', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    m.installSwarmAppRuntime({ getCwd: () => '/x' })
    expect((m.getCwd as () => string)()).toBe('/x')
    m._test_resetSwarmAppRuntime()
    // `bun:test` comparte el estado del módulo por proceso: sin este reseteo,
    // un archivo de test que instale bindings los deja puestos para el
    // siguiente, y el siguiente pasa por una razón que no es la suya.
    expect(() => (m.getCwd as () => unknown)()).toThrow(/getCwd/)
  })

  test('7. el reseteo también devuelve los VALORES a su literal', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    m.installSwarmAppRuntime({ TEAMMATE_MESSAGE_TAG: 'otra-cosa' })
    expect(m.TEAMMATE_MESSAGE_TAG).toBe('otra-cosa')
    m._test_resetSwarmAppRuntime()
    expect(m.TEAMMATE_MESSAGE_TAG).toBe('teammate-message')
  })
})

describe('lazySchema y PermissionModeSchema', () => {
  test('8. la fábrica perezosa construye tarde y una sola vez', async () => {
    const { lazySchema } = await import('../src/adapters/appRuntime.ts')
    let veces = 0
    const perezoso = lazySchema(() => ({ n: ++veces }))
    expect(veces).toBe(0)
    const uno = perezoso()
    expect(perezoso()).toBe(uno)
    expect(veces).toBe(1)
  })

  test('9. el esquema de modo acepta los cinco, y rechaza lo demás', async () => {
    const { PermissionModeSchema } = await import(
      '../src/adapters/appRuntime.ts'
    )
    for (const modo of [
      'default',
      'acceptEdits',
      'bypassPermissions',
      'plan',
      'dontAsk',
    ]) {
      expect(PermissionModeSchema().safeParse(modo).success).toBe(true)
    }
    expect(PermissionModeSchema().safeParse('inventado').success).toBe(false)
  })
})

describe('la superficie declarada', () => {
  test('10. exporta las cuatro piezas del mecanismo', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    expect(typeof m.installSwarmAppRuntime).toBe('function')
    expect(typeof m._test_resetSwarmAppRuntime).toBe('function')
    expect(typeof m.lazySchema).toBe('function')
    expect(typeof m.PermissionModeSchema).toBe('function')
  })

  test('11. el conteo de bindings coincide con el contrato derivado', async () => {
    const m = await import('../src/adapters/appRuntime.ts')
    const { SWARM_FUNCTION_BINDINGS, SWARM_VALUE_BINDINGS } = m
    // Las dos listas SON el contrato, y por eso se exportan: un consumidor que
    // quiera instalar el runtime necesita saber qué se le pide, y un gate
    // futuro puede compararlas contra la fuente sin releer 595 líneas.
    expect(SWARM_FUNCTION_BINDINGS.length).toBe(105)
    expect(SWARM_VALUE_BINDINGS.length).toBe(19)
    // Ningún nombre repetido entre las dos: un mismo binding no puede ser a la
    // vez valor y función, o el reapuntado dependería del orden.
    const todos = [...SWARM_FUNCTION_BINDINGS, ...SWARM_VALUE_BINDINGS]
    expect(new Set(todos).size).toBe(todos.length)
  })
})
