/**
 * La ingesta de findings (ADR-008 D5, TASK-THYROX-0684): se reconocen por su
 * nombre `hallazgo-H-<PREFIJO>-NNN-*.rst`, su identidad es `finding / H-…` y
 * la ruta local no forma parte de ella. Qué haría fallar a esta suite: una
 * reingesta que duplique, una identidad que dependa del clon, o un corpus que
 * necesite la fuente después de ingerirla.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { resolvePostgresTestUrl } from '@thyrox/store/testing/postgresTestSchema.ts'

import { FINDING_DOMAIN, ingestFindings, recognizeFindings } from '../findingIngestion.ts'
import { countRows, withCorpusStore } from './support/corpusFixtures.ts'

const url = resolvePostgresTestUrl()
const SOURCE = { label: 'docs-repo', revision: 'a'.repeat(40) }
const RELATIVE_DIR = 'source/gestion/pm/thyrox/iniciativas/demo/hallazgos'

function finding(id: string, body: string): string {
  return `.. meta::\n   :estado: documentado\n\n.. _${id.toLowerCase()}:\n\n${id} — título\n${'='.repeat(id.length + 9)}\n\n${body}\n`
}

/** Un clon falso con dos findings, un índice y ruido que no se ingiere. */
function cloneWith(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'finding-ingestion-'))
  for (const [relative, text] of Object.entries(files)) {
    mkdirSync(join(root, relative, '..'), { recursive: true })
    writeFileSync(join(root, relative), text)
  }
  return root
}

const TWO_FINDINGS = {
  [`${RELATIVE_DIR}/hallazgo-H-THYROX-901-uno.rst`]: finding('H-THYROX-901', 'Primer hallazgo.'),
  [`${RELATIVE_DIR}/hallazgo-H-API-902-dos.rst`]: finding('H-API-902', 'Segundo hallazgo.'),
  [`${RELATIVE_DIR}/index.rst`]: 'Hallazgos\n=========\n',
  'node_modules/x/hallazgo-H-THYROX-903-ruido.rst': finding('H-THYROX-903', 'No entra.'),
  '.git/hallazgo-H-THYROX-904-ruido.rst': finding('H-THYROX-904', 'Tampoco.'),
}

describe('recognizeFindings', () => {
  test('reconoce sólo los findings, fuera de .git y node_modules, con ruta relativa', () => {
    const root = cloneWith(TWO_FINDINGS)
    try {
      const { recognized } = recognizeFindings(root, SOURCE)
      expect(recognized.map(item => item.document.domainId).sort()).toEqual(['H-API-902', 'H-THYROX-901'])
      const first = recognized.find(item => item.document.domainId === 'H-THYROX-901')
      expect(first?.document.domain).toBe(FINDING_DOMAIN)
      expect(first?.document.sourceRef).toBe(`docs-repo:${RELATIVE_DIR}/hallazgo-H-THYROX-901-uno.rst`)
      expect(first?.document.sourceRevision).toBe(SOURCE.revision)
      expect(first?.document.metadata['estado']).toBe('documentado')
      expect(first?.document.chunks.join('\n')).toContain('Primer hallazgo.')
      expect(first?.document.sourceRef).not.toContain(root)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('un archivo con nombre de finding y sin texto queda sin reconocer, nombrado', () => {
    const root = cloneWith({ [`${RELATIVE_DIR}/hallazgo-H-THYROX-905-vacio.rst`]: '.. meta::\n   :estado: borrador\n' })
    try {
      const { recognized, unrecognized } = recognizeFindings(root, SOURCE)
      expect(recognized).toEqual([])
      expect(unrecognized).toEqual([`${RELATIVE_DIR}/hallazgo-H-THYROX-905-vacio.rst`])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

if (!url) {
  describe('ingestFindings — postgres', () => {
    test.skip('NO MEDIDO: declara THYROX_TEST_POSTGRES_URL para correrlo', () => {})
  })
} else {
  const testUrl = url

  describe('ingestFindings — postgres', () => {
    test('ingiere, la reingesta no duplica y un cambio crea versión nueva', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const root = cloneWith(TWO_FINDINGS)
        try {
          expect(await ingestFindings(store, recognizeFindings(root, SOURCE).recognized)).toEqual({ created: 2, newVersion: 0, unchanged: 0 })
          const chunks = await countRows(sql, 'document_chunks')
          expect(await ingestFindings(store, recognizeFindings(root, SOURCE).recognized)).toEqual({ created: 0, newVersion: 0, unchanged: 2 })
          expect(await countRows(sql, 'document_chunks')).toBe(chunks)
          writeFileSync(join(root, `${RELATIVE_DIR}/hallazgo-H-THYROX-901-uno.rst`), finding('H-THYROX-901', 'Primer hallazgo, corregido.'))
          expect(await ingestFindings(store, recognizeFindings(root, SOURCE).recognized)).toEqual({ created: 0, newVersion: 1, unchanged: 1 })
          expect((await store.findDocument({ domain: FINDING_DOMAIN, domainId: 'H-THYROX-901' }))?.version).toBe(2)
        } finally {
          rmSync(root, { recursive: true, force: true })
        }
      })
    })

    test('el mismo contenido desde otro clon converge en la misma identidad y versión', async () => {
      await withCorpusStore(testUrl, async store => {
        const first = cloneWith(TWO_FINDINGS)
        const second = cloneWith(TWO_FINDINGS)
        try {
          await ingestFindings(store, recognizeFindings(first, SOURCE).recognized)
          const before = await store.findDocument({ domain: FINDING_DOMAIN, domainId: 'H-THYROX-901' })
          const otherClone = recognizeFindings(second, { label: 'docs-repo', revision: 'b'.repeat(40) }).recognized
          expect(await ingestFindings(store, otherClone)).toEqual({ created: 0, newVersion: 0, unchanged: 2 })
          const after = await store.findDocument({ domain: FINDING_DOMAIN, domainId: 'H-THYROX-901' })
          expect(after?.documentId).toBe(before?.documentId as string)
          expect(after?.version).toBe(1)
        } finally {
          rmSync(first, { recursive: true, force: true })
          rmSync(second, { recursive: true, force: true })
        }
      })
    })

    test('borrada la fuente, el texto sigue en el corpus', async () => {
      await withCorpusStore(testUrl, async (store, sql) => {
        const root = cloneWith(TWO_FINDINGS)
        await ingestFindings(store, recognizeFindings(root, SOURCE).recognized)
        rmSync(root, { recursive: true, force: true })
        const document = await store.findDocument({ domain: FINDING_DOMAIN, domainId: 'H-API-902' })
        const rows = await sql`SELECT text FROM document_chunks WHERE document_id = ${document?.documentId}`
        expect((rows as { text: string }[]).map(row => row.text).join('\n')).toContain('Segundo hallazgo.')
      })
    })
  })
}
