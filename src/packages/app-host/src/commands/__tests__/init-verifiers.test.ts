import { describe, expect, test } from 'bun:test'
import command from '../init-verifiers.ts'

// Contrato: `init-verifiers` es un prompt-command builtin y estático —
// mismo `name`/`type`/`source` en cada invocación, y su
// `getPromptForCommand()` ignora sus argumentos y siempre resuelve al
// mismo único bloque de texto (Fases 1-5 del prompt).
// Ver `ccnmt: packages/command-runtime/src/types.ts:20-40` para el
// contrato `PromptCommand` del que este comando es una instancia.

describe('init-verifiers command', () => {
  test('declara su identidad de prompt-command builtin', () => {
    expect(command.type).toBe('prompt')
    expect(command.name).toBe('init-verifiers')
    expect(command.source).toBe('builtin')
    expect(command.contentLength).toBe(0)
    expect(command.description).toBe(
      'Create verifier skill(s) for automated verification of code changes',
    )
    expect(command.progressMessage).toBe(
      'analyzing your project and creating verifier skills',
    )
  })

  test('getPromptForCommand resuelve a un único bloque de texto', async () => {
    const blocks = await command.getPromptForCommand('', undefined)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]?.type).toBe('text')
    expect(typeof blocks[0]?.text).toBe('string')
  })

  test('ignora sus argumentos — misma salida con o sin args/context', async () => {
    const withArgs = await command.getPromptForCommand('algún arg', {
      some: 'context',
    })
    const withoutArgs = await command.getPromptForCommand('', undefined)
    expect(withArgs).toEqual(withoutArgs)
  })

  test('el prompt cubre las cinco fases declaradas', async () => {
    const [block] = await command.getPromptForCommand('', undefined)
    const text = block?.text ?? ''
    expect(text).toContain('## Phase 1: Auto-Detection')
    expect(text).toContain('## Phase 2: Verification Tool Setup')
    expect(text).toContain('## Phase 3: Interactive Q&A')
    expect(text).toContain('## Phase 4: Generate Verifier Skill')
    expect(text).toContain('## Phase 5: Confirm Creation')
  })

  test('prohíbe verificadores de unit tests/typechecking', async () => {
    const [block] = await command.getPromptForCommand('', undefined)
    expect(block?.text).toContain(
      'Do NOT create verifiers for unit tests or typechecking.',
    )
  })

  test('exige que el nombre del skill contenga "verifier" para el discovery', async () => {
    const [block] = await command.getPromptForCommand('', undefined)
    expect(block?.text).toContain(
      'Custom names are allowed but MUST include "verifier" in the name',
    )
  })

  test('escribe el skill SIEMPRE bajo .claude/skills/', async () => {
    const [block] = await command.getPromptForCommand('', undefined)
    expect(block?.text).toContain(
      "All verifier skills are created in the project root's `.claude/skills/` directory.",
    )
  })
})
