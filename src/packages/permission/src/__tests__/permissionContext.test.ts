/**
 * `resolveToolPermissionContext` ≙ `pe` de 2.1.275 (`chunk-zvswra5f.js`).
 */
import { describe, expect, test } from 'bun:test'
import { resolveToolPermissionContext } from '../permissionContext.js'

const base = (extra: Record<string, unknown> = {}) => ({
  mode: 'default',
  additionalWorkingDirectories: new Map(),
  alwaysAllowRules: {},
  alwaysDenyRules: {},
  alwaysAskRules: {},
  ...extra,
})
const call = (ctx: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  ({ getAppState: () => ({ toolPermissionContext: ctx }), ...extra }) as never

describe('resolveToolPermissionContext (pe)', () => {
  test('sin capas ni reescrituras, el contexto tal cual', () => {
    const c = base()
    expect(resolveToolPermissionContext(call(c))).toBe(c)
  })
  test('las capas de herramientas permitidas y denegadas van a la fuente command', () => {
    const r = resolveToolPermissionContext(
      call(base({ alwaysAllowRules: { command: ['Read'] } }), {
        permissionLayers: [
          { kind: 'allowed_tools', allowedTools: ['Read', 'Glob'] },
          { kind: 'disallowed_tools', disallowedTools: ['Bash'] },
        ],
      }),
    )
    expect(r.alwaysAllowRules.command).toEqual(['Read', 'Glob'])
    expect(r.alwaysDenyRules.command).toEqual(['Bash'])
  })
  test('sólo la última capa de directorio de trabajo añade su directorio', () => {
    const r = resolveToolPermissionContext(
      call(base(), {
        permissionLayers: [
          { kind: 'working_directory', directory: '/a' },
          { kind: 'working_directory', directory: '/b' },
        ],
      }),
    )
    expect([...r.additionalWorkingDirectories.keys()]).toEqual(['/b'])
    expect(r.additionalWorkingDirectories.get('/b')).toEqual({ path: '/b', source: 'session' })
  })
  test('la capa de modo no activa bypass si no está disponible', () => {
    const layers = [{ kind: 'permission_mode', mode: 'bypassPermissions' }]
    expect(resolveToolPermissionContext(call(base(), { permissionLayers: layers })).mode).toBe('default')
    expect(
      resolveToolPermissionContext(call(base({ isBypassPermissionsModeAvailable: true }), { permissionLayers: layers })).mode,
    ).toBe('bypassPermissions')
  })
  test('un comando de prompt en auto mode baja a default y recuerda el modo anterior', () => {
    const r = resolveToolPermissionContext(call(base({ mode: 'auto' }), { forPromptShellCommand: true }))
    expect(r.mode).toBe('default')
    expect(r.modeBeforeRewrite).toBe('auto')
  })
  test('la ejecución remota quita el bloqueo de lecturas y baja acceptEdits', () => {
    const r = resolveToolPermissionContext(
      call(base({ mode: 'acceptEdits', blockReadsOutsideWorkingDirectories: true }), { forRemoteExecution: true }),
    )
    expect(r.mode).toBe('default')
    expect('blockReadsOutsideWorkingDirectories' in r).toBe(false)
  })
  test('con la guarda de entrega de eventos, los permisos de Skill pasan a reglas retiradas', () => {
    const r = resolveToolPermissionContext(
      call(base({ pollEventDeliveryGuard: true, alwaysAllowRules: { session: ['Skill', 'Read', 'skill__x', 'Skill(foo)'] } })),
    )
    expect(r.alwaysAllowRules.session).toEqual(['Read'])
    expect(r.strippedDangerousRules).toEqual({ session: ['Skill', 'skill__x', 'Skill(foo)'] })
  })
  test('con la guarda, una capa de herramientas permitidas no se aplica', () => {
    const r = resolveToolPermissionContext(
      call(base({ pollEventDeliveryGuard: true }), { permissionLayers: [{ kind: 'allowed_tools', allowedTools: ['Bash'] }] }),
    )
    expect(r.alwaysAllowRules.command).toBeUndefined()
  })
})
