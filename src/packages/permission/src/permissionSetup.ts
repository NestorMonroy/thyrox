/**
 * Qué regla de permiso es peligrosa PARA EL MODO AUTO, y cómo se despoja.
 *
 * Procedencia: `ccnmt: packages/permission/src/permissionSetup.ts:101-598`
 * (1538 líneas, 35 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * PORTE PARCIAL DECLARADO — 12 de los 35 exports de la fuente:
 *
 *   isDangerousBashPermission · isDangerousPowerShellPermission ·
 *   isDangerousTaskPermission · DangerousPermissionInfo ·
 *   findDangerousClassifierPermissions · isOverlyBroadBashAllowRule ·
 *   isOverlyBroadPowerShellAllowRule · findOverlyBroadBashPermissions ·
 *   findOverlyBroadPowerShellPermissions · removeDangerousPermissions ·
 *   stripDangerousPermissionsForAutoMode · restoreDangerousPermissions
 *
 * Los 23 restantes —desde `transitionPermissionMode` hasta el final del
 * archivo— quedan fuera de este pase con su bloqueo NOMBRADO, no diferido:
 * dependen de banderas de característica (`feature('TRANSCRIPT_CLASSIFIER')`
 * de `bun:bundle`), del estado de auto mode, del arranque desde la línea de
 * comandos y de telemetría. No es que sean grandes: es que su insumo no está
 * en este árbol todavía. Sucesor: TASK-THYROX-0004.
 *
 * QUÉ DECIDE ESTE BLOQUE, Y QUÉ NO. Decide qué regla auto-aprobaría una
 * acción **antes** de que el clasificador pueda evaluarla. `Bash(python:*)`
 * no es una regla insegura en abstracto —en modo default es legítima—; lo
 * que la hace peligrosa aquí es que en modo auto vacía de sentido al
 * clasificador. Por eso el despojo es reversible: al salir de auto, las
 * reglas vuelven.
 *
 * DIVERGENCIA DECLARADA — ninguna en la lógica. La única diferencia con la
 * fuente es de cableado: donde ella toma `getCwd` de un binding del
 * anfitrión y `logForDebugging` de otro, aquí se usa el mismo shim `_b()`
 * sobre `getPermissionHostBindings()`, que es el idioma que ya usan
 * `filesystem.ts` y `PermissionUpdate.ts` en este paquete.
 */
import { relative } from 'path'
import { SETTING_SOURCES, type SettingSource } from '@thyrox/config/constants'
import { getSettingsFilePathForSource } from '@thyrox/config/settings'
import {
  CROSS_PLATFORM_CODE_EXEC,
  DANGEROUS_BASH_PATTERNS,
} from './dangerousPatterns.js'
import { getPermissionHostBindings } from './host.js'
import type {
  PermissionRule,
  PermissionRuleSource,
  PermissionRuleValue,
} from './permissionTypes.js'
import {
  normalizeLegacyToolName,
  permissionRuleValueFromString,
  permissionRuleValueToString,
} from './permissionRuleParser.js'
import { applyPermissionUpdate } from './PermissionUpdate.js'
import type { PermissionUpdateDestination } from './PermissionUpdateSchema.js'

/**
 * El shim de bindings del anfitrión. El cast a `any` es deliberado y es el
 * mismo que la fuente documenta: cada método se trata como opcional en
 * tiempo de ejecución (`?.()`), así que un binding ausente no rompe — no
 * hace nada. La superficie declarada en `contracts.ts` es a propósito más
 * angosta que lo que se consume.
 */
const _b = () => getPermissionHostBindings() as any

function getCwd(): string {
  return _b().getCwd?.() ?? process.cwd()
}

function logForDebugging(message: string, metadata?: unknown): void {
  _b().logDebug?.(message, metadata)
}

/**
 * El contexto de permisos, con la misma forma laxa que usa
 * `PermissionUpdate.ts`: el tipo completo vive en el consumidor, y este
 * paquete sólo necesita saber que es un objeto indexable.
 */
type ToolPermissionContext = { permissionRules: unknown; [key: string]: unknown }
type ToolPermissionRulesBySource = Record<string, string[]>

const AGENT_TOOL_NAME = 'Agent'
const BASH_TOOL_NAME = 'Bash'
const POWERSHELL_TOOL_NAME = 'PowerShell'

/**
 * Si una regla de Bash es peligrosa para el modo auto.
 *
 * Tres formas de peligro, y las tres significan lo mismo: la regla
 * auto-aprueba código arbitrario.
 *
 * 1. Permiso a nivel de herramienta (`Bash` sin contenido, o `Bash(*)`).
 * 2. Prefijo de intérprete (`python:*`, `node:*`).
 * 3. Comodín que alcanza al intérprete (`python*`, `python -c*`).
 */
export function isDangerousBashPermission(
  toolName: string,
  ruleContent: string | undefined,
): boolean {
  if (toolName !== BASH_TOOL_NAME) return false

  // Sin contenido = permiso de herramienta = TODO comando.
  if (ruleContent === undefined || ruleContent === '') return true

  const content = ruleContent.trim().toLowerCase()
  if (content === '*') return true

  for (const pattern of DANGEROUS_BASH_PATTERNS) {
    const lowerPattern = pattern.toLowerCase()
    if (content === lowerPattern) return true
    // Sintaxis de prefijo: `python:*` alcanza cualquier comando de python.
    if (content === `${lowerPattern}:*`) return true
    // Comodín pegado: `python*` alcanza python, python3, …
    if (content === `${lowerPattern}*`) return true
    if (content === `${lowerPattern} *`) return true
    // La forma de bandera: `python -c*` alcanza `python -c '<código>'`.
    // El comodín final es la mitad que importa — sin él la regla nombra un
    // comando concreto y no un espacio de comandos.
    if (content.startsWith(`${lowerPattern} -`) && content.endsWith('*')) {
      return true
    }
  }

  return false
}

/**
 * El equivalente de PowerShell, con su propio vocabulario de ejecución.
 *
 * PowerShell no distingue caja, así que el contenido se pasa a minúscula
 * antes de comparar. Su lista añade a los intérpretes multiplataforma los
 * evaluadores de cadena (`iex`), los lanzadores de proceso (`start-process`)
 * y las escapatorias a .NET (`add-type`, `new-object`).
 */
export function isDangerousPowerShellPermission(
  toolName: string,
  ruleContent: string | undefined,
): boolean {
  if (toolName !== POWERSHELL_TOOL_NAME) return false
  if (ruleContent === undefined || ruleContent === '') return true

  const content = ruleContent.trim().toLowerCase()
  if (content === '*') return true

  const patterns: readonly string[] = [
    ...CROSS_PLATFORM_CODE_EXEC,
    // Shells anidados alcanzables desde PowerShell
    'pwsh',
    'powershell',
    'cmd',
    'wsl',
    // Evaluadores de cadena y de bloque de guion
    'iex',
    'invoke-expression',
    'icm',
    'invoke-command',
    // Lanzadores de proceso
    'start-process',
    'saps',
    'start',
    'start-job',
    'sajb',
    'start-threadjob',
    // Ejecución por evento o por sesión
    'register-objectevent',
    'register-engineevent',
    'register-wmievent',
    'register-scheduledjob',
    'new-pssession',
    'nsn',
    'enter-pssession',
    'etsn',
    // Escapatorias a .NET
    'add-type',
    'new-object',
  ]

  for (const pattern of patterns) {
    if (content === pattern) return true
    if (content === `${pattern}:*`) return true
    if (content === `${pattern}*`) return true
    if (content === `${pattern} *`) return true
    if (content.startsWith(`${pattern} -`) && content.endsWith('*')) return true

    // El `.exe` va en la PRIMERA palabra, no al final del patrón entero:
    // `python` → `python.exe`, pero `npm run` → `npm.exe run`, porque
    // `npm.exe` es el nombre real del binario en Windows. Una regla
    // `PowerShell(npm.exe run:*)` tiene que alcanzar al patrón `npm run`.
    const sp = pattern.indexOf(' ')
    const exe =
      sp === -1
        ? `${pattern}.exe`
        : `${pattern.slice(0, sp)}.exe${pattern.slice(sp)}`
    if (content === exe) return true
    if (content === `${exe}:*`) return true
    if (content === `${exe}*`) return true
    if (content === `${exe} *`) return true
    if (content.startsWith(`${exe} -`) && content.endsWith('*')) return true
  }

  return false
}

/**
 * CUALQUIER regla de Agent es peligrosa, con contenido o sin él.
 *
 * Un permiso de Agent auto-aprueba el arranque de un subagente antes de que
 * el clasificador pueda leer su prompt, que es justo la prevención del
 * ataque por delegación. Por eso el contenido no se mira.
 */
export function isDangerousTaskPermission(
  toolName: string,
  _ruleContent: string | undefined,
): boolean {
  return normalizeLegacyToolName(toolName) === AGENT_TOOL_NAME
}

/**
 * La fuente de una regla, tal como se le enseña a una persona.
 *
 * Una fuente de settings se muestra como la RUTA de su archivo —relativa si
 * es más corta que la absoluta—; el resto se muestra verbatim, porque no
 * tienen archivo que enseñar.
 */
function formatPermissionSource(source: PermissionRuleSource): string {
  if ((SETTING_SOURCES as readonly string[]).includes(source)) {
    const filePath = getSettingsFilePathForSource(source as SettingSource)
    if (filePath) {
      const relativePath = relative(getCwd(), filePath)
      return relativePath.length < filePath.length ? relativePath : filePath
    }
  }
  return source
}

export type DangerousPermissionInfo = {
  ruleValue: PermissionRuleValue
  source: PermissionRuleSource
  /** La regla en su forma de despliegue, p. ej. `Bash(*)` o `Bash(python:*)`. */
  ruleDisplay: string
  /** La fuente en su forma de despliegue: una ruta, o `--allowed-tools`. */
  sourceDisplay: string
}

/**
 * Si una regla auto-aprobaría una acción antes de que el clasificador la
 * evalúe. Reúne los tres predicados anteriores.
 */
function isDangerousClassifierPermission(
  toolName: string,
  ruleContent: string | undefined,
): boolean {
  if (process.env.USER_TYPE === 'ant') {
    // `Tmux send-keys` ejecuta shell arbitrario, igual que `Bash(*)`.
    if (toolName === 'Tmux') return true
  }
  return (
    isDangerousBashPermission(toolName, ruleContent) ||
    isDangerousPowerShellPermission(toolName, ruleContent) ||
    isDangerousTaskPermission(toolName, ruleContent)
  )
}

/**
 * Todas las reglas peligrosas, vengan de disco o de la línea de comandos.
 *
 * Sólo mira las de permiso (`allow`): una regla de negación con el mismo
 * contenido no auto-aprueba nada.
 */
export function findDangerousClassifierPermissions(
  rules: PermissionRule[],
  cliAllowedTools: string[],
): DangerousPermissionInfo[] {
  const dangerous: DangerousPermissionInfo[] = []

  for (const rule of rules) {
    if (
      rule.ruleBehavior === 'allow' &&
      isDangerousClassifierPermission(
        rule.ruleValue.toolName,
        rule.ruleValue.ruleContent,
      )
    ) {
      const ruleString = rule.ruleValue.ruleContent
        ? `${rule.ruleValue.toolName}(${rule.ruleValue.ruleContent})`
        : `${rule.ruleValue.toolName}(*)`
      dangerous.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: ruleString,
        sourceDisplay: formatPermissionSource(rule.source),
      })
    }
  }

  for (const toolSpec of cliAllowedTools) {
    // `Bash`, `Bash(patrón)`, `Agent`, `Agent(subagent_type)`.
    const match = toolSpec.match(/^([^(]+)(?:\(([^)]*)\))?$/)
    if (match) {
      const toolName = match[1]!.trim()
      const ruleContent = match[2]?.trim()

      if (isDangerousClassifierPermission(toolName, ruleContent)) {
        dangerous.push({
          ruleValue: { toolName, ruleContent },
          source: 'cliArg',
          ruleDisplay: ruleContent ? toolSpec : `${toolName}(*)`,
          sourceDisplay: '--allowed-tools',
        })
      }
    }
  }

  return dangerous
}

/**
 * Si una regla de permiso de Bash es demasiado amplia — equivalente a
 * desactivar los permisos por completo.
 *
 * Alcanza a `Bash`, `Bash(*)` y `Bash()`: las tres se parsean a
 * `{ toolName: 'Bash' }` sin contenido.
 */
export function isOverlyBroadBashAllowRule(
  ruleValue: PermissionRuleValue,
): boolean {
  return (
    ruleValue.toolName === BASH_TOOL_NAME && ruleValue.ruleContent === undefined
  )
}

/** El equivalente de PowerShell. */
export function isOverlyBroadPowerShellAllowRule(
  ruleValue: PermissionRuleValue,
): boolean {
  return (
    ruleValue.toolName === POWERSHELL_TOOL_NAME &&
    ruleValue.ruleContent === undefined
  )
}

/** Todas las reglas de Bash demasiado amplias, de settings y de la línea. */
export function findOverlyBroadBashPermissions(
  rules: PermissionRule[],
  cliAllowedTools: string[],
): DangerousPermissionInfo[] {
  const overlyBroad: DangerousPermissionInfo[] = []

  for (const rule of rules) {
    if (
      rule.ruleBehavior === 'allow' &&
      isOverlyBroadBashAllowRule(rule.ruleValue)
    ) {
      overlyBroad.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: `${BASH_TOOL_NAME}(*)`,
        sourceDisplay: formatPermissionSource(rule.source),
      })
    }
  }

  for (const toolSpec of cliAllowedTools) {
    const parsed = permissionRuleValueFromString(toolSpec)
    if (isOverlyBroadBashAllowRule(parsed)) {
      overlyBroad.push({
        ruleValue: parsed,
        source: 'cliArg',
        ruleDisplay: `${BASH_TOOL_NAME}(*)`,
        sourceDisplay: '--allowed-tools',
      })
    }
  }

  return overlyBroad
}

/** El equivalente de PowerShell. */
export function findOverlyBroadPowerShellPermissions(
  rules: PermissionRule[],
  cliAllowedTools: string[],
): DangerousPermissionInfo[] {
  const overlyBroad: DangerousPermissionInfo[] = []

  for (const rule of rules) {
    if (
      rule.ruleBehavior === 'allow' &&
      isOverlyBroadPowerShellAllowRule(rule.ruleValue)
    ) {
      overlyBroad.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: `${POWERSHELL_TOOL_NAME}(*)`,
        sourceDisplay: formatPermissionSource(rule.source),
      })
    }
  }

  for (const toolSpec of cliAllowedTools) {
    const parsed = permissionRuleValueFromString(toolSpec)
    if (isOverlyBroadPowerShellAllowRule(parsed)) {
      overlyBroad.push({
        ruleValue: parsed,
        source: 'cliArg',
        ruleDisplay: `${POWERSHELL_TOOL_NAME}(*)`,
        sourceDisplay: '--allowed-tools',
      })
    }
  }

  return overlyBroad
}

/**
 * Si una fuente de regla puede además ser DESTINO de una actualización.
 *
 * `flagSettings`, `policySettings` y `command` no lo son: la bandera es
 * efímera, la política es de la organización y el comando no tiene archivo.
 * Una regla que venga de ahí se puede leer, pero no se puede reescribir.
 */
function isPermissionUpdateDestination(
  source: PermissionRuleSource,
): source is PermissionUpdateDestination {
  return [
    'userSettings',
    'projectSettings',
    'localSettings',
    'session',
    'cliArg',
  ].includes(source)
}

/**
 * Retira del contexto en memoria las reglas peligrosas, agrupadas por su
 * destino. Las que no se pueden persistir se SALTAN — no se retiran.
 */
export function removeDangerousPermissions(
  context: ToolPermissionContext,
  dangerousPermissions: DangerousPermissionInfo[],
): ToolPermissionContext {
  const rulesBySource = new Map<
    PermissionUpdateDestination,
    PermissionRuleValue[]
  >()
  for (const perm of dangerousPermissions) {
    if (!isPermissionUpdateDestination(perm.source)) continue
    const destination = perm.source
    const existing = rulesBySource.get(destination) || []
    existing.push(perm.ruleValue)
    rulesBySource.set(destination, existing)
  }

  let updatedContext = context
  for (const [destination, rules] of rulesBySource) {
    updatedContext = applyPermissionUpdate(updatedContext, {
      type: 'removeRules' as const,
      rules,
      behavior: 'allow' as const,
      destination,
    })
  }

  return updatedContext
}

/**
 * Prepara el contexto para el modo auto: despoja las reglas que saltarían al
 * clasificador y las guarda para poder devolverlas al salir.
 *
 * El modo NO se toca aquí — lo fija quien llama.
 */
export function stripDangerousPermissionsForAutoMode(
  context: ToolPermissionContext,
): ToolPermissionContext {
  const rules: PermissionRule[] = []
  for (const [source, ruleStrings] of Object.entries(
    (context.alwaysAllowRules ?? {}) as ToolPermissionRulesBySource,
  )) {
    if (!ruleStrings) continue
    for (const ruleString of ruleStrings) {
      rules.push({
        source: source as PermissionRuleSource,
        ruleBehavior: 'allow',
        ruleValue: permissionRuleValueFromString(ruleString),
      })
    }
  }

  const dangerousPermissions = findDangerousClassifierPermissions(rules, [])
  if (dangerousPermissions.length === 0) {
    return {
      ...context,
      strippedDangerousRules: context.strippedDangerousRules ?? {},
    }
  }

  for (const permission of dangerousPermissions) {
    logForDebugging(
      `Ignoring dangerous permission ${permission.ruleDisplay} from ${permission.sourceDisplay} (bypasses classifier)`,
    )
  }

  // El escondite espeja el MISMO filtro de destino que usa el retiro, para
  // que lo guardado sea exactamente lo retirado. Si guardara lo hallado,
  // restaurar añadiría una regla que nunca se quitó.
  const stripped: ToolPermissionRulesBySource = {}
  for (const perm of dangerousPermissions) {
    if (!isPermissionUpdateDestination(perm.source)) continue
    ;(stripped[perm.source] ??= []).push(
      permissionRuleValueToString(perm.ruleValue),
    )
  }

  return {
    ...removeDangerousPermissions(context, dangerousPermissions),
    strippedDangerousRules: stripped,
  }
}

/**
 * Devuelve las reglas que el despojo guardó, y vacía el escondite.
 *
 * Vaciarlo es lo que hace que una segunda salida sea un no-op: sin eso, cada
 * salida de auto volvería a añadir las mismas reglas.
 */
export function restoreDangerousPermissions(
  context: ToolPermissionContext,
): ToolPermissionContext {
  const stash = context.strippedDangerousRules as
    | ToolPermissionRulesBySource
    | undefined
  if (!stash) return context

  let result = context
  for (const [source, ruleStrings] of Object.entries(stash)) {
    if (!ruleStrings || ruleStrings.length === 0) continue
    result = applyPermissionUpdate(result, {
      type: 'addRules',
      rules: ruleStrings.map(permissionRuleValueFromString),
      behavior: 'allow',
      destination: source as PermissionUpdateDestination,
    })
  }
  return { ...result, strippedDangerousRules: undefined }
}
