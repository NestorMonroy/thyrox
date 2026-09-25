import { describe, expect, test } from 'bun:test'
import {
  collapseWhitespace,
  compressToolResults,
  removeRedundantContent,
  applyLiteCompression,
  normalizeWhitespace,
  dedupSections,
} from '../src/lite.ts'

const text = (t: string) => ({ type: 'text' as const, text: t })
const toolResult = (c: string) => ({ type: 'tool_result' as const, tool_use_id: 'tu1', content: c })

describe('normalizeWhitespace', () => {
  test('colapsa 3+ saltos de linea a 2', () => {
    expect(normalizeWhitespace('a\n\n\n\nb')).toBe('a\n\nb')
  })
  test('quita espacios/tabs finales de cada linea', () => {
    expect(normalizeWhitespace('a  \nb\t\n')).toBe('a\nb\n')
  })
  test('cadena vacia da cadena vacia', () => {
    expect(normalizeWhitespace('')).toBe('')
  })
})

describe('collapseWhitespace', () => {
  test('normaliza solo bloques de texto, deja tool_use/tool_result intactos', () => {
    const r = collapseWhitespace([
      { role: 'assistant', content: [text('a\n\n\n\nb'), { type: 'tool_use', id: '1', name: 'X', input: {} }] },
    ])
    expect(r.applied).toBe(true)
    expect(r.messages[0]!.content[0]).toEqual(text('a\n\nb'))
    expect(r.messages[0]!.content[1]).toEqual({ type: 'tool_use', id: '1', name: 'X', input: {} })
  })
  test('sin cambios reporta applied=false', () => {
    const r = collapseWhitespace([{ role: 'user', content: [text('ya limpio')] }])
    expect(r.applied).toBe(false)
  })
})

describe('compressToolResults', () => {
  test('trunca un tool_result mas largo que el tope, retrocediendo al espacio mas cercano', () => {
    // Palabra repetida de largo fijo + espacio: cualquiera que sea el punto
    // exacto donde cae el corte de 2000, la ventana de retroceso (80) tiene
    // de sobra para encontrar un espacio.
    const long = 'word4 '.repeat(500) // 3000 caracteres
    const r = compressToolResults([{ role: 'user', content: [toolResult(long)] }], 2000)
    expect(r.applied).toBe(true)
    const c = r.messages[0]!.content[0] as { content: string }
    expect(c.content.endsWith('\n...[truncado]')).toBe(true)
    const body = c.content.slice(0, -'\n...[truncado]'.length)
    // El invariante real NO es "termina en espacio" -- un corte que cae
    // justo despues de una palabra completa tambien es valido. Lo que
    // importa es que NO se parta una palabra: al menos uno de los dos
    // caracteres que rodean el punto de corte, en el texto ORIGINAL, es
    // whitespace.
    const before = long[body.length - 1]
    const after = long[body.length]
    expect(!/\S/.test(before) || !/\S/.test(after)).toBe(true)
    expect(body.length).toBeLessThanOrEqual(2000)
  })
  test('sin limite de palabra cercano, cae al corte duro (comportamiento declarado, no un bug)', () => {
    const long = 'a'.repeat(3000) // una sola "palabra" de 3000 caracteres
    const r = compressToolResults([{ role: 'user', content: [toolResult(long)] }], 2000)
    const c = r.messages[0]!.content[0] as { content: string }
    expect(c.content).toBe('a'.repeat(2000) + '\n...[truncado]')
  })
  test('no toca un tool_result mas corto que el tope', () => {
    const r = compressToolResults([{ role: 'user', content: [toolResult('corto')] }], 2000)
    expect(r.applied).toBe(false)
  })
})

describe('removeRedundantContent', () => {
  test('quita un mensaje consecutivo con el mismo rol y contenido exacto', () => {
    const m = { role: 'assistant' as const, content: [text('igual')] }
    const r = removeRedundantContent([m, { ...m }, { role: 'user' as const, content: [text('otro')] }])
    expect(r.applied).toBe(true)
    expect(r.messages.length).toBe(2)
  })
  test('NO quita si el rol difiere aunque el contenido sea igual', () => {
    const c = [text('igual')]
    const r = removeRedundantContent([
      { role: 'assistant', content: c },
      { role: 'user', content: c },
    ])
    expect(r.applied).toBe(false)
    expect(r.messages.length).toBe(2)
  })
})

describe('applyLiteCompression', () => {
  test('reporta las tecnicas que realmente cambiaron algo', () => {
    const r = applyLiteCompression([
      { role: 'user', content: [text('a\n\n\n\nb')] },
      { role: 'user', content: [toolResult('a'.repeat(3000))] },
    ])
    expect(r.appliedTechniques).toContain('collapseWhitespace')
    expect(r.appliedTechniques).toContain('compressToolResults')
    expect(r.appliedTechniques).not.toContain('removeRedundantContent')
  })
})

describe('dedupSections', () => {
  test('quita una seccion cuyo texto exacto ya aparecio antes', () => {
    const r = dedupSections([
      { name: 'a', text: 'igual' },
      { name: 'b', text: 'igual' },
      { name: 'c', text: 'distinto' },
    ])
    expect(r.sections.map((s) => s.name)).toEqual(['a', 'c'])
    expect(r.duplicates.map((s) => s.name)).toEqual(['b'])
  })
  test('conserva dos secciones que sólo comparten un prefijo (no falso positivo)', () => {
    const r = dedupSections([
      { name: 'a', text: 'preambulo comun\n\ncuerpo A' },
      { name: 'b', text: 'preambulo comun\n\ncuerpo B' },
    ])
    expect(r.sections.map((s) => s.name)).toEqual(['a', 'b'])
    expect(r.duplicates).toEqual([])
  })
  test('el recorte de espacios cuenta como el mismo texto', () => {
    const r = dedupSections([
      { name: 'a', text: '  igual  ' },
      { name: 'b', text: 'igual' },
    ])
    expect(r.sections.map((s) => s.name)).toEqual(['a'])
    expect(r.duplicates.map((s) => s.name)).toEqual(['b'])
  })
  test('sin duplicados, todo sobrevive en el mismo orden', () => {
    const entrada = [{ name: 'a', text: '1' }, { name: 'b', text: '2' }]
    const r = dedupSections(entrada)
    expect(r.sections).toEqual(entrada)
    expect(r.duplicates).toEqual([])
  })
})
