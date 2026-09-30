/**
 * `getPatchForDisplay` y `countLinesChanged`: el contrato del binario 2.1.275.
 *
 * `getPatchForDisplay` (`xB` en el binario) aplica las ediciones sobre el
 * texto ESCAPADO y reemplaza con una función, así que un `$` del texto nuevo
 * no se interpreta como patrón de reemplazo. `countLinesChanged` (`pre`)
 * cuenta líneas `+` y `-`; con un patch vacío cuenta el contenido entero.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import { getTotalLinesAdded, getTotalLinesRemoved } from '@thyrox/app-host/bootstrap/state.js'
import { countLinesChanged, getPatchForDisplay, getPatchFromContents } from '../diff.ts'
import { installAgentHostBindings } from '../host.ts'

// El host instala sus enlaces al arrancar; aquí se instala el de analítica
// para observar el evento que `countLinesChanged` emite.
const events: { event: string; metadata: Record<string, unknown> | undefined }[] = []
beforeAll(() => {
  installAgentHostBindings({ logEvent: (event, metadata) => events.push({ event, metadata }) })
})

const lines = (hunks: { lines: string[] }[]) => hunks.flatMap(h => h.lines)

describe('getPatchForDisplay', () => {
  test('una edición sin replace_all cambia sólo la primera aparición', () => {
    const hunks = getPatchForDisplay({
      filePath: 'a.txt',
      fileContents: 'x\ny\nx\n',
      edits: [{ old_string: 'x', new_string: 'z' }],
    })
    expect(lines(hunks).filter(l => l.startsWith('+'))).toEqual(['+z'])
  })

  test('replace_all cambia todas las apariciones', () => {
    const hunks = getPatchForDisplay({
      filePath: 'a.txt',
      fileContents: 'x\ny\nx\n',
      edits: [{ old_string: 'x', new_string: 'z', replace_all: true }],
    })
    expect(lines(hunks).filter(l => l.startsWith('+'))).toEqual(['+z', '+z'])
  })

  // Dos guardas lo cubren y se tapan entre sí: el escape de `$` antes de
  // reemplazar y el reemplazo por función. Anular una sola no hace caer el
  // caso; anular las dos, sí (medido con annulment_control).
  test('un $ en el texto nuevo llega literal, no como patrón de reemplazo', () => {
    const hunks = getPatchForDisplay({
      filePath: 'a.txt',
      fileContents: 'price\n',
      edits: [{ old_string: 'price', new_string: "cost $& and $1 & more" }],
    })
    expect(lines(hunks)).toContain("+cost $& and $1 & more")
  })

  test('las tabulaciones iniciales se muestran como espacios', () => {
    const hunks = getPatchForDisplay({
      filePath: 'a.ts',
      fileContents: '\tconst a = 1\n',
      edits: [{ old_string: 'a = 1', new_string: 'a = 2' }],
    })
    expect(lines(hunks).some(l => l.startsWith('+') && !l.includes('\t'))).toBe(true)
  })

  test('sin cambios no hay hunks', () => {
    expect(getPatchForDisplay({ filePath: 'a.txt', fileContents: 'x\n', edits: [] })).toEqual([])
  })
})

describe('getPatchFromContents — opciones del binario', () => {
  test('rawText devuelve las líneas sin pasar por el escape', () => {
    const hunks = getPatchFromContents({ filePath: 'a', oldContent: 'a\n', newContent: 'a & $b\n', rawText: true })
    expect(lines(hunks)).toContain('+a & $b')
  })

  test('singleHunk une cambios lejanos en un solo hunk', () => {
    const old = Array.from({ length: 40 }, (_, i) => `l${i}`).join('\n') + '\n'
    const neu = old.replace('l1\n', 'L1\n').replace('l38\n', 'L38\n')
    expect(getPatchFromContents({ filePath: 'a', oldContent: old, newContent: neu })).toHaveLength(2)
    expect(getPatchFromContents({ filePath: 'a', oldContent: old, newContent: neu, singleHunk: true })).toHaveLength(1)
  })
})

describe('countLinesChanged', () => {
  test('suma al total de la sesión las líneas + y - del patch', () => {
    const added = getTotalLinesAdded()
    const removed = getTotalLinesRemoved()
    countLinesChanged(getPatchFromContents({ filePath: 'a', oldContent: 'a\nb\n', newContent: 'a\nc\nd\n' }))
    expect(getTotalLinesAdded() - added).toBe(2)
    expect(getTotalLinesRemoved() - removed).toBe(1)
  })

  test('con patch vacío cuenta el contenido nuevo entero como añadido', () => {
    const added = getTotalLinesAdded()
    countLinesChanged([], 'uno\ndos\ntres')
    expect(getTotalLinesAdded() - added).toBe(3)
  })

  test('con patch vacío y contenido viejo cuenta sus líneas como retiradas', () => {
    const removed = getTotalLinesRemoved()
    countLinesChanged([], undefined, 'a\nb')
    expect(getTotalLinesRemoved() - removed).toBe(2)
  })

  test('emite tengu_file_changed con los dos conteos', () => {
    countLinesChanged([], 'a\nb')
    expect(events.at(-1)).toEqual({ event: 'tengu_file_changed', metadata: { lines_added: 2, lines_removed: 0 } })
  })
})
