import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { importSkill, parseSkillMarkdown, toCamelCase } from '../../src/skills/bin/import.ts'
import { toMarkdown } from '../../src/skills/emit/markdown.ts'

describe('toCamelCase', () => {
  test('convierte kebab-case a camelCase, mismo criterio que el paquete de agentes', () => {
    expect(toCamelCase('ba-elicitation')).toBe('baElicitation')
    expect(toCamelCase('gate-consistency-evaluator')).toBe('gateConsistencyEvaluator')
    expect(toCamelCase('sp-adjust')).toBe('spAdjust')
  })
})

describe('parseSkillMarkdown', () => {
  test('triggers en forma de FLUJO — una sola línea `[...]`', () => {
    const text =
      '---\n' +
      'name: x\n' +
      'description: "y"\n' +
      'allowed-tools: Read Bash\n' +
      'effort: medium\n' +
      'disable-model-invocation: true\n' +
      'metadata:\n' +
      '  triggers: ["a", "b", "c"]\n' +
      'updated_at: 2026-01-01 00:00:00\n' +
      '---\n' +
      '\n' +
      '# cuerpo\n'
    const { fields } = parseSkillMarkdown(text)
    expect(fields.metadata?.triggers).toEqual(['a', 'b', 'c'])
  })

  /**
   * CONTROL POSITIVO real del defecto que este pase detectó y corrigió: 29
   * de los 71 `SKILL.md` declaran `triggers` en forma de BLOQUE, no de
   * flujo — `sp-adjust` es uno de ellos. Sin esta rama, `importSkill` los
   * escribe con `metadata.triggers` vacío/ausente, y el emisor sobreescribe
   * el `.md` real perdiendo los cinco triggers — es justo lo que pasó al
   * correr el import por primera vez sobre estos 29, detectado por
   * `git diff` antes de comprometer nada.
   */
  test('triggers en forma de BLOQUE — un elemento por línea con guion', () => {
    const text =
      '---\n' +
      'name: x\n' +
      'description: "y"\n' +
      'allowed-tools: Read Bash\n' +
      'effort: medium\n' +
      'disable-model-invocation: true\n' +
      'updated_at: 2026-04-17 14:30:24\n' +
      'metadata:\n' +
      '  triggers:\n' +
      '    - "strategy adjustment"\n' +
      '    - "strategic pivot"\n' +
      '    - "annual strategy review"\n' +
      '---\n' +
      '\n' +
      '# cuerpo\n'
    const { fields } = parseSkillMarkdown(text)
    expect(fields.metadata?.triggers).toEqual([
      'strategy adjustment',
      'strategic pivot',
      'annual strategy review',
    ])
  })

  test('CONTROL NEGATIVO — sin bloque metadata, triggers queda sin declarar', () => {
    const text =
      '---\n' +
      'name: x\n' +
      'description: "y"\n' +
      'allowed-tools: Read Bash\n' +
      'effort: medium\n' +
      'disable-model-invocation: true\n' +
      'updated_at: 2026-01-01 00:00:00\n' +
      '---\n' +
      '\n' +
      '# cuerpo\n'
    const { fields } = parseSkillMarkdown(text)
    expect(fields.metadata).toBeUndefined()
  })
})

describe('importSkill — round-trip sobre un fixture real del repo', () => {
  test('sp-adjust: los 5 triggers de bloque sobreviven el round-trip import -> emit', () => {
    // Fixture efímero DENTRO del test (mktemp -d), no en /tmp de trabajo
    // persistente — se descarta con el proceso.
    const dir = mkdtempSync(join(tmpdir(), 'thyrox-skills-import-'))
    const skillDir = join(dir, 'sp-adjust')
    mkdirSync(skillDir, { recursive: true })
    const original =
      '---\n' +
      'name: sp-adjust\n' +
      'description: "Use when adapting strategy. sp:adjust — refresh OKRs."\n' +
      'allowed-tools: Read Glob Grep Bash Write Edit\n' +
      'effort: medium\n' +
      'disable-model-invocation: true\n' +
      'updated_at: 2026-04-17 14:30:24\n' +
      'metadata:\n' +
      '  triggers:\n' +
      '    - "strategy adjustment"\n' +
      '    - "strategic pivot"\n' +
      '    - "annual strategy review"\n' +
      '    - "new strategic cycle"\n' +
      '    - "strategy refresh"\n' +
      '---\n' +
      '\n' +
      '# /sp-adjust\n' +
      '\n' +
      'cuerpo de prueba.\n'
    writeFileSync(join(skillDir, 'SKILL.md'), original, 'utf8')

    // outDir es OTRO directorio efímero — nunca la `definitions/` real, que
    // ya tiene el `spAdjust.ts` genuino importado del disco verdadero.
    const outDir = mkdtempSync(join(tmpdir(), 'thyrox-skills-outdir-'))
    const camelName = importSkill('sp-adjust', dir, outDir)
    expect(camelName).toBe('spAdjust')

    const prompt = readFileSync(join(outDir, `${camelName}.prompt.md`), 'utf8')
    const definitionSource = readFileSync(join(outDir, `${camelName}.ts`), 'utf8')

    expect(prompt).toBe('# /sp-adjust\n\ncuerpo de prueba.\n')
    expect(definitionSource).toContain('"strategy adjustment"')
    expect(definitionSource).toContain('"strategy refresh"')

    // Re-emitido con el `updated_at` original, reproduce el CONTENIDO — no
    // necesariamente byte a byte, porque el emisor CANONIZA el orden
    // (`metadata` antes de `updated_at`, la forma que 30 de 71 ya usaban),
    // que es distinto del orden de este fixture (`metadata` después). Eso
    // es la normalización deliberada, no una pérdida: los cinco triggers
    // siguen ahí.
    const rebuilt = {
      name: 'sp-adjust',
      description: 'Use when adapting strategy. sp:adjust — refresh OKRs.',
      allowedTools: ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'Edit'],
      effort: 'medium' as const,
      disableModelInvocation: true,
      metadata: {
        triggers: [
          'strategy adjustment',
          'strategic pivot',
          'annual strategy review',
          'new strategic cycle',
          'strategy refresh',
        ],
      },
      prompt,
    }
    const emitted = toMarkdown(rebuilt, '2026-04-17 14:30:24')
    for (const trigger of rebuilt.metadata.triggers) {
      expect(emitted).toContain(`"${trigger}"`)
    }
  })
})
