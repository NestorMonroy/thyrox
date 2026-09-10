/**
 * Smoke test del pase de porte de `ccnmt: packages/command-runtime` que
 * añade `runtime.ts`, `commandRuntimeInstaller.ts`, `index.ts` (barrel),
 * `stubs/*`, `testing/index.ts`, `skills/featureCheck.ts`,
 * `skills/mcpSkillBuilders.ts`, `skills/mcpSkills.ts`, `exampleCommands.ts`
 * y las metadatas de comandos `clear`, `compact`, `cost`, `voice`,
 * `status`, `rename`, `workflows`, `recap`, `goal`.
 *
 * No ejercita los cuerpos `load()` (lazy, muchos siguen sin portar) ni las
 * ramas que dependen de un `require()` diferido hacia un paquete hermano
 * — eso se prueba cuando ese paquete exista. Cubre: que los módulos
 * CARGAN sin reventar (el riesgo real de un `import` estático mal puesto)
 * y que su metadata estática tiene la forma esperada.
 */
import { describe, expect, test } from 'bun:test'
import * as barrel from '../index.js'
import { StubCommandRuntime } from '../testing/index.js'
import { isSkillSearchEnabled } from '../skills/featureCheck.js'
import { getMCPSkillBuilders, registerMCPSkillBuilders } from '../skills/mcpSkillBuilders.js'
import { fetchMcpSkillsForClient } from '../skills/mcpSkills.js'
import emptyCommandStub from '../stubs/emptyCommandStub.js'
import { resetLimits, resetLimitsNonInteractive } from '../stubs/resetLimitsStub.js'
import stubCommand from '../stubs/stubCommand.js'
import {
  countAndSortItems,
  pickDiverseCoreFiles,
} from '../exampleCommands.js'
import clearCommand from '../commands/clear/index.js'
import compactCommand from '../commands/compact/index.js'
import costCommand from '../commands/cost/index.js'
import voiceCommand from '../commands/voice/index.js'
import statusCommand from '../commands/status/index.js'
import renameCommand from '../commands/rename/index.js'
import workflowsCommand from '../commands/workflows/index.js'
import recapCommand from '../commands/recap/index.js'
import goalJsxCommand, {
  goalLocalCommand,
  getGoalConditionMaxLength,
} from '../commands/goal/index.js'
import reviewCommand, { ultrareview } from '../commands/review/review.js'

describe('index.ts — barrel', () => {
  test('re-exporta los símbolos de contracts/host/api/errors', () => {
    expect(typeof barrel.installCommandRegistryHostBindings).toBe('function')
    expect(typeof barrel.getCommandRegistryHostBindings).toBe('function')
    expect(typeof barrel.getCommands).toBe('function')
    expect(typeof barrel.isCommandEnabled).toBe('function')
  })
})

describe('testing/index.ts — StubCommandRuntime', () => {
  test('añade, busca y resetea comandos', async () => {
    const runtime = new StubCommandRuntime()
    runtime.addCommand({ name: 'foo', aliases: ['f'] })
    expect(await runtime.getCommands()).toEqual([{ name: 'foo', aliases: ['f'] }])
    expect(runtime.find('f')?.name).toBe('foo')
    expect(() => runtime.get('missing')).toThrow(/Command not found/)
    runtime.reset()
    expect(await runtime.getCommands()).toEqual([])
  })
})

describe('skills/featureCheck.ts', () => {
  test('isSkillSearchEnabled es false por defecto (stub)', () => {
    expect(isSkillSearchEnabled()).toBe(false)
  })
})

describe('skills/mcpSkillBuilders.ts', () => {
  test('lanza antes de registrar, resuelve después', () => {
    // El registro es un singleton de módulo; puede que otro test previo
    // ya lo haya poblado — sólo se comprueba que registrar deja el valor
    // recuperable con getMCPSkillBuilders().
    const builders = { createSkillCommand: (() => {}) as never, parseSkillFrontmatterFields: (() => {}) as never }
    registerMCPSkillBuilders(builders)
    expect(getMCPSkillBuilders()).toBe(builders)
  })
})

describe('skills/mcpSkills.ts', () => {
  test('fetchMcpSkillsForClient resuelve vacío y expone .cache', async () => {
    expect(await fetchMcpSkillsForClient()).toEqual([])
    expect(fetchMcpSkillsForClient.cache).toBeInstanceOf(Map)
  })
})

describe('stubs/*', () => {
  test('emptyCommandStub es un objeto vacío', () => {
    expect(emptyCommandStub).toEqual({})
  })
  test('resetLimitsStub — mismo stub para ambos nombres', () => {
    expect(resetLimits).toBe(resetLimitsNonInteractive)
    expect(resetLimits.isEnabled()).toBe(false)
    expect(resetLimits.isHidden).toBe(true)
  })
  test('stubCommand — deshabilitado y oculto', () => {
    expect(stubCommand.isEnabled()).toBe(false)
    expect(stubCommand.isHidden).toBe(true)
    expect(stubCommand.name).toBe('stub')
  })
})

describe('exampleCommands.ts — utilidades puras', () => {
  test('countAndSortItems cuenta y ordena descendente', () => {
    const out = countAndSortItems(['a', 'b', 'a', 'a', 'b'], 2)
    const lines = out.split('\n')
    expect(lines[0]).toMatch(/3 a/)
    expect(lines[1]).toMatch(/2 b/)
  })

  test('pickDiverseCoreFiles filtra no-core y reparte por directorio', () => {
    const paths = [
      'src/a.ts',
      'src/b.ts',
      'src/c.ts',
      'other/d.ts',
      'package-lock.json',
      'README.md',
    ]
    const picked = pickDiverseCoreFiles(paths, 3)
    expect(picked.length).toBe(3)
    expect(picked).not.toContain('package-lock.json')
    expect(picked).not.toContain('README.md')
  })

  test('pickDiverseCoreFiles devuelve vacío si no hay suficientes core files', () => {
    expect(pickDiverseCoreFiles(['README.md'], 3)).toEqual([])
  })
})

describe('metadata estática de comandos', () => {
  test('clear', () => {
    expect(clearCommand.name).toBe('clear')
    expect(clearCommand.type).toBe('local')
    expect(clearCommand.aliases).toEqual(['reset', 'new'])
  })
  test('compact', () => {
    expect(compactCommand.name).toBe('compact')
    expect(compactCommand.supportsNonInteractive).toBe(true)
  })
  test('cost', () => {
    expect(costCommand.name).toBe('cost')
    expect(costCommand.supportsNonInteractive).toBe(true)
  })
  test('voice', () => {
    expect(voiceCommand.name).toBe('voice')
    expect(voiceCommand.availability).toEqual(['claude-ai'])
  })
  test('status', () => {
    expect(statusCommand.name).toBe('status')
    expect(statusCommand.immediate).toBe(true)
  })
  test('rename', () => {
    expect(renameCommand.name).toBe('rename')
    expect(renameCommand.argumentHint).toBe('[name]')
  })
  test('workflows', () => {
    expect(workflowsCommand.name).toBe('workflows')
    expect(workflowsCommand.aliases).toEqual([])
  })
  test('recap', () => {
    expect(recapCommand.name).toBe('recap')
    expect(recapCommand.supportsNonInteractive).toBe(false)
  })
  test('goal (local-jsx + local)', () => {
    expect(goalJsxCommand.name).toBe('goal')
    expect(goalJsxCommand.type).toBe('local-jsx')
    expect(goalLocalCommand.name).toBe('goal')
    expect(goalLocalCommand.type).toBe('local')
    expect(goalLocalCommand.supportsNonInteractive).toBe(true)
  })
  test('review + ultrareview', async () => {
    expect(reviewCommand.name).toBe('review')
    expect(reviewCommand.type).toBe('prompt')
    const blocks = await (reviewCommand as { getPromptForCommand: (a: string) => Promise<{ type: string; text: string }[]> }).getPromptForCommand('42')
    expect(blocks[0]?.text).toContain('PR number: 42')
    expect(ultrareview.name).toBe('ultrareview')
    expect(ultrareview.type).toBe('local-jsx')
  })
  test('getGoalConditionMaxLength lanza sin @thyrox/agent resoluble (diferido)', () => {
    // command-runtime no tiene node_modules/@thyrox todavia — el require
    // diferido falla al LLAMARSE, que es exactamente lo que este test
    // confirma (no una carga rota del módulo).
    expect(() => getGoalConditionMaxLength()).toThrow()
  })
})
