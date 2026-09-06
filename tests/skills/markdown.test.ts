import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SKILLS, baElicitation } from '../../src/skills/index.ts'
import { toMarkdown } from '../../src/skills/emit/markdown.ts'
import { skillsDir } from '../../src/skills/paths.ts'

// El control lee el hogar por el MISMO mecanismo que el emisor escribe —
// mismo criterio que `packages/agent/__tests__/emit.test.ts`: si leyera una
// ruta propia, los dos podrían divergir sin que nada lo dijera.
const ON_DISK = join(skillsDir(), 'ba-elicitation', 'SKILL.md')

/** El `updated_at` que el archivo en disco declara hoy. */
function diskUpdatedAt(text: string): string {
  const found = /^updated_at: (.+)$/m.exec(text)
  if (!found) throw new Error('el archivo en disco no declara updated_at')
  return found[1]
}

describe('toMarkdown — skills', () => {
  /**
   * CONTROL POSITIVO REAL DEL REPO, no fabricado: el `SKILL.md` que el
   * cliente ya lee hoy para `ba-elicitation`. Si el emisor no lo reproduce
   * byte a byte, la definición TS y el artefacto han divergido.
   */
  test('reproduce el SKILL.md de ba-elicitation en disco byte a byte', () => {
    const onDisk = readFileSync(ON_DISK, 'utf8')
    expect(toMarkdown(baElicitation, diskUpdatedAt(onDisk))).toBe(onDisk)
  })

  /**
   * CONTROL NEGATIVO: el de arriba tiene que poder fallar. Sin este caso,
   * un emisor que devolviera el archivo leído del disco pasaría el
   * anterior sin medir nada.
   */
  test('difiere cuando la definición cambia', () => {
    const onDisk = readFileSync(ON_DISK, 'utf8')
    const altered = { ...baElicitation, description: `${baElicitation.description} (mutado)` }
    expect(toMarkdown(altered, diskUpdatedAt(onDisk))).not.toBe(onDisk)
  })

  test('omite las claves de frontmatter sin declarar', () => {
    const minimal = { name: 'x', description: 'y', prompt: 'z' }
    const emitted = toMarkdown(minimal, '2026-01-01 00:00:00')
    expect(emitted).not.toContain('allowed-tools:')
    expect(emitted).not.toContain('effort:')
    expect(emitted).not.toContain('disable-model-invocation:')
    expect(emitted).not.toContain('metadata:')
    expect(emitted).not.toContain('undefined')
  })

  test('emite allowed-tools como cadena separada por espacio, no como lista YAML', () => {
    const withTools = { name: 'x', description: 'y', allowedTools: ['Read', 'Bash'], prompt: 'z' }
    const emitted = toMarkdown(withTools, '2026-01-01 00:00:00')
    expect(emitted).toContain('allowed-tools: Read Bash\n')
    expect(emitted).not.toContain('  - Read')
  })

  test('metadata.triggers va ANTES de updated_at cuando se declara', () => {
    const withMeta = {
      name: 'x',
      description: 'y',
      metadata: { triggers: ['a', 'b'] },
      prompt: 'z',
    }
    const emitted = toMarkdown(withMeta, '2026-01-01 00:00:00')
    const metaIdx = emitted.indexOf('metadata:')
    const updatedIdx = emitted.indexOf('updated_at:')
    expect(metaIdx).toBeGreaterThan(0)
    expect(metaIdx).toBeLessThan(updatedIdx)
    expect(emitted).toContain('  triggers: ["a", "b"]\n')
  })

  test('cita la descripción de forma que el YAML sobreviva a comillas', () => {
    const withQuote = { name: 'x', description: 'lleva "comillas" y \\ barra', prompt: 'z' }
    const emitted = toMarkdown(withQuote, '2026-01-01 00:00:00')
    expect(emitted).toContain('description: "lleva \\"comillas\\" y \\\\ barra"')
  })

  test('cada skill de las 13 metodologías tiene su definición en SKILLS', () => {
    // Cota inferior conocida: 71 skills en las 13 metodologías (medido con
    // el censo de este pase). No 88 — los otros 17 (workflow-* + los 4
    // sueltos) tienen otra forma de frontmatter y quedan fuera a propósito.
    expect(SKILLS.length).toBe(71)
  })
})
