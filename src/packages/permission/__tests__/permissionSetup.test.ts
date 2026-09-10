/**
 * La mitad ROJA del tramo de PERMISOS PELIGROSOS de `permissionSetup.ts`.
 *
 * Procedencia: `ccnmt: packages/permission/src/permissionSetup.ts:101-598`
 * (12 símbolos exportados de los 35 del archivo). Ese árbol declara
 * `"license": "UNLICENSED"`, así que los cuerpos se reimplementan y no se
 * copian.
 *
 * POR QUÉ ESTE CORTE Y NO EL ARCHIVO ENTERO. Las líneas 101-598 forman el
 * único bloque del archivo cuyas dependencias ya están todas en este árbol:
 * `dangerousPatterns.ts`, `permissionRuleParser.ts`, `PermissionUpdate.ts` y
 * `@thyrox/config`. Lo que sigue —`transitionPermissionMode` en adelante—
 * depende de banderas de característica (`bun:bundle`), del estado de auto
 * mode y de telemetría, que son tramos aparte. Portar el archivo entero de
 * una vez habría mezclado un bloque decidible con tres que no lo son.
 *
 * QUÉ DECIDE ESTE BLOQUE. Qué regla de permiso es peligrosa **para el modo
 * auto**: una que auto-aprobaría una acción ANTES de que el clasificador
 * pueda evaluarla. No es «peligrosa» en abstracto — `Bash(python:*)` es una
 * regla legítima en modo default; lo que la hace peligrosa es que en modo
 * auto vacía de sentido al clasificador.
 *
 * Métrica: el veredicto de cada predicado sobre reglas concretas, y qué queda
 * en el contexto tras despojar y restaurar.
 * Ciega a: si el clasificador de verdad habría rechazado la acción — este
 * bloque decide qué NUNCA le llega, no qué decide él.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { installConfigHostBindings } from '@thyrox/config/host'
import { installPermissionHostBindings } from '../src/host.ts'
import type {
  PermissionRule,
  PermissionRuleSource,
} from '../src/permissionTypes.ts'
import {
  findDangerousClassifierPermissions,
  findOverlyBroadBashPermissions,
  findOverlyBroadPowerShellPermissions,
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  isDangerousTaskPermission,
  isOverlyBroadBashAllowRule,
  isOverlyBroadPowerShellAllowRule,
  removeDangerousPermissions,
  restoreDangerousPermissions,
  stripDangerousPermissionsForAutoMode,
} from '../src/permissionSetup.ts'

/** Lo que el host anota al despojar. Se vacía en cada caso. */
let debugLog: string[] = []

function allowRule(
  source: PermissionRuleSource,
  toolName: string,
  ruleContent?: string,
): PermissionRule {
  return { source, ruleBehavior: 'allow', ruleValue: { toolName, ruleContent } }
}

beforeEach(() => {
  debugLog = []
  installPermissionHostBindings({
    logDebug: (message: string) => {
      debugLog.push(message)
    },
  })
  // Sin estas, `getSettingsFilePathForSource` revienta para `policySettings` y
  // `flagSettings`: las dos resuelven su ruta preguntándole al anfitrión.
  installConfigHostBindings({
    getConfigHomeDir: () => '/nonexistent-config-home',
    getFlagSettingsPath: () => undefined,
    getCwd: () => '/nonexistent-cwd',
  })
})

describe('isDangerousBashPermission — 11 casos', () => {
  test('1. otra herramienta no es asunto suyo', () => {
    expect(isDangerousBashPermission('PowerShell', undefined)).toBe(false)
    expect(isDangerousBashPermission('Read', '*')).toBe(false)
  })

  test('2. sin contenido = permiso de herramienta = TODO comando', () => {
    expect(isDangerousBashPermission('Bash', undefined)).toBe(true)
  })

  test('3. la cadena vacía es lo mismo que no tener contenido', () => {
    expect(isDangerousBashPermission('Bash', '')).toBe(true)
  })

  test('4. el comodín suelto', () => {
    expect(isDangerousBashPermission('Bash', '*')).toBe(true)
    expect(isDangerousBashPermission('Bash', '  *  ')).toBe(true)
  })

  test('5. el patrón exacto, sin distinguir caja', () => {
    expect(isDangerousBashPermission('Bash', 'python')).toBe(true)
    expect(isDangerousBashPermission('Bash', 'PYTHON')).toBe(true)
    expect(isDangerousBashPermission('Bash', 'Node')).toBe(true)
  })

  test('6. la sintaxis de prefijo `python:*`', () => {
    expect(isDangerousBashPermission('Bash', 'python:*')).toBe(true)
    expect(isDangerousBashPermission('Bash', 'npm run:*')).toBe(true)
  })

  test('7. el comodín pegado `python*` alcanza python3', () => {
    expect(isDangerousBashPermission('Bash', 'python*')).toBe(true)
  })

  test('8. el comodín con espacio `python *`', () => {
    expect(isDangerousBashPermission('Bash', 'python *')).toBe(true)
  })

  test('9. la forma de bandera `python -c*`', () => {
    expect(isDangerousBashPermission('Bash', 'python -c*')).toBe(true)
    expect(isDangerousBashPermission('Bash', 'node -e *')).toBe(true)
  })

  test('10. `python -c` SIN comodín final no alcanza nada arbitrario', () => {
    // Discrimina la guarda `endsWith('*')`: sin ella este caso daría true.
    expect(isDangerousBashPermission('Bash', 'python -c')).toBe(false)
  })

  test('11. una regla acotada de verdad no es peligrosa', () => {
    expect(isDangerousBashPermission('Bash', 'git status')).toBe(false)
    expect(isDangerousBashPermission('Bash', 'ls:*')).toBe(false)
  })
})

describe('isDangerousPowerShellPermission — 8 casos', () => {
  test('12. otra herramienta no es asunto suyo', () => {
    expect(isDangerousPowerShellPermission('Bash', undefined)).toBe(false)
  })

  test('13. sin contenido, o vacío, = TODO comando', () => {
    expect(isDangerousPowerShellPermission('PowerShell', undefined)).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', '')).toBe(true)
  })

  test('14. el comodín suelto', () => {
    expect(isDangerousPowerShellPermission('PowerShell', '*')).toBe(true)
  })

  test('15. los evaluadores propios de PowerShell', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'iex')).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', 'IEX')).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', 'start-process')).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', 'add-type')).toBe(true)
  })

  test('16. hereda los intérpretes multiplataforma', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'python:*')).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', 'invoke-expression:*')).toBe(true)
  })

  test('17. el `.exe` va en la PRIMERA palabra, no al final', () => {
    // `npm run` es el patrón; en Windows el binario real es `npm.exe`.
    expect(isDangerousPowerShellPermission('PowerShell', 'npm.exe run')).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', 'npm.exe run:*')).toBe(true)
    expect(isDangerousPowerShellPermission('PowerShell', 'python.exe:*')).toBe(true)
    // La forma que NO existe: el `.exe` pegado al final del patrón entero.
    expect(isDangerousPowerShellPermission('PowerShell', 'npm run.exe')).toBe(false)
  })

  test('18. un cmdlet de sólo lectura no es peligroso', () => {
    expect(isDangerousPowerShellPermission('PowerShell', 'get-childitem')).toBe(false)
  })
})

describe('isDangerousTaskPermission — 2 casos', () => {
  test('19. CUALQUIER regla de Agent es peligrosa, con contenido o sin él', () => {
    expect(isDangerousTaskPermission('Agent', undefined)).toBe(true)
    expect(isDangerousTaskPermission('Agent', 'general-purpose')).toBe(true)
  })

  test('20. y alcanza al nombre heredado, no sólo al canónico', () => {
    expect(isDangerousTaskPermission('Task', undefined)).toBe(true)
    expect(isDangerousTaskPermission('Bash', undefined)).toBe(false)
  })
})

describe('findDangerousClassifierPermissions — 7 casos', () => {
  test('21. una regla de settings peligrosa sale con su forma de despliegue', () => {
    const found = findDangerousClassifierPermissions(
      [allowRule('userSettings', 'Bash', 'python:*')],
      [],
    )
    expect(found).toHaveLength(1)
    expect(found[0]!.ruleDisplay).toBe('Bash(python:*)')
    expect(found[0]!.ruleValue).toEqual({ toolName: 'Bash', ruleContent: 'python:*' })
  })

  test('22. sin contenido, la forma de despliegue es `(*)` — no `()`', () => {
    const found = findDangerousClassifierPermissions(
      [allowRule('localSettings', 'Bash', undefined)],
      [],
    )
    expect(found[0]!.ruleDisplay).toBe('Bash(*)')
  })

  test('23. una regla de negación NO es peligrosa, aunque su contenido lo sea', () => {
    const denyRule: PermissionRule = {
      source: 'userSettings',
      ruleBehavior: 'deny',
      ruleValue: { toolName: 'Bash', ruleContent: '*' },
    }
    expect(findDangerousClassifierPermissions([denyRule], [])).toHaveLength(0)
  })

  test('24. las de la línea de comandos se parsean y se marcan como tal', () => {
    const found = findDangerousClassifierPermissions([], ['Bash(python:*)', 'Read'])
    expect(found).toHaveLength(1)
    expect(found[0]!.source).toBe('cliArg')
    expect(found[0]!.sourceDisplay).toBe('--allowed-tools')
    expect(found[0]!.ruleDisplay).toBe('Bash(python:*)')
  })

  test('25. `Bash` a secas en la línea de comandos también se despliega `(*)`', () => {
    const found = findDangerousClassifierPermissions([], ['Bash'])
    expect(found).toHaveLength(1)
    expect(found[0]!.ruleDisplay).toBe('Bash(*)')
    expect(found[0]!.ruleValue.ruleContent).toBeUndefined()
  })

  test('26. una fuente que NO es de settings se despliega verbatim', () => {
    const found = findDangerousClassifierPermissions(
      [allowRule('session', 'Agent', undefined)],
      [],
    )
    expect(found[0]!.sourceDisplay).toBe('session')
  })

  test('27. una fuente de settings se despliega como RUTA, no como su nombre', () => {
    const found = findDangerousClassifierPermissions(
      [allowRule('userSettings', 'Bash', '*')],
      [],
    )
    expect(found[0]!.sourceDisplay).not.toBe('userSettings')
    expect(found[0]!.sourceDisplay).toContain('settings.json')
  })
})

describe('la rama Tmux, que sólo existe para uso interno — 2 casos', () => {
  test('28. con USER_TYPE=ant, Tmux es peligroso: send-keys ejecuta shell', () => {
    const previo = process.env.USER_TYPE
    process.env.USER_TYPE = 'ant'
    try {
      const found = findDangerousClassifierPermissions(
        [allowRule('session', 'Tmux', 'send-keys:*')],
        [],
      )
      expect(found).toHaveLength(1)
    } finally {
      if (previo === undefined) delete process.env.USER_TYPE
      else process.env.USER_TYPE = previo
    }
  })

  test('29. sin USER_TYPE=ant, Tmux no lo es', () => {
    const previo = process.env.USER_TYPE
    delete process.env.USER_TYPE
    try {
      const found = findDangerousClassifierPermissions(
        [allowRule('session', 'Tmux', 'send-keys:*')],
        [],
      )
      expect(found).toHaveLength(0)
    } finally {
      if (previo !== undefined) process.env.USER_TYPE = previo
    }
  })
})

describe('reglas demasiado amplias — 6 casos', () => {
  test('30. Bash sin contenido es demasiado amplia; con contenido, no', () => {
    expect(isOverlyBroadBashAllowRule({ toolName: 'Bash' })).toBe(true)
    expect(isOverlyBroadBashAllowRule({ toolName: 'Bash', ruleContent: 'python:*' })).toBe(false)
    expect(isOverlyBroadBashAllowRule({ toolName: 'PowerShell' })).toBe(false)
  })

  test('31. PowerShell, igual', () => {
    expect(isOverlyBroadPowerShellAllowRule({ toolName: 'PowerShell' })).toBe(true)
    expect(isOverlyBroadPowerShellAllowRule({ toolName: 'PowerShell', ruleContent: 'iex' })).toBe(false)
    expect(isOverlyBroadPowerShellAllowRule({ toolName: 'Bash' })).toBe(false)
  })

  test('32. el barrido de Bash junta settings y línea de comandos', () => {
    const found = findOverlyBroadBashPermissions(
      [allowRule('projectSettings', 'Bash', undefined)],
      ['Bash(*)'],
    )
    expect(found).toHaveLength(2)
    expect(found.every(f => f.ruleDisplay === 'Bash(*)')).toBe(true)
    expect(found[1]!.sourceDisplay).toBe('--allowed-tools')
  })

  test('33. una regla de Bash ACOTADA no es demasiado amplia', () => {
    const found = findOverlyBroadBashPermissions(
      [allowRule('projectSettings', 'Bash', 'git status')],
      ['Bash(ls:*)'],
    )
    expect(found).toHaveLength(0)
  })

  test('34. una regla de negación tampoco entra en el barrido', () => {
    const denyRule: PermissionRule = {
      source: 'projectSettings',
      ruleBehavior: 'deny',
      ruleValue: { toolName: 'Bash' },
    }
    expect(findOverlyBroadBashPermissions([denyRule], [])).toHaveLength(0)
  })

  test('35. el barrido de PowerShell es simétrico', () => {
    const found = findOverlyBroadPowerShellPermissions(
      [allowRule('localSettings', 'PowerShell', undefined)],
      ['PowerShell'],
    )
    expect(found).toHaveLength(2)
    expect(found.every(f => f.ruleDisplay === 'PowerShell(*)')).toBe(true)
  })
})

describe('removeDangerousPermissions — 3 casos', () => {
  test('36. retira la regla del contexto por su destino', () => {
    const context = {
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Bash(python:*)', 'Read(**)'] },
    }
    const dangerous = findDangerousClassifierPermissions(
      [allowRule('userSettings', 'Bash', 'python:*')],
      [],
    )
    const out = removeDangerousPermissions(context, dangerous)
    expect((out.alwaysAllowRules as Record<string, string[]>).userSettings).toEqual(['Read(**)'])
  })

  test('37. una fuente que no se puede persistir se SALTA, no se retira', () => {
    const context = {
      permissionRules: {},
      alwaysAllowRules: { policySettings: ['Bash(*)'] },
    }
    const dangerous = findDangerousClassifierPermissions(
      [allowRule('policySettings', 'Bash', undefined)],
      [],
    )
    expect(dangerous).toHaveLength(1)
    const out = removeDangerousPermissions(context, dangerous)
    expect((out.alwaysAllowRules as Record<string, string[]>).policySettings).toEqual(['Bash(*)'])
  })

  test('38. sin nada peligroso, devuelve el mismo contexto', () => {
    const context = { permissionRules: {}, alwaysAllowRules: {} }
    expect(removeDangerousPermissions(context, [])).toBe(context)
  })
})

describe('stripDangerousPermissionsForAutoMode — 5 casos', () => {
  test('39. sin nada peligroso, el escondite queda declarado y vacío', () => {
    const out = stripDangerousPermissionsForAutoMode({
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Read(**)'] },
    })
    expect(out.strippedDangerousRules).toEqual({})
  })

  test('40. despoja la peligrosa y la guarda en el escondite', () => {
    const out = stripDangerousPermissionsForAutoMode({
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Bash(python:*)', 'Read(**)'] },
    })
    expect((out.alwaysAllowRules as Record<string, string[]>).userSettings).toEqual(['Read(**)'])
    expect(out.strippedDangerousRules).toEqual({ userSettings: ['Bash(python:*)'] })
  })

  test('41. el escondite refleja lo que DE VERDAD se retiró, no lo hallado', () => {
    // `policySettings` no se puede persistir: se halla peligrosa y NO se
    // retira, así que tampoco entra al escondite. Si entrara, restaurar
    // añadiría una regla que nunca se quitó.
    //
    // Y el escondite guarda la forma CANÓNICA, no la tecleada: `Agent(*)` y
    // `Agent` son la misma regla —el parser descarta el `(*)` vacío— así que
    // el viaje de ida y vuelta la normaliza. Sin esto, restaurar dejaría dos
    // cadenas distintas para una sola regla.
    const out = stripDangerousPermissionsForAutoMode({
      permissionRules: {},
      alwaysAllowRules: { policySettings: ['Bash(*)'], session: ['Agent(*)'] },
    })
    expect(out.strippedDangerousRules).toEqual({ session: ['Agent'] })
  })

  test('42. deja constancia en el registro del anfitrión', () => {
    stripDangerousPermissionsForAutoMode({
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Bash(*)'] },
    })
    expect(debugLog.some(m => m.includes('Bash(*)'))).toBe(true)
  })

  test('43. un escondite previo sobrevive si no hay nada nuevo que despojar', () => {
    const out = stripDangerousPermissionsForAutoMode({
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Read(**)'] },
      strippedDangerousRules: { userSettings: ['Bash(*)'] },
    })
    expect(out.strippedDangerousRules).toEqual({ userSettings: ['Bash(*)'] })
  })
})

describe('restoreDangerousPermissions — 4 casos', () => {
  test('44. sin escondite, el contexto vuelve por referencia', () => {
    const context = { permissionRules: {}, alwaysAllowRules: {} }
    expect(restoreDangerousPermissions(context)).toBe(context)
  })

  test('45. devuelve la regla a su fuente y vacía el escondite', () => {
    const out = restoreDangerousPermissions({
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Read(**)'] },
      strippedDangerousRules: { userSettings: ['Bash(python:*)'] },
    })
    expect((out.alwaysAllowRules as Record<string, string[]>).userSettings).toEqual([
      'Read(**)',
      'Bash(python:*)',
    ])
    expect(out.strippedDangerousRules).toBeUndefined()
  })

  test('46. la segunda restauración no duplica nada', () => {
    const once = restoreDangerousPermissions({
      permissionRules: {},
      alwaysAllowRules: {},
      strippedDangerousRules: { session: ['Agent(*)'] },
    })
    const twice = restoreDangerousPermissions(once)
    // `Agent(*)` vuelve en su forma canónica `Agent` — ver el caso 41.
    expect((twice.alwaysAllowRules as Record<string, string[]>).session).toEqual(['Agent'])
  })

  test('47. despojar y restaurar es la identidad sobre las reglas', () => {
    const original = {
      permissionRules: {},
      alwaysAllowRules: { userSettings: ['Read(**)', 'Bash(python:*)'] },
    }
    const restored = restoreDangerousPermissions(
      stripDangerousPermissionsForAutoMode(original),
    )
    const rules = (restored.alwaysAllowRules as Record<string, string[]>).userSettings!
    expect([...rules].sort()).toEqual(['Bash(python:*)', 'Read(**)'])
  })
})
