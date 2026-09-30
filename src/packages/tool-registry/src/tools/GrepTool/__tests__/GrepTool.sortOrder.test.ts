/**
 * TASK-THYROX-0324 parte C: el orden de `files_with_matches` no ramifica por
 * NODE_ENV. El ejecutable 2.1.283 (`_In`, chunk-csayct82.js) ordena por
 * mtime descendente y desempata por nombre; la rama `NODE_ENV === 'test'`
 * (sólo por nombre) era conducta que existía únicamente bajo `bun test`.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, utimesSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getEmptyToolPermissionContext } from '@thyrox/tool-registry/Tool.js'
// GlobTool primero: resuelve el ciclo GlobTool/UI <-> GrepTool en la carga.
import '../../GlobTool/GlobTool.js'
import { GrepTool } from '../GrepTool.js'

async function filenamesFor(dir: string): Promise<string[]> {
  const context = {
    abortController: new AbortController(),
    getAppState: () => ({ toolPermissionContext: getEmptyToolPermissionContext() }),
  }
  const result = await (GrepTool as never as {
    call(input: object, context: object): Promise<{ data: { filenames: string[] } }>
  }).call({ pattern: 'needle', path: dir, output_mode: 'files_with_matches' }, context)
  return result.data.filenames
}

describe('GrepTool ordena por mtime sin ramificar por NODE_ENV', () => {
  test('el archivo más reciente va primero aunque su nombre sea posterior', async () => {
    expect(process.env.NODE_ENV).toBe('test')
    const dir = mkdtempSync(join(tmpdir(), 'grep-sort-'))
    writeFileSync(join(dir, 'a.txt'), 'needle')
    writeFileSync(join(dir, 'b.txt'), 'needle')
    utimesSync(join(dir, 'a.txt'), new Date(1_000_000), new Date(1_000_000))
    utimesSync(join(dir, 'b.txt'), new Date(2_000_000), new Date(2_000_000))
    const names = (await filenamesFor(dir)).map(f => f.split('/').pop())
    expect(names).toEqual(['b.txt', 'a.txt'])
  })

  test('con el mismo mtime desempata por nombre', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'grep-tie-'))
    for (const n of ['z.txt', 'a.txt']) {
      writeFileSync(join(dir, n), 'needle')
      utimesSync(join(dir, n), new Date(3_000_000), new Date(3_000_000))
    }
    const names = (await filenamesFor(dir)).map(f => f.split('/').pop())
    expect(names).toEqual(['a.txt', 'z.txt'])
  })
})
