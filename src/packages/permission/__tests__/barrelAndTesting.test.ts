/**
 * La mitad ROJA del tramo del BARREL, el shim de estado y los dobles de prueba.
 *
 * Procedencia: `ccnmt: packages/permission/src/{index.ts,appStateHooks.ts,
 * testing/index.ts}`. Ese árbol declara `"license": "UNLICENSED"`, así que
 * los cuerpos se reimplementan y no se copian.
 *
 * POR QUÉ AHORA. El barrel de la fuente reexporta 14 módulos, y uno de ellos
 * era `permissionSetup.js`: hasta el tramo anterior no existía en este árbol,
 * así que portar el barrel habría producido un archivo que revienta al
 * importarse. Ese bloqueo cayó, y con él los otros dos: `appStateHooks.ts`
 * resuelve `@thyrox/app-host/state/AppState.js` —medido, expone las tres
 * funciones que el shim reenvía— y `testing/index.ts` no importa nada.
 *
 * QUÉ NO ENTRA, y su bloqueo es real: `classifierApprovalsHook.ts` importa
 * `react` DIRECTO, y `react` no resuelve desde este paquete (medido:
 * «Cannot find package 'react'»). El shim de estado sí funciona porque su
 * require es PEREZOSO y sale por app-host, que sí lo tiene enlazado — es
 * exactamente la razón por la que la fuente lo escribió así.
 *
 * Métrica: qué símbolos alcanza el barrel, cuándo se carga el módulo del
 * anfitrión, y qué decide cada doble de prueba.
 * Ciega a: si el símbolo que el barrel alcanza HACE lo que promete — eso lo
 * miden las suites de cada módulo, no ésta.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import * as barrel from '../src/index.ts'
import {
  useAppState,
  useAppStateStore,
  useSetAppState,
} from '../src/appStateHooks.ts'
import {
  AllowAllPermission,
  DenyAllPermission,
  ScriptedPermission,
} from '../src/testing/index.ts'

const RAIZ = join(import.meta.dir, '..')

describe('index.ts — el barrel — 6 casos', () => {
  test('1. trae los dos anclajes del anfitrión', () => {
    expect(typeof barrel.installPermissionHostBindings).toBe('function')
    expect(typeof barrel.getPermissionHostBindings).toBe('function')
  })

  test('2. trae los 12 símbolos del bloque de permisos peligrosos', () => {
    for (const nombre of [
      'isDangerousBashPermission',
      'isDangerousPowerShellPermission',
      'isDangerousTaskPermission',
      'findDangerousClassifierPermissions',
      'isOverlyBroadBashAllowRule',
      'isOverlyBroadPowerShellAllowRule',
      'findOverlyBroadBashPermissions',
      'findOverlyBroadPowerShellPermissions',
      'removeDangerousPermissions',
      'stripDangerousPermissionsForAutoMode',
      'restoreDangerousPermissions',
    ]) {
      expect(typeof (barrel as Record<string, unknown>)[nombre]).toBe('function')
    }
  })

  test('3. trae la capa de actualización y la de parseo', () => {
    expect(typeof barrel.applyPermissionUpdate).toBe('function')
    expect(typeof barrel.permissionRuleValueFromString).toBe('function')
    expect(typeof barrel.permissionRuleValueToString).toBe('function')
  })

  test('4. trae las seis clases de error', () => {
    for (const nombre of [
      'PermissionBaseError',
      'DeniedError',
      'AskRequiredError',
      'ContextError',
      'AbortError',
      'HostBindingsError',
    ]) {
      expect(typeof (barrel as Record<string, unknown>)[nombre]).toBe('function')
    }
  })

  test('5. ningún nombre colisiona entre los 12 `export *`', () => {
    // Un nombre exportado por dos módulos se cae del barrel EN SILENCIO: ESM
    // lo omite en vez de fallar. Por eso la ausencia de colisión se mide.
    const modulos = [
      'permissions', 'permissionSetup', 'PermissionMode', 'PermissionResult',
      'PermissionRule', 'PermissionUpdate', 'PermissionUpdateSchema',
      'PermissionPromptToolResultSchema', 'filesystem', 'denialTracking',
      'permissionRuleParser', 'errors',
    ]
    const vistos = new Map<string, string>()
    const colisiones: string[] = []
    for (const modulo of modulos) {
      const fuente = readFileSync(join(RAIZ, 'src', `${modulo}.ts`), 'utf8')
      for (const nombre of nombresExportados(fuente)) {
        const previo = vistos.get(nombre)
        if (previo) colisiones.push(`${nombre} (${previo} y ${modulo})`)
        else vistos.set(nombre, modulo)
      }
    }
    expect(colisiones).toEqual([])
  })

  test('6. lo que un módulo NO exporta tampoco sale por el barrel', () => {
    // `formatPermissionSource` e `isPermissionUpdateDestination` son internos
    // de permissionSetup. Si alguna vez se exportaran «por comodidad», este
    // caso lo dice.
    expect((barrel as Record<string, unknown>).formatPermissionSource).toBeUndefined()
    expect((barrel as Record<string, unknown>).isPermissionUpdateDestination).toBeUndefined()
  })
})

/** Los nombres que un archivo exporta, por forma de declaración. */
function nombresExportados(fuente: string): Set<string> {
  const nombres = new Set<string>()
  const declaracion = /^export\s+(?:async\s+)?(?:function|const|let|class|enum)\s+(\w+)/gm
  const tipo = /^export\s+(?:type|interface)\s+(\w+)/gm
  const bloque = /^export\s+(?:type\s+)?\{([^}]*)\}/gms
  for (const m of fuente.matchAll(declaracion)) nombres.add(m[1]!)
  for (const m of fuente.matchAll(tipo)) nombres.add(m[1]!)
  for (const m of fuente.matchAll(bloque)) {
    for (const parte of m[1]!.split(',')) {
      const limpio = parte.trim().split(' as ').pop()!.trim().replace('type ', '')
      if (limpio) nombres.add(limpio)
    }
  }
  return nombres
}

describe('appStateHooks.ts — el shim perezoso — 4 casos', () => {
  test('7. importar el shim NO carga el módulo del anfitrión', () => {
    // La pereza ES la razón de ser del archivo: sin ella, cualquier importador
    // del paquete arrastraría app-host —y con él react— sólo por existir. Se
    // mide en un proceso hijo porque la suite entera comparte un registro de
    // módulos, y otro archivo pudo haberlo cargado ya.
    const visto = sonda(`
      const antes = cargados()
      await import('${join(RAIZ, 'src/appStateHooks.ts')}')
      console.log(JSON.stringify({ antes, despues: cargados() }))
    `)
    expect(visto.antes).toBe(0)
    expect(visto.despues).toBe(0)
  })

  test('8. llamar al shim SÍ lo carga — la pereza es real, no aparente', () => {
    const visto = sonda(`
      const mod = await import('${join(RAIZ, 'src/appStateHooks.ts')}')
      const antes = cargados()
      try { mod.useSetAppState() } catch {}
      console.log(JSON.stringify({ antes, despues: cargados() }))
    `)
    expect(visto.antes).toBe(0)
    expect(visto.despues).toBe(1)
  })

  test('9. las tres llegan al hook REAL, no a un stub', () => {
    // Fuera de un render, React revienta con su error de despachador. Ese
    // error es la evidencia de que el shim resolvió y reenvió: uno que no
    // resolviera reventaría con «Cannot find package».
    for (const llamada of [
      () => useAppState((s: unknown) => s),
      () => useSetAppState(),
      () => useAppStateStore(),
    ]) {
      let mensaje = ''
      try {
        llamada()
      } catch (e) {
        mensaje = String((e as Error).message)
      }
      expect(mensaje).not.toBe('')
      expect(mensaje).not.toContain('Cannot find package')
      expect(mensaje.toLowerCase()).toContain('dispatcher')
    }
  })

  test('10. exporta exactamente las tres funciones de la fuente', () => {
    const fuente = readFileSync(join(RAIZ, 'src/appStateHooks.ts'), 'utf8')
    const funciones = [...fuente.matchAll(/^export function (\w+)/gm)].map(m => m[1])
    expect(funciones.sort()).toEqual([
      'useAppState',
      'useAppStateStore',
      'useSetAppState',
    ])
  })
})

/** Corre un fragmento en un proceso hijo y devuelve lo que imprimió. */
function sonda(cuerpo: string): { antes: number; despues: number } {
  const guion = `
    function cargados() {
      return Object.keys(require.cache || {}).filter(k => k.includes('AppState')).length
    }
    ${cuerpo}
  `
  const ruta = `/dev/shm/sonda-appstate-${process.pid}-${Math.random().toString(36).slice(2)}.ts`
  Bun.write(ruta, guion)
  const salida = Bun.spawnSync(['bun', ruta], { cwd: RAIZ })
  const texto = salida.stdout.toString().trim()
  // Sin esta aserción, una excepción tragada en el hijo dejaría el veredicto
  // midiendo silencio en vez de conducta.
  expect(texto).not.toBe('')
  return JSON.parse(texto.split('\n').pop()!)
}

describe('testing/index.ts — los tres dobles — 7 casos', () => {
  test('11. AllowAllPermission permite, sea cual sea la herramienta', () => {
    const doble = new AllowAllPermission()
    expect(doble.check('Bash', { command: 'rm -rf /' })).toEqual({ behavior: 'allow' })
    expect(doble.check('FileEdit', undefined)).toEqual({ behavior: 'allow' })
  })

  test('12. DenyAllPermission niega igual de indiscriminadamente', () => {
    const doble = new DenyAllPermission()
    expect(doble.check('Read', { path: '/etc/hosts' })).toEqual({ behavior: 'deny' })
  })

  test('13. ScriptedPermission entrega en el orden declarado', () => {
    const doble = new ScriptedPermission([
      { behavior: 'allow' },
      { behavior: 'deny' },
      { behavior: 'ask' },
    ])
    expect(doble.check('Bash', {}).behavior).toBe('allow')
    expect(doble.check('FileEdit', {}).behavior).toBe('deny')
    expect(doble.check('Bash', {}).behavior).toBe('ask')
  })

  test('14. al agotarse revienta, y el mensaje dice cuántas había', () => {
    const doble = new ScriptedPermission([{ behavior: 'allow' }])
    doble.check('Bash', {})
    expect(() => doble.check('Bash', {})).toThrow(/no more decisions.*used 1.*had 1/)
  })

  test('15. `consumed` cuenta lo entregado, no lo declarado', () => {
    const doble = new ScriptedPermission([{ behavior: 'allow' }, { behavior: 'deny' }])
    expect(doble.consumed).toBe(0)
    doble.check('Bash', {})
    expect(doble.consumed).toBe(1)
  })

  test('16. `reset` vuelve al principio y se puede repetir el guion', () => {
    const doble = new ScriptedPermission([{ behavior: 'allow' }, { behavior: 'deny' }])
    doble.check('Bash', {})
    doble.check('Bash', {})
    doble.reset()
    expect(doble.consumed).toBe(0)
    expect(doble.check('Bash', {}).behavior).toBe('allow')
  })

  test('17. el módulo de dobles NO importa nada del paquete', () => {
    // Regla dura de la fuente: los dobles no pueden depender de lo interno,
    // porque entonces un cambio interno rompería los tests de sus consumidores.
    const fuente = readFileSync(join(RAIZ, 'src/testing/index.ts'), 'utf8')
    expect([...fuente.matchAll(/^import .*/gm)].map(m => m[0])).toEqual([])
  })
})
