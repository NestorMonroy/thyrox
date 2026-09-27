/**
 * Fidelidad entre lo que una herramienta INDEXA para la búsqueda del
 * transcript (`extractSearchText`) y lo que su resultado MUESTRA en modo
 * transcript (`renderToolResultMessage` con `verbose` e `isTranscriptMode`).
 *
 * Es el detector de deriva que dos sitios citaban y no existía:
 * `Tool.ts` («transcriptSearch.renderFidelity.test.tsx») y
 * `repl: components/Messages.tsx` («toolSearchText.test.tsx»). El contrato
 * está en `Tool.ts`: el conteo de coincidencias sale del texto indexado y el
 * resaltado de la pantalla real, así que un texto indexado que no se ve es un
 * FANTASMA — cuenta una coincidencia que nadie puede resaltar. Omitir texto
 * visible (subcontar) está permitido; un fantasma no.
 *
 * Qué haría fallar a este control: que `extractSearchText` devolviera un
 * texto que el render no pinta (anulado, medido: la línea de `stderr` de
 * Bash dejada fuera del render hace caer su caso), o que el render dejara de
 * pintar una línea que el índice declara.
 *
 * Métrica: cada línea no vacía del texto indexado, buscada en el render
 * convertido a texto plano.
 * Ciega a: el ajuste de línea del terminal (una línea más ancha que la
 * columna se parte y dejaría de encontrarse; las muestras son cortas) y a
 * las herramientas que devuelven '' a propósito (FileRead, FileWrite,
 * WebSearch), que no pueden producir fantasmas.
 */
import { describe, expect, test } from 'bun:test'
import { renderToString } from '@thyrox/output/render'
import { BashTool } from '../tools/BashTool/BashTool.js'
import { GlobTool } from '../tools/GlobTool/GlobTool.js'
import { GrepTool } from '../tools/GrepTool/GrepTool.js'

type RenderableTool = {
  extractSearchText?(out: never): string
  renderToolResultMessage?(out: never, progress: never[], options: never): unknown
}

const transcriptMode = { verbose: true, theme: 'dark', isTranscriptMode: true, style: undefined } as never

/** Las líneas indexadas que el render NO muestra: los fantasmas. */
async function ghosts(tool: RenderableTool, output: object): Promise<string[]> {
  const indexed = tool.extractSearchText!(output as never)
  const rendered = await renderToString(tool.renderToolResultMessage!(output as never, [], transcriptMode) as never)
  return indexed.split('\n').map(line => line.trim()).filter(line => line !== '' && !rendered.includes(line))
}

describe('extractSearchText no declara texto que el render no muestra', () => {
  test('Glob: los nombres de archivo indexados se ven', async () => {
    const output = { filenames: ['/repo/src/one.ts', '/repo/src/two.ts'], numFiles: 2, durationMs: 3, truncated: false }
    expect(await ghosts(GlobTool, output)).toEqual([])
  })

  test('Grep en modo archivos: los nombres indexados se ven', async () => {
    const output = { mode: 'files_with_matches', filenames: ['/repo/a.py', '/repo/b.py'], numFiles: 2 }
    expect(await ghosts(GrepTool, output)).toEqual([])
  })

  test('Grep en modo contenido: las líneas indexadas se ven', async () => {
    const output = {
      mode: 'content', filenames: [], numFiles: 0, numLines: 2,
      content: '/repo/a.py:3:needle one\n/repo/b.py:7:needle two',
    }
    expect(await ghosts(GrepTool, output)).toEqual([])
  })

  test('Bash: stdout y stderr indexados se ven', async () => {
    const output = { stdout: 'first line\nsecond line', stderr: 'warning: something', interrupted: false }
    expect(await ghosts(BashTool, output)).toEqual([])
  })
})
