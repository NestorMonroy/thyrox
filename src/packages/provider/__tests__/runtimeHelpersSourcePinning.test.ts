/**
 * Los invariantes de `runtimeHelpers.ts` pinchados sobre su FUENTE.
 *
 * POR QUE ESTE INSTRUMENTO ADEMAS DEL DE CONDUCTA. Los 45 casos de conducta
 * llaman a cada auxiliar y leen lo que sale; ese es el control fuerte. Lo que
 * no puede ver es una clase de invariante que aqui es central: **que tres de
 * estos auxiliares sean marcadores de frontera a proposito**, no
 * implementaciones a medio hacer.
 *
 * `calculateUSDCost` devuelve 0, `normalizeContentFromAPI` ignora sus
 * herramientas y su agente, e `isToolSearchEnabled` ignora el modelo, el
 * contexto de permiso, los agentes y la fuente de consulta. La conducta mide
 * el resultado y no distingue «la fuente decidio no decidir todavia» de «esto
 * esta a medias». Lo que declara la diferencia es el prefijo `_` de cada
 * parametro ignorado, y eso solo se ve en el texto.
 *
 * Lo mismo con los dos `signal?: AbortSignal` que la fuente declara y no usa:
 * son parte de la firma que los llamadores ya cumplen, y ninguna llamada
 * puede observarlos.
 *
 * CONTROL DE ANULACION, medido: quitando los guiones bajos de los parametros
 * ignorados de `isToolSearchEnabled` caen **0 de 45** en conducta y **1 de 6**
 * aqui (el caso 3).
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const fuente = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'runtimeHelpers.ts'),
  'utf-8',
)

describe('invariantes escritos en runtimeHelpers.ts', () => {
  test('1. calculateUSDCost declara sus dos parametros como ignorados', () => {
    expect(fuente).toMatch(
      /export function calculateUSDCost\(_model: string, _usage: unknown\): number \{\s*\n\s*return 0/,
    )
  })

  test('2. normalizeContentFromAPI declara ignorados sus tools y su agente', () => {
    expect(fuente).toMatch(/_tools: ProviderTools,\s*\n\s*_agentId\?: string,/)
  })

  test('3. isToolSearchEnabled declara ignorados cuatro de sus seis parametros', () => {
    const firma = fuente.slice(
      fuente.indexOf('export async function isToolSearchEnabled'),
    )
    for (const p of ['_model', '_getToolPermissionContext', '_agents', '_querySource']) {
      expect(firma.slice(0, firma.indexOf('): Promise<boolean>'))).toContain(p)
    }
  })

  test('4. las dos firmas que aceptan un AbortSignal lo declaran opcional', () => {
    // Los llamadores lo pasan; el cuerpo no lo usa todavia. Retirarlo de la
    // firma romperia a esos llamadores sin que ninguna prueba lo viera.
    const conSignal = fuente.match(/signal\?: AbortSignal/g) ?? []
    expect(conSignal).toHaveLength(2)
  })

  test('5. el respaldo del input analizado usa ?? y no ||', () => {
    const respaldos = fuente.match(/safeParseJSON\(typed\.input\) \?\? \{\}/g) ?? []
    expect(respaldos).toHaveLength(2)
  })

  test('6. el filtro de mensajes compara el contenido contra undefined', () => {
    // Por veracidad, un contenido de cadena vacia —un turno legitimo— se
    // descartaria.
    expect(fuente).toMatch(/msg\.message\.content !== undefined/)
  })
})
