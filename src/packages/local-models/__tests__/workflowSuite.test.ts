import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { InvalidWorkflowSuiteError, REPO_CODE_CHANGE_SUITE_PATH, loadWorkflowSuite } from '../workflowSuite.ts'

let directory: string | undefined
afterEach(() => {
  if (directory !== undefined) rmSync(directory, { recursive: true, force: true })
  directory = undefined
})

function suiteFile(document: unknown, prompt = 'You are a worker.'): string {
  directory = mkdtempSync(join(tmpdir(), 'workflow-suite-'))
  writeFileSync(join(directory, 'prompt.md'), prompt)
  const path = join(directory, 'suite.json')
  writeFileSync(path, JSON.stringify(document))
  return path
}

const VALID = {
  id: 'repo-code-change@1', taskClass: 'mecanica', prompt: 'prompt.md', tools: ['Read', 'Write', 'Edit', 'Bash'],
  cases: [{ id: 'title-slug', item: 'Implement title_slug.', verify: 'bash verify.sh' }],
}

describe('loadWorkflowSuite (TASK-THYROX-0931)', () => {
  test('la suite versionada se lee: un caso, su verify y la plantilla junto a ella', async () => {
    const suite = await loadWorkflowSuite(REPO_CODE_CHANGE_SUITE_PATH)
    expect(suite.id).toBe('repo-code-change@1')
    expect(suite.taskClass).toBe('mecanica')
    expect(suite.tools).toEqual(['Read', 'Write', 'Edit', 'Bash'])
    expect(suite.cases.map(c => c.id)).toEqual(['title-slug'])
    expect(suite.promptPath.endsWith('suites/repo-code-change-1/prompt.md')).toBe(true)
  })

  test('la plantilla se resuelve junto a la suite, no junto al proceso', async () => {
    const path = suiteFile(VALID)
    expect((await loadWorkflowSuite(path)).promptPath).toBe(join(directory as string, 'prompt.md'))
  })

  test('un caso sin verify se rehúsa: aprobaría cualquier cambio', async () => {
    const path = suiteFile({ ...VALID, cases: [{ id: 'x', item: 'y' }] })
    await expect(loadWorkflowSuite(path)).rejects.toThrow(new InvalidWorkflowSuiteError(path, 'cases[0].verify', 'se espera una cadena no vacía'))
  })

  test('una plantilla ausente se rehúsa al leer, antes de lanzar el pool', async () => {
    const path = suiteFile({ ...VALID, prompt: 'missing.md' })
    await expect(loadWorkflowSuite(path)).rejects.toThrow(/prompt/)
  })

  test('sin herramientas declaradas se rehúsa: el perfil las registra', async () => {
    const path = suiteFile({ ...VALID, tools: [] })
    await expect(loadWorkflowSuite(path)).rejects.toThrow(new InvalidWorkflowSuiteError(path, 'tools', 'se espera una lista no vacía de nombres'))
  })
})

describe('systemBudgetTokens de la suite de flujo', () => {
  test('es opcional; declarado, es un entero positivo que viaja al worker', async () => {
    expect((await loadWorkflowSuite(suiteFile(VALID))).systemBudgetTokens).toBeUndefined()
    expect((await loadWorkflowSuite(suiteFile({ ...VALID, systemBudgetTokens: 2000 }))).systemBudgetTokens).toBe(2000)
    const path = suiteFile({ ...VALID, systemBudgetTokens: 0 })
    await expect(loadWorkflowSuite(path)).rejects.toThrow(new InvalidWorkflowSuiteError(path, 'systemBudgetTokens', 'se espera un entero positivo de tokens'))
  })
})
