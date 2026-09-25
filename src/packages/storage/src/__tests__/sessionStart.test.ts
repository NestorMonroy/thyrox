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
  type HookResultMessage,
} from '../sessionStart.js'

const ORIGINAL_SIMPLE = process.env.CLAUDE_CODE_SIMPLE
const ORIGINAL_ARGV = [...process.argv]

// `uuid`/`type` fijos — sólo `label` varía — para construir un `Message`
// mínimo y válido contra la unión discriminada, comparable por igualdad.
const FAKE_UUID = '00000000-0000-0000-0000-000000000000' as const
function fakeMessage(label: string): HookResultMessage {
  return { type: 'collapsed_read_search', uuid: FAKE_UUID, label }
}

function resetAllInjections(): void {
  setShouldAllowManagedHooksOnlyFn(() => false)
  setLoadPluginHooksFn(() => Promise.resolve())
  setExecuteSessionStartHooksFn(async function* () {})
  setExecuteSetupHooksFn(async function* () {})
  setGetMainThreadAgentTypeFn(() => undefined)
  setCreateAttachmentMessageFn(() => fakeMessage('default-context'))
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
    let contextInput: unknown
    setCreateAttachmentMessageFn(input => {
      contextInput = input
      return fakeMessage('contexto')
    })
    setExecuteSessionStartHooksFn(async function* () {
      yield { message: fakeMessage('primero'), additionalContexts: ['ctx-a'] }
      yield { message: fakeMessage('segundo'), additionalContexts: ['ctx-b'] }
    })

    const result = await processSessionStartHooks('startup')

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(fakeMessage('primero'))
    expect(result[1]).toEqual(fakeMessage('segundo'))
    expect(result[2]).toEqual(fakeMessage('contexto'))
    expect(contextInput).toEqual({
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
      yield { message: fakeMessage('igual-corrio') }
    })

    const result = await processSessionStartHooks('startup')

    expect(result).toEqual([fakeMessage('igual-corrio')])
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
    let contextInput: unknown
    setCreateAttachmentMessageFn(input => {
      contextInput = input
      return fakeMessage('contexto-setup')
    })
    setExecuteSetupHooksFn(async function* () {
      yield { message: fakeMessage('setup-1'), additionalContexts: ['setup-ctx'] }
    })

    const result = await processSetupHooks('init')

    expect(result).toEqual([fakeMessage('setup-1'), fakeMessage('contexto-setup')])
    expect(contextInput).toEqual({
      type: 'hook_additional_context',
      content: ['setup-ctx'],
      hookName: 'Setup',
      toolUseID: 'Setup',
      hookEvent: 'Setup',
    })
  })

  test('si loadPluginHooks falla, no lanza y sigue con los hooks de setup', async () => {
    setLoadPluginHooksFn(() => Promise.reject(new Error('boom')))
    setExecuteSetupHooksFn(async function* () {
      yield { message: fakeMessage('sobrevive') }
    })

    expect(await processSetupHooks('maintenance')).toEqual([
      fakeMessage('sobrevive'),
    ])
  })
})
