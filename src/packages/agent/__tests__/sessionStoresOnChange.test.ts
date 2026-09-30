/**
 * Los dos creadores de store de sesión entregan cada cambio al `onChange`
 * que reciben, con la forma `{ newState, oldState }` que `createStore`
 * emite: es por donde `onChangeAppState` sincroniza el modo de permisos, el
 * modelo y la configuración cuando el llamador lo cablea.
 */
import { beforeAll, describe, expect, test } from 'bun:test'

import { installConfigHostBindings } from '@thyrox/config'
import { InMemoryConfig } from '@thyrox/config/testing'
import { getDefaultAppState, type AppState } from '@thyrox/app-host/runtime/appStateCompatShim.js'
import { getEmptyToolPermissionContext } from '@thyrox/tool-registry/Tool.js'

import { createHeadlessSessionStore, createInteractiveSessionStore, type AppStateChange } from '../sessionStores.ts'

function recorder() {
  const calls: Parameters<AppStateChange>[0][] = []
  const onChange: AppStateChange = change => calls.push(change)
  return { calls, onChange }
}

beforeAll(() => {
  installConfigHostBindings(new InMemoryConfig().bindings)
})

describe('el onChange recibido ve cada cambio con el estado anterior y el nuevo', () => {
  test('store interactivo', () => {
    const { calls, onChange } = recorder()
    const store = createInteractiveSessionStore(getDefaultAppState(), onChange)
    const before = store.getState()
    store.setState(prev => ({ ...prev, verbose: !prev.verbose }) as AppState)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.oldState).toBe(before)
    expect(calls[0]!.newState).toBe(store.getState())
  })

  test('store headless', () => {
    // El estado inicial headless consulta el modo rápido, que pregunta por la
    // suscripción y exige una credencial declarada: basta un marcador, nada
    // sale de este proceso.
    const inheritedKey = process.env.ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = 'marcador-de-prueba'
    const { calls, onChange } = recorder()
    const store = createHeadlessSessionStore(
      {
        mcpClients: [],
        mcpCommands: [],
        mcpTools: [],
        toolPermissionContext: getEmptyToolPermissionContext(),
        effort: undefined,
        effectiveModel: null,
      },
      onChange,
    )
    if (inheritedKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = inheritedKey
    const before = store.getState()
    store.setState(prev => ({ ...prev, verbose: !prev.verbose }) as AppState)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.oldState).toBe(before)
    expect(calls[0]!.newState).toBe(store.getState())
  })
})
