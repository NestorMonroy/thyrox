/**
 * Control de `src/verify/tscProposers.ts`: los proponentes baratos del lazo tsc
 * cero emiten candidatos en el contrato que `batch_verification` y
 * `tsc_schedule` ya leen.
 *
 * Qué haría fallar a este control:
 * - una clave de objetivo con otra forma que la de `tsc`: el verificador no la
 *   encontraría en el log y contaría la propuesta como `no-targets`;
 * - reclamar como objetivo un diagnóstico que la edición no toca: la
 *   propuesta se rechazaría por un error que no era suyo;
 * - saltarse las guardas de cada proponente (nombre que el checker da sin uso,
 *   inferencia a `any`): el lazo aplicaría lo que el proponente ya rehúsa.
 */
import { describe, expect, test } from 'bun:test'
import ts from 'typescript'
import { applyProposalEdits, proposeInMemory } from '../../src/verify/tscProposers'
import { DEFAULT_OPTIONS, applyEdits, createMemoryService } from '../../src/verify/tsLanguageService'

const sources = {
  // `nope` no existe (TS2305) y queda pegado al binding que se retira; el
  // local sin uso comparte código (TS6133) con el import y no lo toca nadie.
  '/p/a.ts':
    "import { readFileSync, nope } from 'node:fs'\nexport function double(value) { return value * 2 }\n" +
    'export function idle() { const unusedLocal = 1 }\n',
  '/p/dep.ts': 'export const used = 1\n',
  '/p/b.ts': "export const wrong: string = 1\n",
}

// Las líneas de `tsc --pretty false` para el mismo universo, sin coordenadas:
// es la forma que `analyze_typescript_diagnostics.diagnostic_key` extrae.
function tscKeys(files: Record<string, string>, cwd: string): string[] {
  const { service } = createMemoryService(files, DEFAULT_OPTIONS)
  const program = service.getProgram()!
  const diagnostics = Object.keys(files).flatMap(file => [
    ...program.getSyntacticDiagnostics(program.getSourceFile(file)),
    ...program.getSemanticDiagnostics(program.getSourceFile(file)),
  ])
  const text = ts.formatDiagnostics(diagnostics, {
    getCurrentDirectory: () => cwd,
    getCanonicalFileName: name => name,
    getNewLine: () => '\n',
  })
  return text
    .split('\n')
    .map(line => line.match(/^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map(m => `${m[1]}: ${m[2]}: ${m[3]}`)
}

describe('applyEdits', () => {
  test('two insertions at one position keep their order', () => {
    // Forma real de `inferFromUsage` sobre una flecha sin paréntesis
    // (`onlySleepToolActive.ts`): «(» antes del nombre, y la anotación y «)»
    // en el MISMO punto tras él. Aplicadas al revés con orden estable daban
    // `(b): T =>`, que convierte la anotación en el tipo de retorno.
    const edits = [
      { span: { start: 0, length: 0 }, newText: '(' },
      { span: { start: 1, length: 0 }, newText: ': T' },
      { span: { start: 1, length: 0 }, newText: ')' },
    ]
    expect(applyEdits('b => b', edits)).toBe('(b: T) => b')
  })
})

describe('tscProposers', () => {
  test('emits one candidate per proposer and file, with the tsc key form', () => {
    const rows = proposeInMemory(sources, ['/p/a.ts', '/p/b.ts'], '/p')
    expect(rows.map(row => row.proposal_id).sort()).toEqual([
      'infer-from-usage:a.ts',
      'unused-imports:a.ts',
    ])
    const keys = tscKeys(sources, '/p')
    for (const row of rows) {
      expect(row.files).toEqual(['a.ts'])
      expect(row.targets.length).toBeGreaterThan(0)
      for (const target of row.targets) expect(keys).toContain(target)
    }
  })

  test('claims only the diagnostics its edits touch', () => {
    const rows = proposeInMemory(sources, ['/p/a.ts'], '/p')
    const unused = rows.find(row => row.proposer === 'unused-imports')!
    const infer = rows.find(row => row.proposer === 'infer-from-usage')!
    // Ni el TS2305 pegado a la edición (otro código) ni el TS6133 del local
    // (mismo código, sin tocar): sólo el diagnóstico de la declaración.
    expect(unused.targets).toEqual(['a.ts: TS6192: All imports in import declaration are unused.'])
    expect(infer.targets.every(target => target.includes('TS7006'))).toBe(true)
  })

  test('the edits of each candidate close its targets and add nothing', () => {
    const rows = proposeInMemory(sources, ['/p/a.ts'], '/p')
    const before = tscKeys(sources, '/p')
    for (const row of rows) {
      const after = tscKeys(applyProposalEdits(sources, row, '/p'), '/p')
      for (const target of row.targets) expect(after).not.toContain(target)
      for (const key of after) expect(before).toContain(key)
    }
  })

  test('refuses to apply a candidate over a file that changed since it was proposed', () => {
    // Medido en el primer rojo de esta suite: aplicar la segunda propuesta de
    // un archivo sobre el resultado de la primera metió la anotación en otro
    // sitio (TS2693). Las posiciones son del texto sobre el que se propuso.
    const rows = proposeInMemory(sources, ['/p/a.ts'], '/p')
    expect(rows.length).toBe(2)
    const first = applyProposalEdits(sources, rows[0], '/p')
    expect(() => applyProposalEdits(first, rows[1], '/p')).toThrow(/cambió/)
  })

  test('keeps the unused-imports guard: a name the checker calls unused is not deleted', () => {
    // La fixture de `fastMode.ts`: un TIPO usado como valor con `typeof`.
    const named = {
      '/p/compat.ts': 'export type Metadata = never\n',
      '/p/typeOnly.ts': "export type { Metadata } from './compat'\n",
      '/p/c.ts': "import { Metadata } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n",
    }
    const rows = proposeInMemory(named, ['/p/c.ts'], '/p')
    expect(rows.filter(row => row.proposer === 'unused-imports')).toEqual([])
  })

  test('keeps the infer-from-usage guard: an inference to any is not proposed', () => {
    const unsafe = { '/p/u.ts': 'export function identity(value) { return value }\n' }
    expect(proposeInMemory(unsafe, ['/p/u.ts'], '/p')).toEqual([])
  })
})
