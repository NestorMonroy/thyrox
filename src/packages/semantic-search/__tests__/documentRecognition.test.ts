/**
 * El reconocimiento por dominio sin base de datos: un error se reconoce por su
 * nombre `error-ERR-NNN-*.rst` y su identidad es `error / ERR-NNN`, con el
 * mismo recorrido acotado y la misma procedencia que un finding. Qué haría
 * fallar a esta suite: que un finding entre como error, que la ruta local
 * forme parte de la identidad, o que un dominio sin reconocedor se acepte.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

import { ERROR_DOMAIN, FINDING_DOMAIN, recognizeDocuments, recognizeErrors, recognizedDomains } from '../findingIngestion.ts'

const SOURCE = { label: 'docs-repo', revision: 'b'.repeat(40) }
const ERRORS_DIR = 'source/gestion/pm/docs/errores'

function rst(id: string, body: string): string {
  return `.. meta::\n   :estado: documentado\n\n.. _${id.toLowerCase()}:\n\n${id} — título\n${'='.repeat(id.length + 9)}\n\n${body}\n`
}

function cloneWith(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'document-recognition-'))
  for (const [relative, text] of Object.entries(files)) {
    mkdirSync(join(root, relative, '..'), { recursive: true })
    writeFileSync(join(root, relative), text)
  }
  return root
}

const MIXED = {
  [`${ERRORS_DIR}/error-ERR-038-output-stub.rst`]: rst('ERR-038', 'Primer error.'),
  [`${ERRORS_DIR}/error-ERR-039-rutas-a-mano.rst`]: rst('ERR-039', 'Segundo error.'),
  [`${ERRORS_DIR}/index.rst`]: 'Errores\n=======\n',
  'source/x/hallazgos/hallazgo-H-THYROX-901-uno.rst': rst('H-THYROX-901', 'Un hallazgo.'),
  'node_modules/x/error-ERR-999-ruido.rst': rst('ERR-999', 'No entra.'),
}

describe('recognizeErrors', () => {
  test('reconoce sólo los errores, con su identidad de dominio y la ruta relativa como procedencia', () => {
    const root = cloneWith(MIXED)
    try {
      const { recognized } = recognizeErrors(root, SOURCE)
      expect(recognized.map(item => item.document.domainId)).toEqual(['ERR-038', 'ERR-039'])
      const first = recognized[0]?.document
      expect(first?.domain).toBe(ERROR_DOMAIN)
      expect(first?.sourceRef).toBe(`docs-repo:${ERRORS_DIR}/error-ERR-038-output-stub.rst`)
      expect(first?.sourceRef).not.toContain(root)
      expect(first?.chunks.join('\n')).toContain('Primer error.')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('un finding sigue siendo finding: cada dominio reconoce sólo su nombre', () => {
    const root = cloneWith(MIXED)
    try {
      const findings = recognizeDocuments(FINDING_DOMAIN, root, SOURCE).recognized
      expect(findings.map(item => item.document.domainId)).toEqual(['H-THYROX-901'])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('los dominios con reconocedor son finding y error; otro se rehúsa', () => {
    expect(recognizedDomains()).toEqual([FINDING_DOMAIN, ERROR_DOMAIN])
    expect(() => recognizeDocuments('decision', '/nonexistent', SOURCE)).toThrow('decision')
  })
})
