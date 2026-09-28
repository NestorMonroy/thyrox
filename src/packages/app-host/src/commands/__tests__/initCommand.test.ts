/**
 * El comando `/init` de 2.1.283 (`cWo`): prompt builtin cuyo texto y
 * descripción eligen los selectores de `initPrompts.ts`.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import command from '../initCommand.js'
import { initCommandDescription, newInitPrompt, oldInitPrompt } from '../initPrompts.js'

const saved = process.env.THYROX_CODE_NEW_INIT
afterEach(() => {
  if (saved === undefined) delete process.env.THYROX_CODE_NEW_INIT
  else process.env.THYROX_CODE_NEW_INIT = saved
})

describe('/init', () => {
  test('identidad de prompt builtin', () => {
    expect(command.type).toBe('prompt')
    expect(command.name).toBe('init')
    expect(command.source).toBe('builtin')
    expect(command.progressMessage).toBe('analyzing your codebase')
  })

  test('texto y descripción siguen al selector', async () => {
    delete process.env.THYROX_CODE_NEW_INIT
    expect(await command.getPromptForCommand()).toEqual([{ type: 'text', text: oldInitPrompt() }])
    expect(command.description).toBe(initCommandDescription())
    process.env.THYROX_CODE_NEW_INIT = '1'
    expect(await command.getPromptForCommand()).toEqual([{ type: 'text', text: newInitPrompt() }])
    expect(command.description).toBe(initCommandDescription())
  })
})
