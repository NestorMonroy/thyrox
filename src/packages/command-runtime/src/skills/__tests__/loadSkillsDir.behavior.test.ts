import { describe, expect, test } from 'bun:test'

import type { Command } from '@thyrox/agent/command.js'
import type { FrontmatterData } from '@thyrox/config/frontmatterParser.js'

import {
  buildSkillPromptText,
  createSkillCommand,
  parseSkillFrontmatterFields,
} from '../loadSkillsDir.ts'

/** Estrecha un `Command` a su rama prompt, o falla nombrando el comando. */
function asPrompt(command: Command): Command & { type: 'prompt' } {
  if (command.type !== 'prompt') throw new Error(`${command.name} no es un comando prompt`)
  return command
}

/** El `userFacingName` es opcional en `CommandBase`; aquí siempre se declara. */
function userFacingName(command: Command): string {
  if (command.userFacingName === undefined) throw new Error(`${command.name} sin userFacingName`)
  return command.userFacingName()
}

/** Entrada mínima y válida para `createSkillCommand`; cada test sobreescribe lo suyo. */
function skillInput(overrides: Partial<Parameters<typeof createSkillCommand>[0]> = {}) {
  return {
    skillName: 'demo',
    displayName: undefined,
    description: 'Demo skill',
    hasUserSpecifiedDescription: true,
    markdownContent: 'Body of demo',
    allowedTools: ['Read'],
    argumentHint: undefined,
    argumentNames: [],
    whenToUse: undefined,
    version: undefined,
    model: undefined,
    disableModelInvocation: false,
    userInvocable: true,
    source: 'projectSettings' as const,
    baseDir: '/skills/demo',
    loadedFrom: 'skills' as const,
    hooks: undefined,
    executionContext: undefined,
    agent: undefined,
    paths: undefined,
    effort: undefined,
    shell: undefined,
    ...overrides,
  }
}

describe('createSkillCommand', () => {
  test('construye un comando prompt con la identidad y el origen declarados', () => {
    const command = asPrompt(createSkillCommand(skillInput({ paths: ['src/**'], effort: 'low', executionContext: 'fork' })))
    expect(command.type).toBe('prompt')
    expect(command.name).toBe('demo')
    expect(command.description).toBe('Demo skill')
    expect(command.source).toBe('projectSettings')
    expect(command.loadedFrom).toBe('skills')
    expect(command.progressMessage).toBe('running')
    expect(command.contentLength).toBe('Body of demo'.length)
    expect(command.skillRoot).toBe('/skills/demo')
    expect(command.paths).toEqual(['src/**'])
    expect(command.effort).toBe('low')
    expect(command.context).toBe('fork')
    expect(command.argNames).toBeUndefined()
    expect(command.isHidden).toBe(false)
  })

  test('userFacingName prefiere displayName y cae al nombre del skill', () => {
    expect(userFacingName(createSkillCommand(skillInput({ displayName: 'Bonito' })))).toBe('Bonito')
    expect(userFacingName(createSkillCommand(skillInput()))).toBe('demo')
  })

  test('un skill no invocable por la persona queda oculto', () => {
    const command = createSkillCommand(skillInput({ userInvocable: false }))
    expect(command.isHidden).toBe(true)
    expect(command.userInvocable).toBe(false)
  })

  test('argNames sólo se declara cuando hay nombres', () => {
    expect(asPrompt(createSkillCommand(skillInput({ argumentNames: ['a', 'b'] }))).argNames).toEqual(['a', 'b'])
  })
})

describe('buildSkillPromptText', () => {
  test('antepone el directorio base y sustituye argumentos y variables', () => {
    const text = buildSkillPromptText({
      markdownContent: 'Run ${CLAUDE_SKILL_DIR}/x.sh with $ARGUMENTS in ${CLAUDE_SESSION_ID}',
      baseDir: '/skills/demo',
      args: 'fast',
      argumentNames: [],
    })
    expect(text.startsWith('Base directory for this skill: /skills/demo\n\n')).toBe(true)
    expect(text).toContain('Run /skills/demo/x.sh with fast in ')
    expect(text).not.toContain('${CLAUDE_SESSION_ID}')
  })

  test('sin directorio base no hay prefijo ni sustitución de CLAUDE_SKILL_DIR', () => {
    const text = buildSkillPromptText({
      markdownContent: 'See ${CLAUDE_SKILL_DIR}',
      baseDir: undefined,
      args: '',
      argumentNames: [],
    })
    expect(text.startsWith('Base directory')).toBe(false)
    expect(text).toContain('${CLAUDE_SKILL_DIR}')
  })
})

/**
 * Porte de la mitad de `loadSkillsDir.ts` que faltaba (fuente: `ccnmt:
 * packages/command-runtime/src/skills/loadSkillsDir.ts`). Cada bloque se
 * escribió en rojo antes de portar su símbolo, y cada uno tiene su control
 * de anulación documentado en la cabecera del módulo.
 */
describe('parseSkillFrontmatterFields', () => {
  const parse = (
    frontmatter: FrontmatterData,
    markdown = '',
    label: 'Skill' | 'Custom command' = 'Skill',
  ) => parseSkillFrontmatterFields(frontmatter, markdown, 'demo', label)

  test('toma la descripción del frontmatter y la marca como declarada', () => {
    const parsed = parse({ description: '  Hace la cosa  ' }, '# Otro\n')
    expect(parsed.description).toBe('Hace la cosa')
    expect(parsed.hasUserSpecifiedDescription).toBe(true)
  })

  test('sin descripción cae al primer párrafo del markdown, o a la etiqueta', () => {
    expect(parse({}, '\n# Título del skill\n\ncuerpo').description).toBe('Título del skill')
    expect(parse({}, '').description).toBe('Skill')
    expect(parse({}, '', 'Custom command').description).toBe('Custom command')
    expect(parse({}, '').hasUserSpecifiedDescription).toBe(false)
  })

  test('user-invocable es true por defecto y sólo "false"/false lo apaga', () => {
    expect(parse({}).userInvocable).toBe(true)
    expect(parse({ 'user-invocable': 'false' }).userInvocable).toBe(false)
    expect(parse({ 'user-invocable': 'true' }).userInvocable).toBe(true)
  })

  test('model: inherit → undefined; un id explícito se conserva como cadena', () => {
    expect(parse({ model: 'inherit' }).model).toBeUndefined()
    expect(parse({}).model).toBeUndefined()
    const explicit = parse({ model: 'claude-sonnet-5' }).model
    expect(typeof explicit).toBe('string')
  })

  test('effort: nivel o entero válidos se conservan; inválido queda undefined', () => {
    expect(parse({ effort: 'high' }).effort).toBe('high')
    expect(parse({ effort: '7' }).effort).toBe(7)
    expect(parse({ effort: 'ultra' }).effort).toBeUndefined()
    expect(parse({}).effort).toBeUndefined()
  })

  test('hooks válidos se parsean y los inválidos quedan undefined', () => {
    const hooks = {
      PreToolUse: [{ matcher: 'Write', hooks: [{ type: 'command' as const, command: 'echo hi' }] }],
    }
    expect(parse({ hooks }).hooks).toEqual(hooks)
    expect(parse({ hooks: { PreToolUse: 'nope' } }).hooks).toBeUndefined()
    expect(parse({}).hooks).toBeUndefined()
  })

  test('el resto de campos se leen con su nombre de frontmatter', () => {
    const parsed = parse({
      name: 'Bonito',
      arguments: 'first second',
      'argument-hint': '[x]',
      'allowed-tools': 'Read, Bash(git:*)',
      context: 'fork',
      agent: 'general-purpose',
      shell: 'powershell',
      version: '1.0',
      when_to_use: 'cuando toque',
      'disable-model-invocation': true,
    })
    expect(parsed.displayName).toBe('Bonito')
    expect(parsed.argumentNames).toEqual(['first', 'second'])
    expect(parsed.argumentHint).toBe('[x]')
    expect(parsed.allowedTools).toContain('Read')
    expect(parsed.executionContext).toBe('fork')
    expect(parsed.agent).toBe('general-purpose')
    expect(parsed.shell).toBe('powershell')
    expect(parsed.version).toBe('1.0')
    expect(parsed.whenToUse).toBe('cuando toque')
    expect(parsed.disableModelInvocation).toBe(true)
  })

  test('los ausentes quedan undefined o vacíos, nunca null', () => {
    const parsed = parse({ context: 'inline' })
    expect(parsed.displayName).toBeUndefined()
    expect(parsed.argumentNames).toEqual([])
    expect(parsed.argumentHint).toBeUndefined()
    expect(parsed.executionContext).toBeUndefined()
    expect(parsed.agent).toBeUndefined()
    expect(parsed.shell).toBeUndefined()
    expect(parsed.version).toBeUndefined()
    expect(parsed.whenToUse).toBeUndefined()
    expect(parsed.disableModelInvocation).toBe(false)
  })
})
