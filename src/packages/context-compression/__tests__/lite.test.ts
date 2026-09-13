import { describe, expect, test } from 'bun:test'
import {
  collapseWhitespace,
  compressToolResults,
  removeRedundantContent,
  applyLiteCompression,
  normalizeWhitespace,
} from '../src/lite.ts'

const texto = (t: string) => ({ type: 'text' as const, text: t })
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
      { role: 'assistant', content: [texto('a\n\n\n\nb'), { type: 'tool_use', id: '1', name: 'X', input: {} }] },
    ])
    expect(r.aplicado).toBe(true)
    expect(r.mensajes[0].content[0]).toEqual(texto('a\n\nb'))
    expect(r.mensajes[0].content[1]).toEqual({ type: 'tool_use', id: '1', name: 'X', input: {} })
  })
  test('sin cambios reporta aplicado=false', () => {
    const r = collapseWhitespace([{ role: 'user', content: [texto('ya limpio')] }])
    expect(r.aplicado).toBe(false)
  })
})

describe('compressToolResults', () => {
  test('trunca un tool_result mas largo que el tope, retrocediendo al espacio mas cercano', () => {
    // Palabras de 4 caracteres + espacio: el corte a 2000 cae A MITAD de una
    // palabra, y el espacio mas cercano hacia atras esta a <=4 caracteres --
    // muy dentro de la ventana de retroceso (80).
    const largo = 'pal4 '.repeat(500) // 2500 caracteres
    const r = compressToolResults([{ role: 'user', content: [toolResult(largo)] }], 2000)
    expect(r.aplicado).toBe(true)
    const c = r.mensajes[0].content[0] as { content: string }
    expect(c.content.endsWith('\n...[truncado]')).toBe(true)
    const cuerpo = c.content.slice(0, -'\n...[truncado]'.length)
    expect(cuerpo).not.toMatch(/\S$/) // no termina a mitad de palabra
    expect(cuerpo.length).toBeLessThanOrEqual(2000)
  })
  test('sin limite de palabra cercano, cae al corte duro (comportamiento declarado, no un bug)', () => {
    const largo = 'a'.repeat(3000) // una sola "palabra" de 3000 caracteres
    const r = compressToolResults([{ role: 'user', content: [toolResult(largo)] }], 2000)
    const c = r.mensajes[0].content[0] as { content: string }
    expect(c.content).toBe('a'.repeat(2000) + '\n...[truncado]')
  })
  test('no toca un tool_result mas corto que el tope', () => {
    const r = compressToolResults([{ role: 'user', content: [toolResult('corto')] }], 2000)
    expect(r.aplicado).toBe(false)
  })
})

describe('removeRedundantContent', () => {
  test('quita un mensaje consecutivo con el mismo rol y contenido exacto', () => {
    const m = { role: 'assistant' as const, content: [texto('igual')] }
    const r = removeRedundantContent([m, { ...m }, { role: 'user' as const, content: [texto('otro')] }])
    expect(r.aplicado).toBe(true)
    expect(r.mensajes.length).toBe(2)
  })
  test('NO quita si el rol difiere aunque el contenido sea igual', () => {
    const c = [texto('igual')]
    const r = removeRedundantContent([
      { role: 'assistant', content: c },
      { role: 'user', content: c },
    ])
    expect(r.aplicado).toBe(false)
    expect(r.mensajes.length).toBe(2)
  })
})

describe('applyLiteCompression', () => {
  test('reporta las tecnicas que realmente cambiaron algo', () => {
    const r = applyLiteCompression([
      { role: 'user', content: [texto('a\n\n\n\nb')] },
      { role: 'user', content: [toolResult('a'.repeat(3000))] },
    ])
    expect(r.tecnicasAplicadas).toContain('collapseWhitespace')
    expect(r.tecnicasAplicadas).toContain('compressToolResults')
    expect(r.tecnicasAplicadas).not.toContain('removeRedundantContent')
  })
})
