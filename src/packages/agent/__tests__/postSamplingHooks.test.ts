/**
 * Porte de `ccnmt: packages/agent/__tests__/postSamplingHooks.test.ts`
 * (12 casos, 13 `expect`; verbatim en datos y expectativas).
 *
 * Fija el contrato de `../postSamplingHooks.js`: registro/limpieza de hooks
 * post-muestreo, orden de ejecución, y el contrato crítico — un hook que
 * lanza (síncrona o asíncronamente, con Error o con un valor arbitrario) NO
 * detiene a los hooks siguientes ni hace que `executePostSamplingHooks`
 * rechace. Sin esto, un solo plugin roto podría inutilizar una sesión
 * entera.
 */
import { afterEach, describe, expect, mock, test } from 'bun:test'
import {
  clearPostSamplingHooks,
  executePostSamplingHooks,
  registerPostSamplingHook,
} from '../postSamplingHooks.js'

afterEach(() => {
  clearPostSamplingHooks()
})

const FAKE_CONTEXT = {
  messages: [],
  systemPrompt: '' as never,
  userContext: {},
  systemContext: {},
  toolUseContext: {} as never,
}

describe('registerPostSamplingHook + executePostSamplingHooks', () => {
  test('un hook registrado se llama una vez por executePostSamplingHooks', async () => {
    const hook = mock(async () => {})
    registerPostSamplingHook(hook)
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(hook).toHaveBeenCalledTimes(1)
  })

  test('múltiples hooks registrados se llaman en el orden de registro', async () => {
    const order: string[] = []
    registerPostSamplingHook(async () => {
      order.push('a')
    })
    registerPostSamplingHook(async () => {
      order.push('b')
    })
    registerPostSamplingHook(async () => {
      order.push('c')
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(order).toEqual(['a', 'b', 'c'])
  })

  test('los hooks síncronos se esperan correctamente', async () => {
    let called = false
    registerPostSamplingHook(() => {
      called = true
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(called).toBe(true)
  })

  test('el hook recibe el REPLHookContext completo', async () => {
    const context = {
      messages: [{ id: 'msg1' }] as never,
      systemPrompt: 'sysprompt' as never,
      userContext: { foo: 'bar' },
      systemContext: { env: 'test' },
      toolUseContext: { tool: 'something' } as never,
      querySource: 'main' as never,
    }
    const captured: unknown[] = []
    registerPostSamplingHook(async ctx => {
      captured.push(ctx)
    })
    await executePostSamplingHooks(
      context.messages,
      context.systemPrompt,
      context.userContext,
      context.systemContext,
      context.toolUseContext,
      context.querySource,
    )
    expect(captured).toHaveLength(1)
    expect(captured[0]).toEqual(context)
  })

  test('querySource es opcional y su default es undefined', async () => {
    let captured: unknown = null
    registerPostSamplingHook(async ctx => {
      captured = ctx
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect((captured as { querySource: unknown }).querySource).toBeUndefined()
  })
})

describe('clearPostSamplingHooks', () => {
  test('elimina todos los hooks registrados', async () => {
    const hook = mock(async () => {})
    registerPostSamplingHook(hook)
    clearPostSamplingHooks()
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(hook).not.toHaveBeenCalled()
  })

  test('reinicia el contador de registro a 0', async () => {
    registerPostSamplingHook(async () => {})
    registerPostSamplingHook(async () => {})
    registerPostSamplingHook(async () => {})
    clearPostSamplingHooks()
    let calls = 0
    registerPostSamplingHook(async () => {
      calls++
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    // Solo corre el hook post-clear — los previos al clear ya no están.
    expect(calls).toBe(1)
  })
})

describe('manejo de errores — un fallo de hook no debe propagarse', () => {
  // Contrato crítico: los hooks post-sampling son de asesoría; un hook que
  // falla NO debe abortar el resto de la cadena ni hacer fallar el turno
  // del agente. Sin esto, un solo plugin roto podría inutilizar una sesión.

  test('un hook que lanza no detiene a los hooks siguientes', async () => {
    const order: string[] = []
    registerPostSamplingHook(async () => {
      order.push('a')
    })
    registerPostSamplingHook(async () => {
      order.push('b')
      throw new Error('hook-b-failed')
    })
    registerPostSamplingHook(async () => {
      order.push('c')
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(order).toEqual(['a', 'b', 'c'])
  })

  test('un error lanzado síncronamente también se captura', async () => {
    let later = false
    registerPostSamplingHook(() => {
      throw new Error('sync-throw')
    })
    registerPostSamplingHook(async () => {
      later = true
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(later).toBe(true)
  })

  test('executePostSamplingHooks mismo no rechaza cuando un hook lanza', async () => {
    registerPostSamplingHook(async () => {
      throw new Error('always-throws')
    })
    await expect(
      executePostSamplingHooks(
        FAKE_CONTEXT.messages,
        FAKE_CONTEXT.systemPrompt,
        FAKE_CONTEXT.userContext,
        FAKE_CONTEXT.systemContext,
        FAKE_CONTEXT.toolUseContext,
      ),
    ).resolves.toBeUndefined()
  })

  test('valores lanzados que no son Error (string, objeto) también se manejan', async () => {
    let later = false
    registerPostSamplingHook(async () => {
      throw 'plain-string-error'
    })
    registerPostSamplingHook(async () => {
      throw { weird: 'object' }
    })
    registerPostSamplingHook(async () => {
      later = true
    })
    await executePostSamplingHooks(
      FAKE_CONTEXT.messages,
      FAKE_CONTEXT.systemPrompt,
      FAKE_CONTEXT.userContext,
      FAKE_CONTEXT.systemContext,
      FAKE_CONTEXT.toolUseContext,
    )
    expect(later).toBe(true)
  })
})

describe('registro vacío', () => {
  test('executePostSamplingHooks sin hooks registrados resuelve limpio', async () => {
    await expect(
      executePostSamplingHooks(
        FAKE_CONTEXT.messages,
        FAKE_CONTEXT.systemPrompt,
        FAKE_CONTEXT.userContext,
        FAKE_CONTEXT.systemContext,
        FAKE_CONTEXT.toolUseContext,
      ),
    ).resolves.toBeUndefined()
  })
})
