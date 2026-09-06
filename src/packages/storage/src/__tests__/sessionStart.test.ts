import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  guidanceForPluginHookError,
  processSessionStartHooks,
  processSetupHooks,
  setCreateAttachmentMessageFn,
  setExecuteSessionStartHooksFn,
  setExecuteSetupHooksFn,
  setGetMainThreadAgentTypeFn,
  setLoadPluginHooksFn,
  setPendingInitialUserMessageForTest,
  setShouldAllowManagedHooksOnlyFn,
  takeInitialUserMessage,
} from '../sessionStart.js'

const ORIGINAL_SIMPLE = process.env.CLAUDE_CODE_SIMPLE
const ORIGINAL_ARGV = [...process.argv]

function resetAllInjections(): void {
  setShouldAllowManagedHooksOnlyFn(() => false)
  setLoadPluginHooksFn(() => Promise.resolve())
  setExecuteSessionStartHooksFn(async function* () {})
  setExecuteSetupHooksFn(async function* () {})
  setGetMainThreadAgentTypeFn(() => undefined)
  setCreateAttachmentMessageFn(input => input)
  setPendingInitialUserMessageForTest(undefined)
}

beforeEach(() => {
  delete process.env.CLAUDE_CODE_SIMPLE
  process.argv = [...ORIGINAL_ARGV]
  resetAllInjections()
})

afterEach(() => {
  if (ORIGINAL_SIMPLE === undefined) delete process.env.CLAUDE_CODE_SIMPLE
  else process.env.CLAUDE_CODE_SIMPLE = ORIGINAL_SIMPLE
  process.argv = [...ORIGINAL_ARGV]
  resetAllInjections()
})

describe('takeInitialUserMessage', () => {
  test('sin nada fijado, devuelve undefined', () => {
    expect(takeInitialUserMessage()).toBeUndefined()
  })

  test('devuelve el valor fijado UNA sola vez — la segunda lectura da undefined', () => {
    setPendingInitialUserMessageForTest('hola desde un hook')
    expect(takeInitialUserMessage()).toBe('hola desde un hook')
    expect(takeInitialUserMessage()).toBeUndefined()
  })
})

describe('guidanceForPluginHookError', () => {
  test('errores de red sugieren revisar la conexión', () => {
    expect(guidanceForPluginHookError('ETIMEDOUT')).toContain(
      'network issue',
    )
    expect(guidanceForPluginHookError('Failed to clone repo')).toContain(
      'network issue',
    )
    expect(guidanceForPluginHookError('getaddrinfo ENOTFOUND')).toContain(
      'network issue',
    )
  })

  test('errores de permisos sugieren revisar file permissions', () => {
    expect(guidanceForPluginHookError('EACCES: permission denied')).toContain(
      'permissions issue',
    )
    expect(guidanceForPluginHookError('Permission denied')).toContain(
      'permissions issue',
    )
  })

  test('errores de parseo/config sugieren revisar settings.json', () => {
    expect(guidanceForPluginHookError('Invalid plugin manifest')).toContain(
      'configuration issue',
    )
    expect(guidanceForPluginHookError('Unexpected token in JSON')).toContain(
      'configuration issue',
    )
  })

  test('cualquier otro error cae al mensaje genérico', () => {
    expect(guidanceForPluginHookError('algo totalmente distinto')).toBe(
      'Please fix the plugin configuration or remove problematic plugins from your settings.',
    )
  })

  test('la red se prioriza sobre config si el mensaje calza ambos patrones', () => {
    // "ETIMEDOUT" y "Invalid" en el mismo mensaje: la fuente evalúa la
    // rama de red PRIMERO (if/else if en orden), así que gana esa.
    expect(
      guidanceForPluginHookError('Invalid response: ETIMEDOUT'),
    ).toContain('network issue')
  })
})

describe('processSessionStartHooks — modo --bare', () => {
  test('con CLAUDE_CODE_SIMPLE=1, devuelve [] sin llamar a ningún colaborador', async () => {
    process.env.CLAUDE_CODE_SIMPLE = '1'
    let loadPluginHooksCalled = false
    setLoadPluginHooksFn(() => {
      loadPluginHooksCalled = true
      return Promise.resolve()
    })

    const result = await processSessionStartHooks('startup')

    expect(result).toEqual([])
    expect(loadPluginHooksCalled).toBe(false)
  })

  test('con --bare en argv, devuelve [] igual', async () => {
    process.argv = [...ORIGINAL_ARGV, '--bare']
    expect(await processSessionStartHooks('startup')).toEqual([])
  })
})

describe('processSessionStartHooks — orquestación con colaboradores inyectados', () => {
  test('junta los mensajes de los hooks y agrega un mensaje de contexto adicional', async () => {
    setExecuteSessionStartHooksFn(async function* () {
      yield { message: { texto: 'primero' }, additionalContexts: ['ctx-a'] }
      yield { message: { texto: 'segundo' }, additionalContexts: ['ctx-b'] }
    })

    const result = await processSessionStartHooks('startup')

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ texto: 'primero' })
    expect(result[1]).toEqual({ texto: 'segundo' })
    expect(result[2]).toEqual({
      type: 'hook_additional_context',
      content: ['ctx-a', 'ctx-b'],
      hookName: 'SessionStart',
      toolUseID: 'SessionStart',
      hookEvent: 'SessionStart',
    })
  })

  test('un hook que emite initialUserMessage lo deja disponible vía takeInitialUserMessage', async () => {
    setExecuteSessionStartHooksFn(async function* () {
      yield { initialUserMessage: 'retomamos aquí' }
    })

    await processSessionStartHooks('resume')

    expect(takeInitialUserMessage()).toBe('retomamos aquí')
  })

  test('con shouldAllowManagedHooksOnly:true, NO intenta cargar plugin hooks', async () => {
    setShouldAllowManagedHooksOnlyFn(() => true)
    let loadPluginHooksCalled = false
    setLoadPluginHooksFn(() => {
      loadPluginHooksCalled = true
      return Promise.resolve()
    })

    await processSessionStartHooks('startup')

    expect(loadPluginHooksCalled).toBe(false)
  })

  test('si loadPluginHooks falla, NO propaga el error — sigue ejecutando los hooks', async () => {
    setLoadPluginHooksFn(() => Promise.reject(new Error('ETIMEDOUT')))
    setExecuteSessionStartHooksFn(async function* () {
      yield { message: { texto: 'igual-corrio' } }
    })

    const result = await processSessionStartHooks('startup')

    expect(result).toEqual([{ texto: 'igual-corrio' }])
  })

  test('devuelve [] cuando ningún hook produce mensajes', async () => {
    expect(await processSessionStartHooks('compact')).toEqual([])
  })
})

describe('processSetupHooks', () => {
  test('con --bare, devuelve [] sin tocar colaboradores', async () => {
    process.env.CLAUDE_CODE_SIMPLE = 'true'
    expect(await processSetupHooks('init')).toEqual([])
  })

  test('junta mensajes y agrega el mensaje de contexto con hookName "Setup"', async () => {
    setExecuteSetupHooksFn(async function* () {
      yield { message: { texto: 'setup-1' }, additionalContexts: ['setup-ctx'] }
    })

    const result = await processSetupHooks('init')

    expect(result).toEqual([
      { texto: 'setup-1' },
      {
        type: 'hook_additional_context',
        content: ['setup-ctx'],
        hookName: 'Setup',
        toolUseID: 'Setup',
        hookEvent: 'Setup',
      },
    ])
  })

  test('si loadPluginHooks falla, no lanza y sigue con los hooks de setup', async () => {
    setLoadPluginHooksFn(() => Promise.reject(new Error('boom')))
    setExecuteSetupHooksFn(async function* () {
      yield { message: { texto: 'sobrevive' } }
    })

    expect(await processSetupHooks('maintenance')).toEqual([
      { texto: 'sobrevive' },
    ])
  })
})
