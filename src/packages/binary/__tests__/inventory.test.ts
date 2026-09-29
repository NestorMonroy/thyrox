/**
 * El inventario de un chunk: todas sus declaraciones de nivel superior, con
 * los eventos `tengu_*` que emite cada una. Es la pregunta que va antes de
 * portar un subsistema: qué contiene entero, no sólo dónde aparece un literal.
 */
import { describe, expect, test } from 'bun:test'

import { listTopLevelDeclarations } from '../src/inventory.ts'

const SOURCE = [
  'import{d as logError}from"/$bunfs/root/chunk-a.js";',
  'function Ze(r){let inner=function Nested(){return 1};try{run(r)}catch(e){logError(e);emit("tengu_jobdir_retire_failed",{})}}',
  'class Ue{onExit(c){emit(`tengu_daemon_worker_crash`,{c})}start(){return 1}}',
  'var br=60000,jq=78,Er=()=>emit("tengu_x_y");',
  'let plain="not_an_event tengu_";',
  'export{Ze as retire};',
].join('\n')

describe('listTopLevelDeclarations', () => {
  test('lista las funciones, clases y variables de nivel superior en orden de aparición', () => {
    const names = listTopLevelDeclarations(SOURCE).map(d => `${d.kind} ${d.name}`)
    expect(names).toEqual(['function Ze', 'class Ue', 'variable br', 'variable jq', 'variable Er', 'variable plain'])
  })

  // CONTROL: sin limitarse a las sentencias del archivo, la función anidada
  // `Nested` y la variable `inner` aparecerían como declaraciones propias.
  test('no lista lo que está anidado dentro de otra declaración', () => {
    const names = listTopLevelDeclarations(SOURCE).map(d => d.name)
    expect(names).not.toContain('Nested')
    expect(names).not.toContain('inner')
  })

  test('da los métodos de cada clase', () => {
    const cls = listTopLevelDeclarations(SOURCE).find(d => d.name === 'Ue')
    expect(cls?.methods).toEqual(['onExit', 'start'])
  })

  // CONTROL: sin el filtro de forma, `not_an_event tengu_` contaría como evento.
  test('recoge los eventos tengu_* de cada declaración, en cadena o plantilla, y nada más', () => {
    const byName = new Map(listTopLevelDeclarations(SOURCE).map(d => [d.name, d.events]))
    expect(byName.get('Ze')).toEqual(['tengu_jobdir_retire_failed'])
    expect(byName.get('Ue')).toEqual(['tengu_daemon_worker_crash'])
    expect(byName.get('Er')).toEqual(['tengu_x_y'])
    expect(byName.get('plain')).toEqual([])
  })

  test('el rango de cada declaración delimita su texto', () => {
    const ze = listTopLevelDeclarations(SOURCE).find(d => d.name === 'Ze')!
    expect(SOURCE.slice(ze.start, ze.end).startsWith('function Ze(r)')).toBe(true)
    expect(SOURCE.slice(ze.start, ze.end).endsWith('}}')).toBe(true)
  })
})
