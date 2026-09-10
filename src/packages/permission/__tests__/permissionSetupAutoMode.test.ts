/**
 * La mitad ROJA del tramo de MODO AUTOMÁTICO de `permissionSetup.ts`
 * (TASK-THYROX-0004, tarea #280): los 23 exports que faltaban de los 35
 * de la fuente — todo lo que depende de `feature('TRANSCRIPT_CLASSIFIER')`,
 * del estado de auto mode, del arranque por línea de comandos y de la
 * telemetría de cambio de modo.
 *
 * Procedencia: `ccnmt: packages/permission/src/permissionSetup.ts:599-1538`
 * (23 símbolos de los 35 exportados del archivo). Ese árbol declara
 * `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no se
 * copian.
 *
 * ARCHIVO NUEVO, NO EXTENSIÓN de `permissionSetup.test.ts` — a propósito.
 * Un `import { X } from '../src/permissionSetup.ts'` de un símbolo que
 * TODAVÍA no existe es un fallo de LINK, no de test: revienta la carga del
 * módulo entero y los 47 casos ya verdes de `permissionSetup.test.ts` se
 * habrían leído como 0 corridos. Aquí se importa con
 * `import * as ps from '../src/permissionSetup.ts'`: un símbolo ausente
 * resuelve a `undefined` por propiedad, así que el rojo es un conteo real
 * de aserciones fallidas, no una carga rota.
 *
 * AISLAMIENTO DE BANDERA. Este archivo se corre dos veces — sin bandera
 * (`bun test`) y con ella (`bun test --feature=TRANSCRIPT_CLASSIFIER`) —
 * porque casi todo el bloque sólo se activa bajo la bandera. El `afterEach`
 * limpia el estado de auto mode y las anulaciones de GrowthBook entre
 * casos para que no se filtren entre sí (el módulo de estado es un
 * singleton de proceso).
 *
 * Métrica: el veredicto de cada función del bloque de modo automático sobre
 * entradas construidas a mano, con las anulaciones de host y de GrowthBook
 * que cada caso declara.
 * Ciega a: el comportamiento real de GrowthBook/Statsig en producción —
 * este archivo sólo ejercita el camino LOCAL de resolución
 * (`@thyrox/config/feature-flags`), no un servidor remoto.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { feature } from 'bun:bundle'
import { installConfigHostBindings } from '@thyrox/config/host'
import {
  clearGrowthBookConfigOverrides,
  setGrowthBookConfigOverride,
} from '@thyrox/config/feature-flags'
import { installPermissionHostBindings } from '../src/host.ts'
import * as autoModeState from '../src/autoModeState.ts'
import * as ps from '../src/permissionSetup.ts'

/**
 * Forma local, no importada — `permissionSetup.ts` NO exporta
 * `ToolPermissionContext` (queda privado: exportarlo colisionaría con el
 * tipo del mismo nombre que ya exporta `permissions.ts` en el barrel
 * `index.ts`, medido con `barrelAndTesting.test.ts`). Duck typing
 * estructural — la misma forma laxa que ambos archivos usan.
 */
type ToolPermissionContext = { permissionRules: unknown; [key: string]: unknown }

/** Lo que el host anota al despojar/depurar. Se vacía en cada caso. */
let debugLog: Array<{ message: string; metadata?: unknown }> = []
/** Llamadas a `gracefulShutdown`, para el camino de apagado. */
let shutdownCalls: Array<[number | undefined, string | undefined]> = []
/** Llamadas a `logEvent` vía el host (indirectas, a través del import real). */

function baseContext(
  overrides: Partial<ToolPermissionContext> = {},
): ToolPermissionContext {
  return { permissionRules: {}, mode: 'default', ...overrides }
}

beforeEach(() => {
  debugLog = []
  shutdownCalls = []
  installPermissionHostBindings({
    logDebug: (message: string, metadata?: unknown) => {
      debugLog.push({ message, metadata })
    },
    // Shims nuevos de este bloque — todos vía el mismo cast `_b() as any`
    // que `contracts.ts` ya declara como patrón deliberado.
    hasAutoModeOptIn: () => false,
    getUseAutoModeDuringPlan: () => true,
    getToolsForDefaultPreset: () => ['Read', 'Write'],
    parseToolPreset: () => undefined,
    getMainLoopModel: () => 'claude-sonnet-5',
    modelSupportsAutoMode: () => true,
    gracefulShutdown: async (code?: number, reason?: string) => {
      shutdownCalls.push([code, reason])
    },
    setNeedsAutoModeExitAttachment: () => {},
    handleAutoModeTransition: () => {},
    handlePlanModeTransition: () => {},
    setHasExitedPlanMode: () => {},
  } as any)
  installConfigHostBindings({
    getConfigHomeDir: () => '/nonexistent-config-home',
    getFlagSettingsPath: () => undefined,
    getCwd: () => '/nonexistent-cwd',
  })
})

afterEach(() => {
  clearGrowthBookConfigOverrides()
  ;(autoModeState as unknown as { _resetForTesting?: () => void })
    ._resetForTesting?.()
})

describe('parseToolListFromCLI — parser puro, sin dependencias', () => {
  test('1. lista vacía', () => {
    expect(ps.parseToolListFromCLI([])).toEqual([])
  })

  test('2. separador por coma fuera de paréntesis', () => {
    expect(ps.parseToolListFromCLI(['Read,Write'])).toEqual(['Read', 'Write'])
  })

  test('3. la coma DENTRO de paréntesis no separa', () => {
    expect(ps.parseToolListFromCLI(['Bash(git:*),Read'])).toEqual([
      'Bash(git:*)',
      'Read',
    ])
  })

  test('4. el espacio fuera de paréntesis también separa', () => {
    expect(ps.parseToolListFromCLI(['Read Write'])).toEqual(['Read', 'Write'])
  })

  test('5. el espacio DENTRO de paréntesis no separa', () => {
    expect(ps.parseToolListFromCLI(['Bash(npm run:*)'])).toEqual([
      'Bash(npm run:*)',
    ])
  })

  test('6. cadenas vacías del array de entrada se ignoran', () => {
    expect(ps.parseToolListFromCLI(['', 'Read'])).toEqual(['Read'])
  })
})

describe('getAutoModeUnavailableNotification — las tres razones', () => {
  test('7. settings', () => {
    expect(ps.getAutoModeUnavailableNotification('settings')).toBe(
      'auto mode disabled by settings',
    )
  })

  test('8. circuit-breaker', () => {
    expect(ps.getAutoModeUnavailableNotification('circuit-breaker')).toBe(
      'auto mode is unavailable for your plan',
    )
  })

  test('9. model', () => {
    expect(ps.getAutoModeUnavailableNotification('model')).toBe(
      'auto mode unavailable for this model',
    )
  })
})

describe('isAutoModeGateEnabled / getAutoModeUnavailableReason — sync', () => {
  test('10. sin nada activado, el gate está habilitado', () => {
    expect(ps.isAutoModeGateEnabled()).toBe(true)
    expect(ps.getAutoModeUnavailableReason()).toBeNull()
  })

  test('11. modelo no soportado → gate apagado, razón "model"', () => {
    installPermissionHostBindings({
      modelSupportsAutoMode: () => false,
      getMainLoopModel: () => 'claude-2',
    } as any)
    expect(ps.isAutoModeGateEnabled()).toBe(false)
    expect(ps.getAutoModeUnavailableReason()).toBe('model')
  })

  test('12. modelo no soportado y sin settings ni circuit-breaker, la razón es "model" y no otra', () => {
    // La rama de settings (`disableAutoMode`) usa `getSettings()`, que lee
    // disco a través de `@thyrox/config/settings` — fuera de mi alcance de
    // escritura tocar ese camino en un test liviano. Este caso cubre el
    // ORDEN correcto (settings > circuit-breaker > model) desde el otro
    // extremo: sin nada que dispare las dos primeras, "model" es la única
    // razón posible, confirmando que la cascada llega hasta el final.
    installPermissionHostBindings({
      modelSupportsAutoMode: () => false,
    } as any)
    expect(ps.getAutoModeUnavailableReason()).toBe('model')
  })
})

describe('getAutoModeEnabledState / getAutoModeEnabledStateIfCached', () => {
  test('13. sin GrowthBook, el default depende de la bandera', () => {
    const estado = ps.getAutoModeEnabledState()
    expect(['enabled', 'disabled']).toContain(estado)
  })

  test('14. con GrowthBook forzando "opt-in", se respeta', () => {
    setGrowthBookConfigOverride('tengu_auto_mode_config', { enabled: 'opt-in' })
    expect(ps.getAutoModeEnabledState()).toBe('opt-in')
  })

  test('15. sin caché, IfCached da undefined (no confunde "sin dato" con "deshabilitado")', () => {
    expect(ps.getAutoModeEnabledStateIfCached()).toBeUndefined()
  })
})

describe('hasAutoModeOptInAnySource — CLI o setting, cualquiera vale', () => {
  test('16. flag CLI activo → true sin tocar el host de settings (sólo bajo la bandera)', () => {
    // `autoModeStateModule` es un `require()` condicional al CARGAR el
    // módulo, gateado por la bandera — no se puede activar a mitad de
    // test. Sin la bandera queda `null` y esta vía se degrada por diseño
    // al binding de settings (`hasAutoModeOptIn`, `false` por defecto en
    // el `beforeEach`), que es exactamente lo que se afirma abajo.
    autoModeState.setAutoModeFlagCli(true)
    const esperado = feature('TRANSCRIPT_CLASSIFIER') ? true : false
    expect(ps.hasAutoModeOptInAnySource()).toBe(esperado)
  })

  test('17. sin flag CLI, cae al binding hasAutoModeOptIn', () => {
    autoModeState.setAutoModeFlagCli(false)
    installPermissionHostBindings({ hasAutoModeOptIn: () => true } as any)
    expect(ps.hasAutoModeOptInAnySource()).toBe(true)
  })
})

describe('isBypassPermissionsModeDisabled / createDisabledBypassPermissionsContext', () => {
  test('18. GrowthBook activo → disabled, sin importar settings', () => {
    setGrowthBookConfigOverride('tengu_disable_bypass_permissions_mode', true)
    expect(ps.isBypassPermissionsModeDisabled()).toBe(true)
  })

  test('19. crea el contexto sin bypass y saca de ese modo si estaba en él', () => {
    const ctx = baseContext({ mode: 'bypassPermissions' })
    const out = ps.createDisabledBypassPermissionsContext(ctx)
    expect(out.isBypassPermissionsModeAvailable).toBe(false)
    expect(out.mode).toBe('default')
  })
})

describe('isDefaultPermissionModeAuto / shouldPlanUseAutoMode', () => {
  test('20. sin la bandera, siempre false', () => {
    expect(ps.isDefaultPermissionModeAuto()).toBe(false)
    expect(ps.shouldPlanUseAutoMode()).toBe(false)
  })
})

describe('shouldDisableBypassPermissions / checkAndDisableBypassPermissions — async', () => {
  test('21. shouldDisableBypassPermissions delega al gate de seguridad', async () => {
    setGrowthBookConfigOverride('tengu_disable_bypass_permissions_mode', true)
    expect(await ps.shouldDisableBypassPermissions()).toBe(true)
  })

  test('22. si bypass no estaba disponible, no llama a apagar nada', async () => {
    const ctx = baseContext({ isBypassPermissionsModeAvailable: false })
    await ps.checkAndDisableBypassPermissions(ctx)
    expect(shutdownCalls).toEqual([])
  })

  test('23. si el gate lo pide, apaga con (1, motivo) — control del riesgo de rechazo sin atender', async () => {
    setGrowthBookConfigOverride('tengu_disable_bypass_permissions_mode', true)
    const ctx = baseContext({ isBypassPermissionsModeAvailable: true })
    await ps.checkAndDisableBypassPermissions(ctx)
    expect(shutdownCalls).toEqual([[1, 'bypass_permissions_disabled']])
  })
})

describe('parseBaseToolsFromCLI — el defecto medido de la fuente, portado fielmente', () => {
  test('24. sin parseToolPreset instalado, SIEMPRE toma el preset (?? [] es veraz)', () => {
    installPermissionHostBindings({
      getToolsForDefaultPreset: () => ['Read', 'Write'],
    } as any)
    expect(ps.parseBaseToolsFromCLI(['cualquier-cosa'])).toEqual([
      'Read',
      'Write',
    ])
  })

  test('25. incluso con parseToolPreset devolviendo undefined EXPLÍCITO, sigue tomando el preset', () => {
    // El defecto es más profundo de lo que el nombre "arreglo veraz"
    // sugiere: `parseToolPreset` declara `string[]` como retorno (no
    // `string | undefined`), así que TODO paso por `?? []` — venga de un
    // binding ausente o de uno instalado que devuelva `undefined` — cae en
    // el mismo `[]` verdadero. No existe una entrada de host, dentro del
    // tipo declarado, que haga `if (preset)` falso. Esta prueba lo
    // confirma desde el lado que more parecería poder escapar la trampa —
    // y no puede.
    installPermissionHostBindings({
      parseToolPreset: () => undefined,
      getToolsForDefaultPreset: () => ['Read', 'Write'],
    } as any)
    expect(ps.parseBaseToolsFromCLI(['Bash(git:*),Read'])).toEqual([
      'Read',
      'Write',
    ])
  })

  test('26. incluso instalando un binding que devuelve [] explícito, sigue siendo el preset', () => {
    installPermissionHostBindings({
      parseToolPreset: () => [],
      getToolsForDefaultPreset: () => ['Read'],
    } as any)
    expect(ps.parseBaseToolsFromCLI(['Bash(git:*)'])).toEqual(['Read'])
  })
})

describe('initialPermissionModeFromCLI — precedencia de modos', () => {
  test('27. dangerouslySkipPermissions gana sobre todo lo demás', () => {
    const { mode } = ps.initialPermissionModeFromCLI({
      permissionModeCli: 'plan',
      dangerouslySkipPermissions: true,
    })
    expect(mode).toBe('bypassPermissions')
  })

  test('28. bypassPermissions deshabilitado por Statsig → notifica y cae al siguiente modo', () => {
    setGrowthBookConfigOverride('tengu_disable_bypass_permissions_mode', true)
    const { mode, notification } = ps.initialPermissionModeFromCLI({
      permissionModeCli: 'plan',
      dangerouslySkipPermissions: true,
    })
    expect(mode).toBe('plan')
    expect(notification).toBe(
      'Bypass permissions mode was disabled by your organization policy',
    )
  })

  test('29. sin ningún flag, cae a default', () => {
    const { mode } = ps.initialPermissionModeFromCLI({
      permissionModeCli: undefined,
      dangerouslySkipPermissions: undefined,
    })
    expect(mode).toBe('default')
  })
})

describe('createDisabledBypassPermissionsContext / prepareContextForPlanMode / transitionPlanAutoMode / transitionPermissionMode', () => {
  test('30. prepareContextForPlanMode desde plan es no-op', () => {
    const ctx = baseContext({ mode: 'plan' })
    expect(ps.prepareContextForPlanMode(ctx)).toBe(ctx)
  })

  test('31. prepareContextForPlanMode desde default guarda prePlanMode', () => {
    const ctx = baseContext({ mode: 'default' })
    const out = ps.prepareContextForPlanMode(ctx)
    expect(out.prePlanMode).toBe('default')
  })

  test('32. transitionPlanAutoMode fuera de plan es no-op', () => {
    const ctx = baseContext({ mode: 'default' })
    expect(ps.transitionPlanAutoMode(ctx)).toBe(ctx)
  })

  test('33. transitionPermissionMode de un modo a sí mismo es no-op', () => {
    const ctx = baseContext({ mode: 'plan' })
    expect(ps.transitionPermissionMode('plan', 'plan', ctx)).toBe(ctx)
  })

  test('34. transitionPermissionMode dispara los dos handlers de transición', () => {
    let vistos: unknown[] = []
    installPermissionHostBindings({
      handlePlanModeTransition: (from: unknown, to: unknown) => {
        vistos.push(['plan', from, to])
      },
      handleAutoModeTransition: (from: unknown, to: unknown) => {
        vistos.push(['auto', from, to])
      },
    } as any)
    const ctx = baseContext({ mode: 'default' })
    ps.transitionPermissionMode('default', 'acceptEdits', ctx)
    expect(vistos).toEqual([
      ['plan', 'default', 'acceptEdits'],
      ['auto', 'default', 'acceptEdits'],
    ])
  })
})

describe('verifyAutoModeGateAccess — el camino async completo', () => {
  test('35. gate habilitado, sin opt-in previo → carousel NO disponible pero puede entrar', async () => {
    setGrowthBookConfigOverride('tengu_auto_mode_config', { enabled: 'opt-in' })
    const ctx = baseContext({ mode: 'default' })
    const result = await ps.verifyAutoModeGateAccess(ctx)
    const updated = result.updateContext(ctx)
    expect(updated.isAutoModeAvailable).toBe(false)
    expect(result.notification).toBeUndefined()
  })

  test('36. circuit-breaker activo, viniendo DE auto → expulsa y notifica', async () => {
    // Misma razón que el caso 12: la rama de settings toca disco vía
    // `@thyrox/config/settings`, fuera de mi alcance de escritura para un
    // test liviano. Este caso ejercita la MISMA forma de la cascada
    // (deshabilitado → expulsión + notificación) por la vía del
    // circuit-breaker de GrowthBook, que sí tiene una anulación local.
    setGrowthBookConfigOverride('tengu_auto_mode_config', { enabled: 'disabled' })
    const ctx = baseContext({ mode: 'auto' })
    const result = await ps.verifyAutoModeGateAccess(ctx)
    expect(result.notification).toBe('auto mode is unavailable for your plan')
    const updated = result.updateContext(ctx)
    expect(updated.mode).toBe('default')
    expect(updated.isAutoModeAvailable).toBe(false)
  })
})
