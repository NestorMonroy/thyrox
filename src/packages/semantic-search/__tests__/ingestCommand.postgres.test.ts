/**
 * `semantic-search-ingest` (TASK-THYROX-0684): ingiere los findings de una
 * raíz nombrada y publica su conteo con el alcance medido. Qué haría fallar a
 * esta suite: una ingesta sin URL que no rehúse, un dominio no soportado que
 * se ignore en silencio, o un conteo que no diga cuántos quedaron sin
 * reconocer.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl } from '@thyrox/store/testing/postgresTestSchema.ts'

import { SEMANTIC_SEARCH_DATABASE_URL_VAR } from '../config.ts'
import { FINDING_DOMAIN } from '../findingIngestion.ts'
import { INGEST_EXIT_OK, INGEST_EXIT_REFUSED, SEMANTIC_SEARCH_SCHEMA_VAR, runIngestCommand } from '../ingestCommand.ts'
import { withCorpusStore } from './support/corpusFixtures.ts'

const url = resolvePostgresTestUrl()
const FINDING = `.. meta::\n   :estado: documentado\n\nH-THYROX-911 — título\n=====================\n\nTexto.\n`

function capture() {
  const stdout: string[] = []
  const stderr: string[] = []
  return { stdout, stderr, output: { stdout: (line: string) => { stdout.push(line) }, stderr: (line: string) => { stderr.push(line) } } }
}

function treeWithFinding(): string {
  const root = mkdtempSync(join(tmpdir(), 'ingest-command-'))
  mkdirSync(join(root, 'hallazgos'))
  writeFileSync(join(root, 'hallazgos', 'hallazgo-H-THYROX-911-uno.rst'), FINDING)
  writeFileSync(join(root, 'hallazgos', 'hallazgo-H-THYROX-912-vacio.rst'), '')
  return root
}

describe('runIngestCommand — rechazos', () => {
  test('sin URL del store rehúsa nombrando la variable', async () => {
    const io = capture()
    expect(await runIngestCommand(['finding', '--root', tmpdir()], { env: {}, output: io.output })).toBe(INGEST_EXIT_REFUSED)
    expect(io.stderr.join('\n')).toContain(SEMANTIC_SEARCH_DATABASE_URL_VAR)
  })

  test('un dominio sin ingestor rehúsa nombrándolo', async () => {
    const io = capture()
    const env = { [SEMANTIC_SEARCH_DATABASE_URL_VAR]: 'postgres://u:p@127.0.0.1:9/x' }
    expect(await runIngestCommand(['adr', '--root', tmpdir()], { env, output: io.output })).toBe(INGEST_EXIT_REFUSED)
    expect(io.stderr.join('\n')).toContain('adr')
  })

  test('sin --root rehúsa: el recorrido es siempre de una raíz nombrada', async () => {
    const io = capture()
    const env = { [SEMANTIC_SEARCH_DATABASE_URL_VAR]: 'postgres://u:p@127.0.0.1:9/x' }
    expect(await runIngestCommand(['finding'], { env, output: io.output })).toBe(INGEST_EXIT_REFUSED)
    expect(io.stderr.join('\n')).toContain('--root')
  })
})

if (!url) {
  describe('runIngestCommand — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url

  describe('runIngestCommand — postgres', () => {
    test('ingiere la raíz, publica el conteo con lo no reconocido y la segunda vez no cambia nada', async () => {
      await withCorpusStore(testUrl, async (store, _sql, schema) => {
        const root = treeWithFinding()
        try {
          const env = { [SEMANTIC_SEARCH_DATABASE_URL_VAR]: testUrl, [SEMANTIC_SEARCH_SCHEMA_VAR]: schema }
          const first = capture()
          expect(await runIngestCommand(['finding', '--root', root, '--source-label', 'docs-repo'], { env, output: first.output })).toBe(INGEST_EXIT_OK)
          expect(first.stdout.join('\n')).toContain('1 creado(s)')
          expect(first.stdout.join('\n')).toContain('1 sin reconocer')
          expect(first.stderr.join('\n')).toContain('hallazgos/hallazgo-H-THYROX-912-vacio.rst')
          const document = await store.findDocument({ domain: FINDING_DOMAIN, domainId: 'H-THYROX-911' })
          expect(document?.sourceRef).toBe('docs-repo:hallazgos/hallazgo-H-THYROX-911-uno.rst')
          const second = capture()
          expect(await runIngestCommand(['finding', '--root', root, '--source-label', 'docs-repo'], { env, output: second.output })).toBe(INGEST_EXIT_OK)
          expect(second.stdout.join('\n')).toContain('1 sin cambios')
        } finally {
          rmSync(root, { recursive: true, force: true })
        }
      })
    })
  })
}
