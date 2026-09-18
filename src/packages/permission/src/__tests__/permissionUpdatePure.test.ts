import { describe, expect, mock, test } from 'bun:test'

// Copia de `ccnmt: packages/permission/src/__tests__/permissionUpdatePure.test.ts`
// con los comentarios traducidos; el cuerpo es el de la fuente.
//
// Simular las ataduras al host ANTES de importar `PermissionUpdate`.
// `PermissionUpdate` → `filesystem` → `getPermissionHostBindings` lanza si no
// están instaladas. Aquí se provee un stub que deja que `toPosixPath` —por
// `getPlatform`— caiga a su valor por defecto, el basado en
// `process.platform`.
const realHost = await import('../host.js')
mock.module('../host.js', () => ({
  ...realHost,
  getPermissionHostBindings: () => ({}),
}))

const { createReadRuleSuggestion, extractRules, hasRules } = await import(
  '../PermissionUpdate.js'
)
import type { PermissionUpdate } from '../PermissionUpdateSchema.js'

describe('extractRules — flatMap over addRules', () => {
  test('undefined input → empty array', () => {
    expect(extractRules(undefined)).toEqual([])
  })

  test('empty array → empty array', () => {
    expect(extractRules([])).toEqual([])
  })

  test('single addRules update — rules extracted', () => {
    const update: PermissionUpdate = {
      type: 'addRules',
      rules: [
        { toolName: 'Bash', ruleContent: 'ls' },
        { toolName: 'Read', ruleContent: '/path/**' },
      ],
      behavior: 'allow',
      destination: 'session',
    }
    expect(extractRules([update])).toEqual([
      { toolName: 'Bash', ruleContent: 'ls' },
      { toolName: 'Read', ruleContent: '/path/**' },
    ])
  })

  test('multiple addRules updates — flatMapped together', () => {
    const updates: PermissionUpdate[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'A', ruleContent: 'x' }],
        behavior: 'allow',
        destination: 'session',
      },
      {
        type: 'addRules',
        rules: [{ toolName: 'B', ruleContent: 'y' }],
        behavior: 'deny',
        destination: 'session',
      },
    ]
    expect(extractRules(updates)).toEqual([
      { toolName: 'A', ruleContent: 'x' },
      { toolName: 'B', ruleContent: 'y' },
    ])
  })

  test('non-addRules updates filtered out', () => {
    // La actualización `setMode` no tiene reglas — hay que saltarla por el caso por defecto.
    const updates: PermissionUpdate[] = [
      { type: 'setMode', mode: 'plan' } as PermissionUpdate,
      {
        type: 'addRules',
        rules: [{ toolName: 'X', ruleContent: 'r' }],
        behavior: 'allow',
        destination: 'session',
      },
    ]
    expect(extractRules(updates)).toEqual([{ toolName: 'X', ruleContent: 'r' }])
  })

  test('addRules with empty rules array → empty result for that update', () => {
    const update: PermissionUpdate = {
      type: 'addRules',
      rules: [],
      behavior: 'allow',
      destination: 'session',
    }
    expect(extractRules([update])).toEqual([])
  })

  test('return value is fresh array (caller can mutate without poisoning input)', () => {
    const updates: PermissionUpdate[] = [
      {
        type: 'addRules',
        rules: [{ toolName: 'X', ruleContent: 'r' }],
        behavior: 'allow',
        destination: 'session',
      },
    ]
    const r1 = extractRules(updates)
    const r2 = extractRules(updates)
    expect(r1).not.toBe(r2)
  })
})

describe('hasRules — predicate', () => {
  test('undefined → false', () => {
    expect(hasRules(undefined)).toBe(false)
  })

  test('empty array → false', () => {
    expect(hasRules([])).toBe(false)
  })

  test('only setMode updates → false (no rules)', () => {
    expect(
      hasRules([{ type: 'setMode', mode: 'plan' } as PermissionUpdate]),
    ).toBe(false)
  })

  test('addRules with at least one rule → true', () => {
    expect(
      hasRules([
        {
          type: 'addRules',
          rules: [{ toolName: 'X', ruleContent: 'r' }],
          behavior: 'allow',
          destination: 'session',
        },
      ]),
    ).toBe(true)
  })

  test('addRules with empty rules array → false', () => {
    // Crítico: una actualización `addRules` sin reglas es, técnicamente, del
    // tipo `addRules`, pero no añade ninguna. `hasRules` NO debe contarla como
    // que tiene reglas — el contrato es «¿hay al menos una regla?».
    expect(
      hasRules([
        {
          type: 'addRules',
          rules: [],
          behavior: 'allow',
          destination: 'session',
        },
      ]),
    ).toBe(false)
  })

  test('mixed updates — true if any addRules has rules', () => {
    expect(
      hasRules([
        { type: 'setMode', mode: 'plan' } as PermissionUpdate,
        {
          type: 'addRules',
          rules: [{ toolName: 'X', ruleContent: 'r' }],
          behavior: 'allow',
          destination: 'session',
        },
      ]),
    ).toBe(true)
  })
})

describe('createReadRuleSuggestion — Read rule generation', () => {
  test('absolute path → wrapped with leading "/" and trailing "/**"', () => {
    expect(createReadRuleSuggestion('/Users/me/project')).toEqual({
      type: 'addRules',
      rules: [{ toolName: 'Read', ruleContent: '//Users/me/project/**' }],
      behavior: 'allow',
      destination: 'session',
    })
  })

  test('relative path → no leading slash, just trailing /**', () => {
    expect(createReadRuleSuggestion('relative/dir')).toEqual({
      type: 'addRules',
      rules: [{ toolName: 'Read', ruleContent: 'relative/dir/**' }],
      behavior: 'allow',
      destination: 'session',
    })
  })

  test('root "/" → undefined (cannot grant universal Read)', () => {
    // CRÍTICO: una regla de Read para «/» permitiría leer cualquier cosa en
    // cualquier punto del sistema de archivos. La función devuelve `undefined`
    // para rehusar esa petición peligrosa.
    expect(createReadRuleSuggestion('/')).toBeUndefined()
  })

  test('Windows-shaped path on non-Windows platform — backslashes preserved', () => {
    // `toPosixPath` sólo convierte \ en / en la plataforma `windows`. En
    // macOS —la máquina de test— las barras invertidas pasan tal cual.
    // Documenta la dependencia de plataforma: el resultado del test refleja el
    // host donde corre.
    const result = createReadRuleSuggestion('C:\\Users\\me')
    // `posix.isAbsolute('C:\\Users\\me')` es false → no se antepone barra.
    expect(result?.rules[0]?.ruleContent).toBe('C:\\Users\\me/**')
  })

  test('default destination is "session" if not provided', () => {
    expect(createReadRuleSuggestion('/some/path')?.destination).toBe(
      'session',
    )
  })

  test('custom destination overrides default', () => {
    expect(
      createReadRuleSuggestion('/some/path', 'localSettings')?.destination,
    ).toBe('localSettings')
  })

  test('preserves trailing slashes if present', () => {
    // Documenta que la función NO normaliza las barras finales. Quien llama
    // es responsable de pasar una ruta ya limpia.
    const result = createReadRuleSuggestion('/some/path/')
    // `toPosixPath` deja la barra final. Después la comprobación de absoluta
    // ve /some/path/ como absoluta → queda envuelta como //some/path//**
    expect(result?.rules[0]?.ruleContent).toBe('//some/path//**')
  })

  test('rule structure — addRules type, behavior allow, toolName Read', () => {
    // Anclar la estructura para que se detecte un refactor que cambie, por
    // ejemplo, el comportamiento a 'ask' (que haría aflorar un prompt de
    // permiso).
    const result = createReadRuleSuggestion('/x/y')
    expect(result?.type).toBe('addRules')
    expect(result?.behavior).toBe('allow')
    expect(result?.rules[0]?.toolName).toBe('Read')
    expect(result?.rules.length).toBe(1)
  })
})
