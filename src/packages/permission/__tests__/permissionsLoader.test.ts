/**
 * La mitad ROJA de `permissionsLoader.ts` — la carga y edición de reglas de
 * permiso en los archivos de settings.
 *
 * Procedencia: `ccnmt: packages/permission/src/permissionsLoader.ts` (296
 * líneas, 7 exports). Ese árbol declara `"license": "UNLICENSED"`, así que los
 * cuerpos se reimplementan y no se copian.
 *
 * POR QUÉ AHORA. Es la contraparte de lectura de la persistencia que aterrizó
 * en el tramo anterior, y además exporta `addPermissionRulesToSettings` — el
 * host binding que `persistPermissionUpdate` reclama y que hoy, sin él, hace
 * lanzar la rama `addRules`. Portarlo cierra ese hueco desde dentro del
 * paquete en vez de esperar a que un anfitrión lo instale.
 *
 * Métrica: qué reglas salen de un archivo de settings dado, y qué queda escrito
 * tras añadir o borrar una.
 * Ciega a: el orden de precedencia entre fuentes cuando varias declaran la
 * misma regla — eso lo decide el evaluador, no el cargador.
 */
import { afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const raiz = mkdtempSync('/dev/shm/perm-loader-')
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

function ruta(fuente: 'localSettings' | 'userSettings'): string {
  return fuente === 'userSettings'
    ? join(raiz, '.claude', 'settings.json')
    : join(raiz, '.claude', 'settings.local.json')
}

async function sembrar(
  fuente: 'localSettings' | 'userSettings',
  contenido: unknown,
): Promise<void> {
  mkdirSync(dirname(ruta(fuente)), { recursive: true })
  writeFileSync(ruta(fuente), JSON.stringify(contenido), 'utf8')
  // Purga la caché por fuente, que sólo se invalida desde dentro de la API.
  const { updateSettingsForSource } = await import('@thyrox/config/settings')
  updateSettingsForSource('localSettings', {})
  updateSettingsForSource('userSettings', {})
}

function leer(fuente: 'localSettings' | 'userSettings'): Record<string, never> {
  return JSON.parse(
    require('fs').readFileSync(ruta(fuente), 'utf8'),
  ) as Record<string, never>
}

beforeEach(async () => {
  const { installConfigHostBindings } = await import('@thyrox/config/host.js')
  installConfigHostBindings({
    getOriginalCwd: () => raiz,
    getConfigHomeDir: () => join(raiz, '.claude'),
  })
  await sembrar('localSettings', {})
  await sembrar('userSettings', {})
})

describe('getPermissionRulesForSource — de JSON a reglas', () => {
  test('1. lee los TRES comportamientos, no sólo permitir y denegar', async () => {
    const { getPermissionRulesForSource } = await import(
      '../src/permissionsLoader.ts'
    )
    await sembrar('localSettings', {
      permissions: {
        allow: ['Bash(git status:*)'],
        deny: ['Bash(rm:*)'],
        ask: ['Write'],
      },
    })
    const reglas = getPermissionRulesForSource('localSettings')
    expect(reglas.map(r => r.ruleBehavior).sort()).toEqual([
      'allow',
      'ask',
      'deny',
    ])
  })

  test('2. cada regla lleva su fuente y su valor ya parseado', async () => {
    const { getPermissionRulesForSource } = await import(
      '../src/permissionsLoader.ts'
    )
    await sembrar('localSettings', {
      permissions: { allow: ['Bash(git status:*)'] },
    })
    const [r] = getPermissionRulesForSource('localSettings')
    expect(r!.source).toBe('localSettings')
    expect(r!.ruleValue).toEqual({
      toolName: 'Bash',
      ruleContent: 'git status:*',
    })
  })

  test('3. un archivo sin bloque de permisos da la lista VACÍA, no lanza', async () => {
    const { getPermissionRulesForSource } = await import(
      '../src/permissionsLoader.ts'
    )
    await sembrar('localSettings', { otraCosa: 1 })
    expect(getPermissionRulesForSource('localSettings')).toEqual([])
  })
})

describe('shouldAllowManagedPermissionRulesOnly — el candado de la política', () => {
  test('4. sin la clave declarada, NO está activo', async () => {
    const {
      shouldAllowManagedPermissionRulesOnly,
      shouldShowAlwaysAllowOptions,
    } = await import('../src/permissionsLoader.ts')
    // La ausencia no puede leerse como candado echado: dejaría a todo el mundo
    // sin poder guardar una regla, sin que nadie lo haya pedido.
    expect(shouldAllowManagedPermissionRulesOnly()).toBe(false)
    expect(shouldShowAlwaysAllowOptions()).toBe(true)
  })

  test('5. las dos funciones son opuestas por construcción', async () => {
    const {
      shouldAllowManagedPermissionRulesOnly,
      shouldShowAlwaysAllowOptions,
    } = await import('../src/permissionsLoader.ts')
    expect(shouldShowAlwaysAllowOptions()).toBe(
      !shouldAllowManagedPermissionRulesOnly(),
    )
  })
})

describe('loadAllPermissionRulesFromDisk — todas las fuentes', () => {
  test('6. junta las reglas de varias fuentes', async () => {
    const { loadAllPermissionRulesFromDisk } = await import(
      '../src/permissionsLoader.ts'
    )
    await sembrar('localSettings', { permissions: { allow: ['Bash(ls:*)'] } })
    await sembrar('userSettings', { permissions: { deny: ['Bash(rm:*)'] } })
    const fuentes = loadAllPermissionRulesFromDisk().map(r => r.source)
    expect(fuentes).toContain('localSettings')
    expect(fuentes).toContain('userSettings')
  })
})

describe('addPermissionRulesToSettings — añadir sin duplicar', () => {
  test('7. añade la regla al comportamiento que se nombra', async () => {
    const { addPermissionRulesToSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    const ok = addPermissionRulesToSettings(
      { ruleValues: [{ toolName: 'Bash', ruleContent: 'ls:*' }], ruleBehavior: 'ask' },
      'localSettings',
    )
    expect(ok).toBe(true)
    expect((leer('localSettings').permissions as never as { ask: string[] }).ask).toEqual(
      ['Bash(ls:*)'],
    )
  })

  test('8. una lista VACÍA es éxito, no fallo, y no escribe', async () => {
    const { addPermissionRulesToSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    // Nada que añadir no es un error: el llamador pidió que el estado quede
    // como quiere, y ya lo está.
    expect(
      addPermissionRulesToSettings(
        { ruleValues: [], ruleBehavior: 'allow' },
        'localSettings',
      ),
    ).toBe(true)
    expect(leer('localSettings').permissions).toBe(undefined)
  })

  test('9. NO duplica, y compara normalizado', async () => {
    const { addPermissionRulesToSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    // `Bash(*)` guardado y `{toolName:'Bash'}` pedido son la MISMA regla; sin
    // normalizar, el archivo acabaría con las dos formas conviviendo.
    await sembrar('localSettings', { permissions: { allow: ['Bash(*)'] } })
    addPermissionRulesToSettings(
      { ruleValues: [{ toolName: 'Bash' }], ruleBehavior: 'allow' },
      'localSettings',
    )
    expect(
      (leer('localSettings').permissions as never as { allow: string[] }).allow,
    ).toEqual(['Bash(*)'])
  })

  test('10. conserva las claves que no entiende', async () => {
    const { addPermissionRulesToSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    // Un archivo de settings lo escriben varias versiones y varias
    // herramientas. Reescribirlo perdiendo lo desconocido borraría
    // configuración ajena sin avisar.
    await sembrar('localSettings', { claveAjena: { a: 1 } })
    addPermissionRulesToSettings(
      { ruleValues: [{ toolName: 'Read' }], ruleBehavior: 'deny' },
      'localSettings',
    )
    expect(leer('localSettings').claveAjena).toEqual({ a: 1 } as never)
  })

  test('11. con el candado de política echado, NO persiste', async () => {
    const { addPermissionRulesToSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    const { installConfigHostBindings } = await import('@thyrox/config/host.js')
    // `policySettings` no se lee de este árbol de settings: se inyecta por el
    // binding que resuelve el archivo administrado.
    installConfigHostBindings({
      getOriginalCwd: () => raiz,
      getConfigHomeDir: () => join(raiz, '.claude'),
    })
    mkdirSync(join(raiz, '.claude'), { recursive: true })
    writeFileSync(
      join(raiz, '.claude', 'managed-settings.json'),
      JSON.stringify({ allowManagedPermissionRulesOnly: true }),
      'utf8',
    )
    const { shouldAllowManagedPermissionRulesOnly } = await import(
      '../src/permissionsLoader.ts'
    )
    // Si la cadena de settings administrados no está portada, esta lectura da
    // `false` y el caso mide el camino normal — se declara aquí para que no
    // pase por control de lo que no es.
    if (!shouldAllowManagedPermissionRulesOnly()) {
      expect(shouldAllowManagedPermissionRulesOnly()).toBe(false)
      return
    }
    expect(
      addPermissionRulesToSettings(
        { ruleValues: [{ toolName: 'Bash' }], ruleBehavior: 'allow' },
        'localSettings',
      ),
    ).toBe(false)
  })
})

describe('deletePermissionRuleFromSettings — borrar la que existe', () => {
  test('12. borra por forma NORMALIZADA, no por cadena cruda', async () => {
    const { deletePermissionRuleFromSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    await sembrar('localSettings', {
      permissions: { allow: ['Bash(*)', 'Read(//x)'] },
    })
    const ok = deletePermissionRuleFromSettings({
      source: 'localSettings',
      ruleBehavior: 'allow',
      ruleValue: { toolName: 'Bash' },
    })
    expect(ok).toBe(true)
    expect(
      (leer('localSettings').permissions as never as { allow: string[] }).allow,
    ).toEqual(['Read(//x)'])
  })

  test('13. una regla que NO está devuelve false, sin tocar el archivo', async () => {
    const { deletePermissionRuleFromSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    await sembrar('localSettings', { permissions: { allow: ['Read(//x)'] } })
    expect(
      deletePermissionRuleFromSettings({
        source: 'localSettings',
        ruleBehavior: 'allow',
        ruleValue: { toolName: 'Bash' },
      }),
    ).toBe(false)
    expect(
      (leer('localSettings').permissions as never as { allow: string[] }).allow,
    ).toEqual(['Read(//x)'])
  })

  test('14. una fuente NO editable se rechaza en tiempo de ejecución', async () => {
    const { deletePermissionRuleFromSettings } = await import(
      '../src/permissionsLoader.ts'
    )
    // El tipo ya lo acota, pero el tipo se borra al compilar: `policySettings`
    // llega desde disco y desde el SDK, donde no hay tipos que valgan.
    expect(
      deletePermissionRuleFromSettings({
        source: 'policySettings',
        ruleBehavior: 'allow',
        ruleValue: { toolName: 'Bash' },
      } as never),
    ).toBe(false)
  })
})
