/**
 * `request_access` marca cada app pedida como centinela con la MISMA decisión
 * que el diálogo usa para su advertencia.
 *
 * En 2.1.283 (`chunk-de3xpxbw.js`, leído con `bin/binary`) todo lo que decide
 * si una app es centinela —la prioridad al deduplicar (`nQe`), el peso del
 * pedido (`rQe`) y la insignia del diálogo (`Xue`)— llama a `LB`, la
 * categoría completa con su rama de Windows. La unión `tKn` de los tres
 * conjuntos de macOS tiene 0 usos. El porte decidía `isSentinel` con esa
 * unión: una terminal de Windows llegaba al diálogo como no centinela.
 *
 * El adaptador es un Proxy que lanza ante cualquier miembro que no declare:
 * lo que el camino de `request_access` necesita queda medido, no supuesto.
 *
 * Control de anulación, medido: decidir `isSentinel` con la unión otra vez
 * tumba sólo el caso 1.
 */
import { describe, expect, test } from 'bun:test'
import { ALL_SUB_GATES_OFF } from '../src/subGates.ts'
import { handleToolCall } from '../src/toolCalls.ts'
import type { CuPermissionRequest } from '../src/types.ts'

function strict<T extends object>(name: string, members: T): T {
  return new Proxy(members, {
    get(target, key) {
      if (typeof key === 'symbol' || key === 'then') return Reflect.get(target, key)
      if (!(key in target)) throw new Error(`${name}.${String(key)} no está declarado en la prueba`)
      return Reflect.get(target, key)
    },
  })
}

const INSTALLED = [
  { bundleId: 'C:\\Windows\\System32\\cmd.exe', displayName: 'Símbolo del sistema', path: 'C:\\Windows\\System32\\cmd.exe' },
  { bundleId: 'com.mitchellh.ghostty', displayName: 'Ghostty', path: '/Applications/Ghostty.app' },
  { bundleId: 'com.apple.TextEdit', displayName: 'TextEdit', path: '/System/Applications/TextEdit.app' },
]

async function requestedApps(apps: string[]): Promise<CuPermissionRequest['apps']> {
  let captured: CuPermissionRequest | undefined
  const logger = { info() {}, warn() {}, error() {}, debug() {}, silly() {} }
  const adapter = strict('adapter', {
    serverName: 'computer-use',
    logger,
    isDisabled: () => false,
    ensureOsPermissions: async () => ({ granted: true }),
    getAutoUnhideEnabled: () => false,
    getSubGates: () => ALL_SUB_GATES_OFF,
    executor: strict('executor', {
      capabilities: { screenshotFiltering: 'none' },
      listInstalledApps: async () => INSTALLED,
      previewHideSet: async () => [],
    }),
  })
  const result = await handleToolCall(adapter as never, 'request_access', { reason: 'probar', apps }, {
    allowedApps: [],
    userDeniedBundleIds: [],
    onPermissionRequest: async (req: CuPermissionRequest) => {
      captured = req
      return { granted: [], denied: [], flags: {} }
    },
  } as never)
  if (!captured) throw new Error(`request_access no llegó a pedir permiso: ${JSON.stringify(result).slice(0, 400)}`)
  return captured.apps
}

describe('request_access — isSentinel', () => {
  test('1. una terminal de Windows llega al diálogo como centinela', async () => {
    // Se pide por su nombre visible, como lo pide el modelo; lo que resuelve es
    // la ruta del ejecutable, que es lo que la categoría de Windows lee.
    const [cmd] = await requestedApps(['Símbolo del sistema'])
    expect(cmd!.resolved?.bundleId).toBe('C:\\Windows\\System32\\cmd.exe')
    expect(cmd!.isSentinel).toBe(true)
  })

  test('2. una terminal de macOS de la referencia también, y una app común no', async () => {
    const apps = await requestedApps(['com.mitchellh.ghostty', 'com.apple.TextEdit'])
    expect(apps.map(a => [a.resolved?.bundleId, a.isSentinel])).toEqual([
      ['com.mitchellh.ghostty', true],
      ['com.apple.TextEdit', false],
    ])
  })
})
