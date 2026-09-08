/**
 * Los invariantes de `openai/indexImpl.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DEL DE CONDUCTA. Los 20 casos de conducta
 * recorren el generador entero con un `fetch` propio, incluida la rama de
 * busqueda de herramientas; ese es el control fuerte. Lo que no alcanzan:
 *
 * - Las DOS herramientas de servidor que se excluyen del esquema estandar
 *   (`advisor_20260301`, `computer_20250124`). Construir una exigiria un
 *   `toolToAPISchema` que emitiera ese `type`, y no lo emite: viene del
 *   registro de herramientas, que este paquete no tiene.
 * - El respaldo de la bitacora de sesion a la de anthropic. Los casos de
 *   conducta instalan las dos.
 * - Que la suma de costo se llame de forma OPCIONAL: sin el `?.`, un host que
 *   no la declare reventaria, y todos los casos la declaran.
 * - Que el `signal` del generador viaje a la peticion.
 *
 * CONTROL DE ANULACION, medido: quitando `advisor_20260301` del filtro de
 * herramientas de servidor caen **0 de 20** en conducta y **1 de 6** aqui (el
 * caso 2).
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fuente = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'src',
    'openai',
    'indexImpl.ts',
  ),
  'utf-8',
)

describe('invariantes escritos en openai/indexImpl.ts', () => {
  test('1. el filtro de diferidas tiene sus TRES ramas, en su orden', () => {
    const filtro = fuente.slice(
      fuente.indexOf('filteredTools = tools.filter'),
      fuente.indexOf('const toolSchemas'),
    )
    const posNoDiferida = filtro.indexOf('!deferredToolNames.has(tool.name)')
    const posBusqueda = filtro.indexOf('providerToolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)')
    const posDescubierta = filtro.indexOf('discoveredToolNames.has(tool.name)')
    expect(posNoDiferida).toBeGreaterThan(-1)
    expect(posNoDiferida).toBeLessThan(posBusqueda)
    expect(posBusqueda).toBeLessThan(posDescubierta)
  })

  test('2. se excluyen las DOS herramientas de servidor con tipo propio', () => {
    expect(fuente).toMatch(/anyTool\.type !== 'advisor_20260301'/)
    expect(fuente).toMatch(/anyTool\.type !== 'computer_20250124'/)
  })

  test('3. la bitacora de sesion cae a la de anthropic con ??', () => {
    // Con `||`, una funcion de bitacora que existiera pero fuera falsy —no
    // ocurre hoy— cambiaria de rama. Lo que importa es que sea nullish: la
    // ausencia es lo unico que dispara el respaldo.
    const respaldos = fuente.match(
      /hostBindings\.session\.logForDebugging \?\? hostBindings\.anthropic\.logForDebugging/g,
    ) ?? []
    // Uno en el camino normal y otro en el catch: el catch vuelve a resolver
    // los bindings porque el fallo puede venir de antes de tenerlos.
    expect(respaldos).toHaveLength(2)
  })

  test('4. la suma de costo se invoca de forma opcional', () => {
    expect(fuente).toMatch(/hostBindings\.session\.addToTotalSessionCost\?\.\(/)
  })

  test('5. el signal del generador viaja a la peticion', () => {
    expect(fuente).toMatch(/\{ signal \},\s*\n\s*\)/)
  })

  test('6. deferLoading solo se pide para una diferida con la busqueda activa', () => {
    expect(fuente).toMatch(
      /deferLoading: useToolSearch && deferredToolNames\.has\(tool\.name\)/,
    )
  })
})
