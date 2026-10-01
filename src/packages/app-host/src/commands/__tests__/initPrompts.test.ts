/**
 * Los prompts de `/init`, portados de 2.1.283 (`lWo`, `dWo`, `RFe`, con sus
 * selectores `aWo` y `lme`) y rebautizados a thyrox. El texto de origen vive
 * en `.claude/workbench/visible-text-thyrox-*` junto al generador.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import {
  IMPORT_OFFER,
  initCommandDescription,
  initPrompt,
  isImportEnabled,
  isNewInitEnabled,
  newInitPrompt,
  oldInitPrompt,
} from '../initPrompts.js'

const saved = { flags: process.env.THYROX_FEATURE_FLAGS, init: process.env.THYROX_CODE_NEW_INIT }
afterEach(() => {
  for (const [k, v] of [['THYROX_FEATURE_FLAGS', saved.flags], ['THYROX_CODE_NEW_INIT', saved.init]] as const) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})
function flags(value: Record<string, boolean>): void {
  process.env.THYROX_FEATURE_FLAGS = JSON.stringify(value)
}

describe('el texto portado', () => {
  test('el prompt nuevo trae la fase 0 de 2.1.283', () => {
    expect(newInitPrompt()).toContain('## Phase 0: Check for an existing THYROX.md')
  })

  test('ninguno de los dos prompts nombra el producto ajeno', () => {
    for (const on of [false, true]) {
      flags({ tengu_import: on })
      for (const text of [newInitPrompt(), oldInitPrompt()]) {
        // La única mención admitida es la del archivo heredado en la fase 0.
        const withoutLegacy = text.replace(/If it doesn't, check for the legacy CLAUDE\.md[^.]*\.[^.]*\./, '')
        // El nombre ajeno en cualquier caja, salvo como segmento de ruta
        // (`.claude/settings`, que thyrox sigue leyendo ahí) y como mercado
        // tras `plugin@` (`claude-plugins-official`, del que thyrox instala).
        expect(withoutLegacy).not.toMatch(/(?<![./~@])\bclaude\b/i)
      }
    }
  })

  test('un proyecto con sólo CLAUDE.md conserva su contenido', () => {
    expect(newInitPrompt()).toContain('legacy CLAUDE')
  })

  test('los directorios que thyrox sigue leyendo bajo .claude no cambian', () => {
    const text = newInitPrompt()
    expect(text).toContain('.claude/settings.json')
    expect(text).toContain('.claude/skills/<skill-name>/SKILL.md')
    expect(text).toContain('.thyrox/rules/')
  })
})

describe('selectores', () => {
  test('sin bandera, la oferta de importación no aparece', () => {
    delete process.env.THYROX_FEATURE_FLAGS
    expect(isImportEnabled()).toBe(false)
    expect(oldInitPrompt()).not.toContain('/import')
    expect(newInitPrompt()).not.toContain(IMPORT_OFFER)
  })

  test('con tengu_import, las dos ramas la incluyen', () => {
    flags({ tengu_import: true })
    expect(oldInitPrompt()).toContain('OpenAI Codex config')
    expect(newInitPrompt()).toContain(IMPORT_OFFER)
  })

  test('THYROX_CODE_NEW_INIT o la bandera eligen el prompt nuevo', () => {
    delete process.env.THYROX_FEATURE_FLAGS
    delete process.env.THYROX_CODE_NEW_INIT
    expect(isNewInitEnabled()).toBe(false)
    expect(initPrompt()).toBe(oldInitPrompt())
    process.env.THYROX_CODE_NEW_INIT = '1'
    expect(initPrompt()).toBe(newInitPrompt())
    delete process.env.THYROX_CODE_NEW_INIT
    flags({ tengu_slate_harbor_experiment: true })
    expect(initPrompt()).toBe(newInitPrompt())
  })

  test('la descripción sigue al selector', () => {
    delete process.env.THYROX_CODE_NEW_INIT
    delete process.env.THYROX_FEATURE_FLAGS
    expect(initCommandDescription()).toBe('Initialize a new THYROX.md file with codebase documentation')
    process.env.THYROX_CODE_NEW_INIT = '1'
    expect(initCommandDescription()).toBe(
      'Initialize new THYROX.md file(s) and optional skills/hooks with codebase documentation',
    )
  })
})
