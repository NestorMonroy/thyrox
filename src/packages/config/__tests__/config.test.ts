import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SettingsSchema, PermissionsSchema, EnvironmentVariablesSchema } from '../settings/types.ts'
import { SETTING_SOURCES, EDITABLE_SOURCES, sourceDisplayName, parseSettingSourcesFlag } from '../settings/constants.ts'
import { formatZodError, filterInvalidPermissionRules, validateSettingsFileContent } from '../settings/validation.ts'
import { loadSettings, mergeSettings } from '../settings/load.ts'

// Adaptado de `ccb: tests/unit/settings/config.test.ts`. Lo que se conserva es
// la FORMA -esquema, precedencia de fuentes, validacion- y lo que cambia es el
// contenido: nuestro esquema declara las claves que este proyecto usa, no las
// 80 del cliente. Un esquema copiado entero seria paridad sin consumidor.

describe('SettingsSchema — lo que aceptamos', () => {
  test('objeto vacio', () => {
    expect(SettingsSchema.safeParse({}).success).toBe(true)
  })

  test('model por identificador completo; el alias se rechaza', () => {
    expect(SettingsSchema.safeParse({ model: 'claude-opus-5' }).success).toBe(true)
    const alias = SettingsSchema.safeParse({ model: 'opus' })
    expect(alias.success).toBe(false)
    // la razon se dice, no se deja al lector adivinarla
    expect(JSON.stringify(alias.error)).toContain('identificador completo')
  })

  test('hooks con matcher y comandos', () => {
    expect(SettingsSchema.safeParse({
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo x', timeout: 5 }] }] },
    }).success).toBe(true)
  })

  test('un evento de hook que no existe se rechaza, y nombra el que falla', () => {
    const r = SettingsSchema.safeParse({ hooks: { NoExiste: [{ hooks: [{ type: 'command', command: 'x' }] }] } })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error)).toContain('NoExiste')
  })

  test('permissions con los tres modos y las capacidades del harness', () => {
    expect(PermissionsSchema.safeParse({ defaultMode: 'acceptEdits', read: 'allow', write: 'ask', execute: 'deny' }).success).toBe(true)
    expect(PermissionsSchema.safeParse({ write: 'quizas' }).success).toBe(false)
  })

  test('env coacciona numeros a cadena, como el cliente', () => {
    const r = EnvironmentVariablesSchema.safeParse({ PORT: 3000 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.PORT).toBe('3000')
  })

  test('advisorModel exige identificador completo igual que model', () => {
    expect(SettingsSchema.safeParse({ advisorModel: 'claude-fable-5-1' }).success).toBe(true)
    expect(SettingsSchema.safeParse({ advisorModel: 'fable' }).success).toBe(false)
  })

  test('cacheTtl solo admite los dos valores que el servicio tiene', () => {
    expect(SettingsSchema.safeParse({ cacheTtl: '1h' }).success).toBe(true)
    expect(SettingsSchema.safeParse({ cacheTtl: '30m' }).success).toBe(false)
  })

  test('maxTurns positivo; cero o negativo no', () => {
    expect(SettingsSchema.safeParse({ maxTurns: 20 }).success).toBe(true)
    expect(SettingsSchema.safeParse({ maxTurns: 0 }).success).toBe(false)
  })

  test('las claves desconocidas pasan (passthrough), como en el cliente', () => {
    const r = SettingsSchema.safeParse({ claveNueva: 'valor' })
    expect(r.success).toBe(true)
    if (r.success) expect((r.data as Record<string, unknown>).claveNueva).toBe('valor')
  })
})

describe('la autoría no se puede encender desde un archivo', () => {
  test('includeCoAuthoredBy admite false y rechaza true', () => {
    expect(SettingsSchema.safeParse({ includeCoAuthoredBy: false }).success).toBe(true)
    // git-author-identity.md prohibe el remolque; un settings que lo encienda
    // seria una regla derogada por un archivo de configuracion
    expect(SettingsSchema.safeParse({ includeCoAuthoredBy: true }).success).toBe(false)
  })
  test('attribution acepta las dos superficies del cliente', () => {
    expect(SettingsSchema.safeParse({ attribution: { commit: 'x', pr: 'y' } }).success).toBe(true)
  })
})

describe('fuentes y su precedencia', () => {
  test('las cinco fuentes, de menor a mayor precedencia', () => {
    expect(SETTING_SOURCES).toEqual(['userSettings', 'projectSettings', 'localSettings', 'flagSettings', 'policySettings'])
  })

  test('solo tres son editables por nosotros', () => {
    expect(EDITABLE_SOURCES).toEqual(['localSettings', 'projectSettings', 'userSettings'])
  })

  test('cada fuente tiene nombre legible', () => {
    expect(sourceDisplayName('localSettings')).toBe('proyecto, fuera de git')
    expect(sourceDisplayName('policySettings')).toBe('política de la organización')
  })

  test('parseSettingSourcesFlag acepta lista, recorta espacios y rechaza lo que no existe', () => {
    expect(parseSettingSourcesFlag('user,project')).toEqual(['userSettings', 'projectSettings'])
    expect(parseSettingSourcesFlag(' user , local ')).toEqual(['userSettings', 'localSettings'])
    expect(parseSettingSourcesFlag('')).toEqual([])
    expect(() => parseSettingSourcesFlag('inventada')).toThrow('fuente de settings')
  })
})

describe('mergeSettings — la precedencia se aplica, no se describe', () => {
  test('la fuente mas alta gana clave a clave', () => {
    const r = mergeSettings([
      { source: 'userSettings', settings: { model: 'claude-sonnet-5', maxTurns: 5 } },
      { source: 'projectSettings', settings: { model: 'claude-opus-5' } },
    ])
    expect(r.settings.model).toBe('claude-opus-5')
    expect(r.settings.maxTurns).toBe(5)
    expect(r.origin.model).toBe('projectSettings')
    expect(r.origin.maxTurns).toBe('userSettings')
  })

  test('los hooks se ACUMULAN entre fuentes; no se pisan', () => {
    const r = mergeSettings([
      { source: 'userSettings', settings: { hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'a' }] }] } } },
      { source: 'projectSettings', settings: { hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'b' }] }] } } },
    ])
    expect(r.settings.hooks?.PreToolUse).toHaveLength(2)
  })

  test('el orden de la lista no manda: manda la precedencia declarada', () => {
    const r = mergeSettings([
      { source: 'policySettings', settings: { model: 'claude-haiku-4-5' } },
      { source: 'userSettings', settings: { model: 'claude-opus-5' } },
    ])
    expect(r.settings.model).toBe('claude-haiku-4-5')
    expect(r.origin.model).toBe('policySettings')
  })

  test('env se funde por clave', () => {
    const r = mergeSettings([
      { source: 'userSettings', settings: { env: { A: '1', B: '2' } } },
      { source: 'localSettings', settings: { env: { B: '3' } } },
    ])
    expect(r.settings.env).toEqual({ A: '1', B: '3' })
  })
})

describe('validacion de archivos', () => {
  test('JSON valido pasa; JSON roto dice que lo es', () => {
    expect(validateSettingsFileContent('{"model":"claude-opus-5"}').isValid).toBe(true)
    const malo = validateSettingsFileContent('esto no es json')
    expect(malo.isValid).toBe(false)
    if (!malo.isValid) expect(malo.error).toContain('JSON')
  })

  test('formatZodError nombra el archivo y la ruta de la clave', () => {
    const r = SettingsSchema.safeParse({ model: 123 })
    expect(r.success).toBe(false)
    if (!r.success) {
      const errores = formatZodError(r.error, 'settings.json')
      expect(errores[0].file).toBe('settings.json')
      expect(errores[0].path).toContain('model')
    }
  })

  test('filterInvalidPermissionRules quita lo que no es cadena y avisa', () => {
    const d = { permissions: { allow: ['Bash', 123, 'Read'] } } as Record<string, unknown>
    const avisos = filterInvalidPermissionRules(d, 'settings.json')
    expect(avisos).toHaveLength(1)
    expect((d.permissions as { allow: unknown[] }).allow).toEqual(['Bash', 'Read'])
  })
})

describe('loadSettings — del disco, con su origen', () => {
  test('lee las fuentes que existen y declara de donde vino cada clave', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    writeFileSync(join(d, 'user.json'), JSON.stringify({ model: 'claude-sonnet-5', maxTurns: 9 }))
    writeFileSync(join(d, 'project.json'), JSON.stringify({ model: 'claude-opus-5' }))
    const r = loadSettings([
      { source: 'userSettings', path: join(d, 'user.json') },
      { source: 'projectSettings', path: join(d, 'project.json') },
      { source: 'localSettings', path: join(d, 'no-existe.json') },
    ])
    expect(r.settings.model).toBe('claude-opus-5')
    expect(r.settings.maxTurns).toBe(9)
    expect(r.loaded.map((l) => l.source)).toEqual(['userSettings', 'projectSettings'])
    expect(r.errors).toEqual([])
  })

  test('un archivo invalido NO tumba la carga: se anota y las demas fuentes valen', () => {
    const d = mkdtempSync(join(tmpdir(), 'cfg-'))
    writeFileSync(join(d, 'roto.json'), '{no')
    writeFileSync(join(d, 'ok.json'), JSON.stringify({ model: 'claude-opus-5' }))
    const r = loadSettings([
      { source: 'userSettings', path: join(d, 'roto.json') },
      { source: 'projectSettings', path: join(d, 'ok.json') },
    ])
    expect(r.settings.model).toBe('claude-opus-5')
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0].path).toContain('roto.json')
  })

  test('sin ninguna fuente devuelve settings vacios, no lanza', () => {
    const r = loadSettings([{ source: 'userSettings', path: '/no/existe.json' }])
    expect(r.settings).toEqual({})
    expect(r.errors).toEqual([])
  })
})
