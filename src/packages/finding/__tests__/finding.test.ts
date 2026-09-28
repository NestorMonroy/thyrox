/**
 * `@thyrox/finding`: el `.rst` de un hallazgo sale de su fila del store, y su
 * publicación usa los instrumentos del proveedor, no un bucle en primer plano.
 *
 * El store ABRE la base (`@thyrox/store`) y `@thyrox/paths` dice DÓNDE vive el
 * archivo (`findingPath`); ninguno de los dos sabe qué es un hallazgo. Este
 * paquete es su registro, como `@thyrox/task` lo es de las tareas. El
 * vocabulario separa tres cosas: el hallazgo es la conclusión (`finding`), su
 * fila en el store es el `record` y su línea en el índice es una `entry`.
 *
 * Control de anulación, caso por caso en el cuerpo.
 */
import { Database } from 'bun:sqlite'
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resetDocsRootCache } from '@thyrox/paths/docs.ts'
import {
  buildPublishPlan,
  addToInitiativeIndex,
  addIndexEntry,
  readFindingRecord,
  renderFinding,
  slugOf,
  writeFinding,
} from '../index.ts'

const work = mkdtempSync(join(tmpdir(), 'finding-'))
afterAll(() => rmSync(work, { recursive: true, force: true }))

const storeFile = join(work, 'agent_store.sqlite3')
const folder = join(work, 'docs', 'source', 'gestion', 'pm', 'thyrox', 'iniciativas', 'resolve-all-thyrox-errors', 'hallazgos')
const INDEX =
  'Hallazgos\n=========\n\n.. list-table::\n   :header-rows: 1\n\n' +
  '   * - ID\n     - Severidad\n     - Estado\n' +
  '   * - :ref:`h-thyrox-1`\n     - BAJA\n     - RESUELTO\n\n' +
  '.. toctree::\n   :maxdepth: 1\n\n   hallazgo-H-THYROX-1-previo\n'
const NAME = 'hallazgo-H-THYROX-9-el-pool-lanzaba-claude-aunque-thyrox-p-existia.rst'

{
  const db = new Database(storeFile)
  db.run(`CREATE TABLE findings_history (finding_id TEXT UNIQUE, submodule TEXT, initiative TEXT,
    severity TEXT, summary TEXT, content TEXT, source_ref TEXT)`)
  db.run(`INSERT INTO findings_history VALUES ('H-THYROX-9','thyrox','resolve-all-thyrox-errors','MEDIA',
    'El pool lanzaba claude aunque thyrox -p existía','El ejecutor por defecto seguía siendo claude.',
    'src/session/headless-pool.sh')`)
  db.close()
}

beforeEach(() => {
  rmSync(join(work, 'docs'), { recursive: true, force: true })
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'index.rst'), INDEX)
  process.env.KAUPAMEX_DOCS_ROOT = join(work, 'docs')
  resetDocsRootCache()
})

describe('la fila y el archivo', () => {
  test('1. el .rst sale de la fila, en la ruta de su capa e iniciativa', () => {
    const record = readFindingRecord(storeFile, 'H-THYROX-9')!
    expect(slugOf(record.summary)).toBe('el-pool-lanzaba-claude-aunque-thyrox-p-existia')
    const written = writeFinding(record, { resolvedIn: 'thyrox@abc1234', body: 'El texto largo del cuerpo.\n' })
    expect(written).toBe(join(folder, NAME))
    const text = readFileSync(written!, 'utf8')
    expect(text).toContain('.. _h-thyrox-9:')
    expect(text).toContain(':submodulo: thyrox')
    expect(text).toContain(':iniciativa: resolve-all-thyrox-errors')
    expect(text).toContain(':estado: resuelto')
    expect(text).toContain('RESUELTO en ``thyrox@abc1234``')
    expect(text).toContain('**Severidad:** MEDIA')
    expect(text).toContain('``thyrox: src/session/headless-pool.sh``')
    expect(text).toContain('El texto largo del cuerpo.')
    expect(text).toMatch(/:fecha_creacion: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\n/)
    const lines = text.split('\n')
    const title = lines.findIndex(l => l.startsWith('H-THYROX-9 —'))
    expect(lines[title + 1]!.length).toBeGreaterThanOrEqual(lines[title]!.length)
    expect(new Set(lines[title + 1])).toEqual(new Set(['=']))
  })

  test('2. sin commit que lo resuelva: documentado', () => {
    const text = renderFinding(readFindingRecord(storeFile, 'H-THYROX-9')!, { createdAt: '2026-09-27T00:00:00' })
    expect(text).toContain(':estado: documentado')
    expect(text).toContain('DOCUMENTADO (sin fix inmediato)')
  })

  // Una fila puede traer ya su alias (`thyrox:` o `kaupamex-docs:`): anteponer
  // la capa sin mirar daría `thyrox: thyrox: src/…` en unas y un alias falso
  // en las otras.
  test('9. una ruta que ya declara su alias no recibe otro', () => {
    const base = readFindingRecord(storeFile, 'H-THYROX-9')!
    const own = renderFinding({ ...base, sourceRef: 'thyrox: src/packages/binary/src/symbol.ts' }, {})
    expect(own).toContain('``thyrox: src/packages/binary/src/symbol.ts``')
    expect(own).not.toContain('thyrox: thyrox:')
    const other = renderFinding({ ...base, sourceRef: 'kaupamex-docs: source/index.rst' }, {})
    expect(other).toContain('``kaupamex-docs: source/index.rst``')
  })

  test('3. un identificador que el store no tiene no es una fila', () => {
    expect(readFindingRecord(storeFile, 'H-THYROX-404')).toBeNull()
  })

  // Anulación: sin rehusar el archivo existente cae este caso.
  test('4. no pisa un archivo que ya existe', () => {
    writeFileSync(join(folder, NAME), 'contenido previo\n')
    expect(writeFinding(readFindingRecord(storeFile, 'H-THYROX-9')!, {})).toBeNull()
    expect(readFileSync(join(folder, NAME), 'utf8')).toBe('contenido previo\n')
  })
})

describe('el índice', () => {
  test('5. la fila tras la última, la entrada tras la última del toctree, el estado del archivo', () => {
    const record = readFindingRecord(storeFile, 'H-THYROX-9')!
    writeFinding(record, { resolvedIn: 'thyrox@abc1234' })
    expect(addToInitiativeIndex(record)).toBe(true)
    const index = readFileSync(join(folder, 'index.rst'), 'utf8')
    expect(index).toContain(
      '   * - :ref:`h-thyrox-1`\n     - BAJA\n     - RESUELTO\n   * - :ref:`h-thyrox-9`\n     - MEDIA\n     - RESUELTO\n',
    )
    expect(index).toContain(`   hallazgo-H-THYROX-1-previo\n   ${NAME.replace(/\.rst$/, '')}\n`)
  })

  // Anulación: sin las guardas de idempotencia cae este caso.
  test('6. es idempotente: reaplicarla no duplica la fila ni la entrada', () => {
    const record = readFindingRecord(storeFile, 'H-THYROX-9')!
    const applied = addIndexEntry(INDEX, record, 'hallazgo-H-THYROX-9-x', 'DOCUMENTADO')
    const reapplied = addIndexEntry(applied, record, 'hallazgo-H-THYROX-9-x', 'DOCUMENTADO')
    expect(reapplied).toBe(applied)
    expect(reapplied.split(':ref:`h-thyrox-9`').length).toBe(2)
  })
})

describe('publicar: los instrumentos del proveedor, no un bucle', () => {
  // Anulación: sin la arista --after-ok el índice se lanzaría junto a los renders.
  test('7. los renders van a un pool en segundo plano y el índice espera a que asienten', () => {
    const plan = buildPublishPlan(
      [
        { id: 'H-THYROX-9', resolvedIn: 'thyrox@abc1234', body: '/b/9.rst' },
        { id: 'H-THYROX-10', body: '/b/10.rst' },
      ],
      { runDir: '/run', name: 'findings' },
    )
    expect(plan.jobs).toEqual([
      'bash bin/finding rst H-THYROX-9 --resolved-in thyrox@abc1234 --body /b/9.rst',
      'bash bin/finding rst H-THYROX-10 --body /b/10.rst',
    ])
    expect(plan.steps).toEqual([
      ['bash', 'bin/thyrox-bg', 'start', 'findings-render', '--grace', '0', '--', 'bash', 'bin/run-task-pool', '/run/render.jobs'],
      ['bash', 'bin/thyrox-bg', 'register', 'findings-render'],
      ['bash', 'bin/wait-jobs', 'register', 'findings-index', '/run/index.log',
        '--after-ok', 'findings-render', '--run', 'bash bin/finding index H-THYROX-9 H-THYROX-10'],
      ['bash', 'bin/wait-jobs', 'dispatch'],
    ])
  })

  test('8. la CLI publica en seco sin lanzar nada', () => {
    const planFile = join(work, 'plan.tsv')
    writeFileSync(planFile, 'H-THYROX-9\tthyrox@abc1234\t/b/9.rst\n')
    const runDir = join(work, 'run')
    const out = Bun.spawnSync(['bun', join(import.meta.dir, '..', 'bin', 'finding.ts'),
      'publish', planFile, '--run-dir', runDir, '--dry-run', '--store', storeFile])
    expect(out.exitCode).toBe(0)
    expect(readFileSync(join(runDir, 'render.jobs'), 'utf8')).toBe(
      'bash bin/finding rst H-THYROX-9 --resolved-in thyrox@abc1234 --body /b/9.rst\n')
    expect(out.stdout.toString()).toContain('bin/wait-jobs dispatch')
    expect(existsSync(join(runDir, 'index.log'))).toBe(false)
    expect(readdirSync(folder)).toEqual(['index.rst'])
  })
})
