/**
 * Tests del puerto declarado-parcial de `PermissionUpdate.ts` (6 de 8
 * exports — ver docstring del archivo. `persistPermissionUpdate`/
 * `persistPermissionUpdates` quedan fuera enteros, no a medias).
 *
 * Sin `installPermissionHostBindings` instalado: `logForDebugging` cae a
 * su respaldo silencioso (`getPermissionHostBindings().logDebug?.()`
 * lanza `HostBindingsError` en la llamada a `getPermissionHostBindings()`
 * si no hay bindings instalados) — por eso el primer test instala un
 * binding mínimo antes de ejercitar `applyPermissionUpdate`.
 */
import { beforeAll, describe, expect, test } from 'bun:test'
import { installPermissionHostBindings } from '../src/host.ts'
import {
  applyPermissionUpdate,
  applyPermissionUpdates,
  createReadRuleSuggestion,
  extractRules,
  hasRules,
  supportsPersistence,
} from '../src/PermissionUpdate.ts'
import type { PermissionUpdate } from '../src/permissionTypes.ts'

beforeAll(() => {
  installPermissionHostBindings({})
})

function emptyContext() {
  return {
    // `applyPermissionUpdate` tipa su parámetro con el mismo inline laxo
    // de la fuente (`{ permissionRules: unknown; [key: string]: unknown }`
    // — ver el docstring de `PermissionUpdate.ts`); esta clave no la lee
    // ninguna rama del switch, pero TS la exige presente para la
    // asignabilidad estructural.
    permissionRules: undefined,
    mode: 'default',
    alwaysAllowRules: {},
    alwaysDenyRules: {},
    alwaysAskRules: {},
    additionalWorkingDirectories: new Map(),
  }
}

describe('extractRules / hasRules', () => {
  test('sin updates -> []', () => {
    expect(extractRules(undefined)).toEqual([])
    expect(hasRules(undefined)).toBe(false)
  })

  test('sólo addRules aporta reglas — el resto se ignora', () => {
    const updates: PermissionUpdate[] = [
      { type: 'setMode', destination: 'session', mode: 'plan' },
      {
        type: 'addRules',
        destination: 'session',
        behavior: 'allow',
        rules: [{ toolName: 'Bash', ruleContent: 'ls:*' }],
      },
    ]
    expect(extractRules(updates)).toEqual([
      { toolName: 'Bash', ruleContent: 'ls:*' },
    ])
    expect(hasRules(updates)).toBe(true)
  })
})

describe('applyPermissionUpdate — las 6 variantes, todas mutaciones en memoria', () => {
  test('setMode cambia el modo', () => {
    const ctx = applyPermissionUpdate(emptyContext(), {
      type: 'setMode',
      destination: 'session',
      mode: 'plan',
    })
    expect(ctx.mode).toBe('plan')
  })

  test('addRules acumula bajo el destino correcto, sin pisar otros destinos', () => {
    let ctx = applyPermissionUpdate(emptyContext(), {
      type: 'addRules',
      destination: 'localSettings',
      behavior: 'allow',
      rules: [{ toolName: 'Bash', ruleContent: 'ls:*' }],
    })
    ctx = applyPermissionUpdate(ctx, {
      type: 'addRules',
      destination: 'localSettings',
      behavior: 'allow',
      rules: [{ toolName: 'Bash', ruleContent: 'git:*' }],
    })
    expect(
      (ctx.alwaysAllowRules as Record<string, string[]>).localSettings,
    ).toEqual(['Bash(ls:*)', 'Bash(git:*)'])
  })

  test('replaceRules reemplaza el destino entero (no acumula)', () => {
    let ctx = applyPermissionUpdate(emptyContext(), {
      type: 'addRules',
      destination: 'session',
      behavior: 'deny',
      rules: [{ toolName: 'Bash', ruleContent: 'rm:*' }],
    })
    ctx = applyPermissionUpdate(ctx, {
      type: 'replaceRules',
      destination: 'session',
      behavior: 'deny',
      rules: [{ toolName: 'Bash', ruleContent: 'sudo:*' }],
    })
    expect((ctx.alwaysDenyRules as Record<string, string[]>).session).toEqual([
      'Bash(sudo:*)',
    ])
  })

  test('removeRules quita sólo la regla nombrada', () => {
    let ctx = applyPermissionUpdate(emptyContext(), {
      type: 'addRules',
      destination: 'session',
      behavior: 'ask',
      rules: [
        { toolName: 'Bash', ruleContent: 'curl:*' },
        { toolName: 'Bash', ruleContent: 'wget:*' },
      ],
    })
    ctx = applyPermissionUpdate(ctx, {
      type: 'removeRules',
      destination: 'session',
      behavior: 'ask',
      rules: [{ toolName: 'Bash', ruleContent: 'curl:*' }],
    })
    expect((ctx.alwaysAskRules as Record<string, string[]>).session).toEqual([
      'Bash(wget:*)',
    ])
  })

  test('addDirectories / removeDirectories mutan el Map por clave', () => {
    let ctx = applyPermissionUpdate(emptyContext(), {
      type: 'addDirectories',
      destination: 'session',
      directories: ['/tmp/a', '/tmp/b'],
    })
    const dirs = ctx.additionalWorkingDirectories as Map<string, unknown>
    expect(dirs.size).toBe(2)
    expect(dirs.get('/tmp/a')).toEqual({ path: '/tmp/a', source: 'session' })

    ctx = applyPermissionUpdate(ctx, {
      type: 'removeDirectories',
      destination: 'session',
      directories: ['/tmp/a'],
    })
    const dirsAfter = ctx.additionalWorkingDirectories as Map<string, unknown>
    expect(dirsAfter.size).toBe(1)
    expect(dirsAfter.has('/tmp/a')).toBe(false)
    expect(dirsAfter.has('/tmp/b')).toBe(true)
  })

  test('un update de tipo desconocido no muta el contexto (rama default)', () => {
    const ctx = emptyContext()
    // @ts-expect-error — se fuerza un tipo fuera de la unión para
    // ejercitar el `default: return context`.
    const result = applyPermissionUpdate(ctx, { type: 'unknownType' })
    expect(result).toBe(ctx)
  })
})

describe('applyPermissionUpdates — aplica en serie', () => {
  test('el orden importa: setMode y luego addRules dejan ambos efectos', () => {
    const ctx = applyPermissionUpdates(emptyContext(), [
      { type: 'setMode', destination: 'session', mode: 'acceptEdits' },
      {
        type: 'addRules',
        destination: 'session',
        behavior: 'allow',
        rules: [{ toolName: 'Read', ruleContent: 'src/**' }],
      },
    ])
    expect(ctx.mode).toBe('acceptEdits')
    expect((ctx.alwaysAllowRules as Record<string, string[]>).session).toEqual([
      'Read(src/**)',
    ])
  })
})

describe('supportsPersistence', () => {
  test('los tres destinos con archivo de settings detrás dan true', () => {
    expect(supportsPersistence('localSettings')).toBe(true)
    expect(supportsPersistence('userSettings')).toBe(true)
    expect(supportsPersistence('projectSettings')).toBe(true)
  })

  test('session y cliArg (sin archivo detrás) dan false', () => {
    expect(supportsPersistence('session')).toBe(false)
    expect(supportsPersistence('cliArg')).toBe(false)
  })
})

describe('createReadRuleSuggestion', () => {
  test('ruta raíz "/" no genera sugerencia (evita Read(/**) global)', () => {
    expect(createReadRuleSuggestion('/')).toBeUndefined()
  })

  test('ruta absoluta genera un patrón /**', () => {
    // Verificado contra el comportamiento real del puerto (no asumido):
    // `toPosixPath` conserva la barra inicial, y la fuente antepone OTRA
    // `/` cuando `posix.isAbsolute(pathForPattern)` — el resultado lleva
    // doble barra al inicio. Es el mismo comportamiento de
    // `ccnmt: packages/permission/src/PermissionUpdate.ts`, reproducido
    // verbatim, no un defecto introducido por el porte.
    expect(createReadRuleSuggestion('/home/user/project')).toEqual({
      type: 'addRules',
      rules: [{ toolName: 'Read', ruleContent: '//home/user/project/**' }],
      behavior: 'allow',
      destination: 'session',
    })
  })

  test('destino por defecto es "session"; se puede sobreescribir', () => {
    const withDefault = createReadRuleSuggestion('/a')!
    expect(withDefault.destination).toBe('session')
    const withOverride = createReadRuleSuggestion('/a', 'localSettings')!
    expect(withOverride.destination).toBe('localSettings')
  })
})
