/**
 * Acceso a la tubería de contexto del provider — porte de
 * `ccnmt: packages/provider/src/contextPipeline.ts`.
 *
 * MITAD ROJA. `createProductionDeps` del bucle necesita la tubería de
 * contexto para armar su `ContextDep`, y hoy no hay por dónde pedirla: los
 * bindings del host la tienen (`ProviderHostBindings.contextPipeline`) pero el
 * paquete no publica ningún accesor, así que el consumidor tendría que
 * importar `getProviderHostBindings` y destructurar — que es acoplarse a la
 * FORMA de los bindings en vez de a la capacidad que necesita.
 *
 * Licencia: `ccnmt` declara UNLICENSED, así que se reimplementa el contrato,
 * no se trasplanta el archivo (`porte-completo-no-parcial.md`).
 *
 * CONTROL DE ANULACIÓN, medido: devolviendo un objeto nuevo en vez del de los
 * bindings —`return { getUserContext: …, getSystemContext: … }`— cae **1 de
 * 3**: el caso 2, que es el único que compara identidad. Sobreviven el 1 (la
 * forma se cumple igual) y el 3 (rehusar sin bindings no depende de qué se
 * devuelva). El caso 2 es el que mide que el accesor DELEGA en vez de
 * fabricar: sin él, una implementación que inventara su propia tubería
 * pasaría, y el consumidor quedaría hablando con otra cosa que la instalada.
 */

import { describe, expect, test } from 'bun:test'
import {
  getProviderHostBindings,
  installProviderHostBindings,
  type ProviderHostBindings,
} from '../src/host.ts'
import { getProviderContextPipeline } from '../src/contextPipeline.ts'
import type { ContextPipeline } from '../src/types.ts'

function pipelineDePrueba(): ContextPipeline {
  return {
    getUserContext: async () => ({ usuario: 'u' }),
    getSystemContext: async () => ({ sistema: 's' }),
  }
}

describe('getProviderContextPipeline', () => {
  test('1. devuelve una tubería con las dos consultas del contrato', async () => {
    const tuberia = pipelineDePrueba()
    installProviderHostBindings({ contextPipeline: tuberia } as ProviderHostBindings)
    const obtenida = getProviderContextPipeline()
    expect(await obtenida.getUserContext()).toEqual({ usuario: 'u' })
    expect(await obtenida.getSystemContext()).toEqual({ sistema: 's' })
  })

  test('2. DELEGA: es la misma instancia que los bindings, no una copia', () => {
    const tuberia = pipelineDePrueba()
    installProviderHostBindings({ contextPipeline: tuberia } as ProviderHostBindings)
    expect(getProviderContextPipeline()).toBe(tuberia)
    expect(getProviderContextPipeline()).toBe(getProviderHostBindings().contextPipeline)
  })

  test('3. sin bindings instalados rehúsa, no devuelve una tubería vacía', () => {
    installProviderHostBindings(null as unknown as ProviderHostBindings)
    expect(() => getProviderContextPipeline()).toThrow(/host bindings/i)
  })
})
