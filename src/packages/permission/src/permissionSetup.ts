/**
 * Qué regla de permiso es peligrosa PARA EL MODO AUTO, cómo se despoja, y
 * todo el bloque de MODO AUTOMÁTICO: banderas de característica, estado
 * de auto mode, arranque desde la línea de comandos y transiciones de modo.
 *
 * Procedencia: `ccnmt: packages/permission/src/permissionSetup.ts` (1538
 * líneas, 35 símbolos exportados). Ese árbol declara `"license":
 * "UNLICENSED"`, así que el cuerpo se **reimplementa** y no se copia.
 *
 * PORTE — 34 de los 35 exports de la fuente (TASK-THYROX-0004, tarea #280).
 * El bloque de permisos peligrosos (12, líneas 101-598 de la fuente) más
 * los 22 del bloque de modo automático que este pase añade:
 *
 *   transitionPermissionMode · parseBaseToolsFromCLI ·
 *   initialPermissionModeFromCLI · parseToolListFromCLI ·
 *   AutoModeGateCheckResult · AutoModeUnavailableReason ·
 *   getAutoModeUnavailableNotification · verifyAutoModeGateAccess ·
 *   shouldDisableBypassPermissions · isAutoModeGateEnabled ·
 *   getAutoModeUnavailableReason · AutoModeEnabledState ·
 *   getAutoModeEnabledState · getAutoModeEnabledStateIfCached ·
 *   hasAutoModeOptInAnySource · isBypassPermissionsModeDisabled ·
 *   createDisabledBypassPermissionsContext · checkAndDisableBypassPermissions ·
 *   isDefaultPermissionModeAuto · shouldPlanUseAutoMode ·
 *   prepareContextForPlanMode · transitionPlanAutoMode
 *
 * ÚNICO BLOQUEO RESTANTE, MEDIDO — `initializeToolPermissionContext`. Su
 * único síntoma nuevo frente al bloque de arriba es
 * `applyPermissionRulesToPermissionContext`, de `./permissions.ts`, que NO
 * existe ahí (`grep -n "applyPermissionRulesToPermissionContext"
 * permissions.ts` → 0). `permissions.ts` está fuera del alcance de escritura
 * de este pase. NOTA: el docstring de `permissions.ts` cita a su vez
 * `./PermissionUpdate.js` como "no portado" y bloqueante — esa cita está
 * caduca (`PermissionUpdate.ts` existe, 9 exports, ya consumido por este
 * mismo archivo como `applyPermissionUpdate`); se deja igual porque
 * `permissions.ts` no es mi archivo de producto en este pase.
 *
 * QUÉ DECIDE ESTE ARCHIVO, Y QUÉ NO. El bloque de permisos peligrosos
 * decide qué regla auto-aprobaría una acción **antes** de que el
 * clasificador pueda evaluarla. El bloque de modo automático decide
 * CUÁNDO ese modo puede entrarse (gate síncrono y async), CÓMO se
 * transiciona entre modos, y qué pasa con las reglas despojadas al
 * entrar/salir.
 *
 * DIVERGENCIAS DECLARADAS (cinco, todas medidas contra la fuente):
 *
 * 1. Cableado — igual que ya declaraba el bloque de permisos peligrosos:
 *    `_b()` sobre `getPermissionHostBindings()` en vez de bindings sueltos.
 *    Cuatro símbolos del bloque nuevo (`hasAutoModeOptIn`,
 *    `getUseAutoModeDuringPlan`, `getMainLoopModel`, `modelSupportsAutoMode`)
 *    son, en la fuente, responsabilidad de `@claude-code-how-works/config`
 *    (agregación multi-fuente de settings) o del anfitrión — aquí se tratan
 *    como bindings del mismo `_b()`, no como una reimplementación de esa
 *    agregación (fuera de alcance: `src/packages/config/`).
 *
 * 2. `getAutoModeUnavailableNotification` OMITE el sufijo
 *    `· #claude-code-how-works-how-works-feedback` que la fuente añade sólo
 *    para `USER_TYPE === 'ant'` — un canal de feedback interno de Anthropic,
 *    sin cadena fiel que portar. MISMO precedente que `planModeV2.ts` ya
 *    declaró (su Divergencia 1) para una rama `ant` distinta. Esto NO es
 *    una política de "quitar ramas ant" — `isDangerousClassifierPermission`
 *    (arriba, en este archivo), `verifyAutoModeGateAccess` (abajo),
 *    `getNextPermissionMode.ts` y `dangerousPatterns.ts` SÍ portan sus
 *    ramas `USER_TYPE === 'ant'`, porque ahí son comportamiento o dato de
 *    seguridad con sentido fuera de esa organización.
 *
 * 3. `parseToolPreset`/`parseBaseToolsFromCLI` — DEFECTO MEDIDO EN LA
 *    PROPIA FUENTE, portado tal cual. `parseToolPreset` declara `string[]`
 *    como retorno (no `string | undefined`) con `?? []` de respaldo; como
 *    todo arreglo es verdadero en JS, `parseBaseToolsFromCLI` SIEMPRE toma
 *    la rama de preset — `parseToolListFromCLI` es alcanzable como función
 *    propia (exportada y probada aparte) pero NUNCA en ejecución por esta
 *    vía, para ningún `baseTools`. Ver el docstring de la función.
 *
 * 4. `gracefulShutdown` — la fuente declara su shim local con UN parámetro
 *    (`code?: number`) pero su único sitio de llamada le pasa DOS
 *    (`gracefulShutdown(1, 'bypass_permissions_disabled')`); bajo
 *    `strict: true` eso sería un error de tipos en la fuente misma. Este
 *    puerto ENSANCHA el shim a `(code?, reason?)` y reenvía ambos al
 *    binding, preservando la intención evidente del sitio de llamada.
 *
 * 5. El duplicado `if (!result) { result = { mode: 'default', notification } }`
 *    que aparece DOS VECES consecutivas en `initialPermissionModeFromCLI` de
 *    la fuente (artefacto de la decompilación) se deja en UNA sola
 *    ocurrencia — la segunda no cambia nada (misma condición, mismo cuerpo,
 *    ya no aplica tras la primera).
 */
import { relative } from 'path'
import { feature } from 'bun:bundle'
import { SETTING_SOURCES, type SettingSource } from '@thyrox/config/constants'
import { getSettingsFilePathForSource, getSettings } from '@thyrox/config/settings'
import {
  checkStatsigFeatureGate_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from '@thyrox/config/feature-flags'
import { readEnv } from '@thyrox/config/env'
import { permissionModeFromString, type PermissionMode } from './PermissionMode.js'
import { ContextError } from './errors.js'
import { logEvent, type EventMetadata } from '@thyrox/local-observability'
import { logPermissionModeChangeEvent } from '@thyrox/local-observability/telemetry'
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
 * Módulo de estado de auto mode, cargado sólo cuando la bandera está viva.
 * Con la bandera apagada queda `null` y cada `?.()` es un no-op seguro —
 * mismo patrón que la fuente usa para no pagar el costo del módulo cuando
 * el bloque entero está desactivado. `autoModeState.ts` (hermano, ya
 * portado en este paquete) tiene los siete métodos que se llaman aquí.
 */
const autoModeStateModule = feature('TRANSCRIPT_CLASSIFIER')
  ? (require('./autoModeState.js') as typeof import('./autoModeState.js'))
  : null

/**
 * Los cuatro símbolos siguientes (`hasAutoModeOptIn`, `getUseAutoModeDuringPlan`,
 * `getMainLoopModel`, `modelSupportsAutoMode`) son, en la fuente, responsabilidad
 * de `@claude-code-how-works/config` (agregación multi-fuente de settings —
 * medido: lee `userSettings`/`localSettings`/`flagSettings`/`policySettings`
 * vía `getSettingsForSource`) o del anfitrión de la app (selección del modelo
 * del bucle principal, soporte de auto mode por modelo). `@thyrox/config`
 * omite esa agregación sin sustituto propio, y `src/packages/config/` está
 * fuera del alcance de este pase. Se tratan aquí como bindings del
 * anfitrión, con el mismo shim `_b()` de arriba — la agregación real queda
 * como trabajo de un sucesor cuando `@thyrox/config` la incorpore.
 */
function hasAutoModeOptIn(): boolean {
  return _b().hasAutoModeOptIn?.() ?? false
}

function getUseAutoModeDuringPlan(): boolean {
  return _b().getUseAutoModeDuringPlan?.() ?? true
}

function getMainLoopModel(): string {
  return _b().getMainLoopModel?.() ?? ''
}

function modelSupportsAutoMode(model: string): boolean {
  return _b().modelSupportsAutoMode?.(model) ?? false
}

/**
 * Efectos colaterales de la transición de modo — todo el estado
 * (adjuntar el mensaje de salida de auto mode, notificar al UI de plan,
 * marcar que ya se salió de plan) vive en el anfitrión de la app; aquí
 * sólo se dispara.
 */
function setNeedsAutoModeExitAttachment(needed: boolean): void {
  _b().setNeedsAutoModeExitAttachment?.(needed)
}

function handleAutoModeTransition(fromMode: string, toMode: string): void {
  _b().handleAutoModeTransition?.(fromMode, toMode)
}

function handlePlanModeTransition(fromMode: string, toMode: string): void {
  _b().handlePlanModeTransition?.(fromMode, toMode)
}

function setHasExitedPlanMode(exited: boolean): void {
  _b().setHasExitedPlanMode?.(exited)
}

function getToolsForDefaultPreset(): string[] {
  return _b().getToolsForDefaultPreset?.() ?? []
}

/**
 * Firma verbatim de la fuente: devuelve `string[]`, con `?? []` como
 * respaldo sin binding. Ver la nota de "la trampa del arreglo veraz" en
 * `parseBaseToolsFromCLI`, que es donde este defecto tiene efecto real.
 */
function parseToolPreset(preset: string): string[] {
  return _b().parseToolPreset?.(preset) ?? []
}

/**
 * Cierre del proceso ante una violación de política que no admite seguir
 * corriendo (p. ej. bypassPermissions deshabilitado por el gate mientras
 * ya estaba activo). El anfitrión decide CÓMO cerrar (código de salida,
 * limpieza); aquí sólo se pide.
 *
 * DIVERGENCIA DECLARADA — el shim local de la fuente declara
 * `gracefulShutdown(code?: number): Promise<never>` con UN parámetro, pero
 * su único sitio de llamada le pasa DOS: `gracefulShutdown(1,
 * 'bypass_permissions_disabled')`. Bajo `strict: true` eso sería un error
 * de tipos en la fuente misma — el segundo argumento se pierde en
 * silencio ahí. Este puerto ENSANCHA el shim a dos parámetros y los
 * reenvía ambos al binding del anfitrión, preservando la intención
 * evidente del sitio de llamada (documentar el motivo del apagado) en vez
 * de reproducir la pérdida de información. También cambia el fallback sin
 * binding instalado de un `Promise.reject()` desnudo (sin motivo, un
 * riesgo de rechazo-sin-atender difícil de depurar si algo alguna vez
 * espera esta promesa) a uno con mensaje — el llamador real de este
 * archivo la invoca con `void`, así que en producción esto no cambia
 * comportamiento; sólo ayuda si un test la espera por error.
 */
async function gracefulShutdown(code?: number, reason?: string): Promise<never> {
  return (
    _b().gracefulShutdown?.(code, reason) ??
    Promise.reject(new Error('gracefulShutdown binding not installed'))
  ) as Promise<never>
}

/**
 * Envoltorios async locales sobre los primitivos SYNC ya existentes de
 * `@thyrox/config/feature-flags` (`checkStatsigFeatureGate_CACHED_MAY_BE_STALE`,
 * `getFeatureValue_CACHED_MAY_BE_STALE`). La fuente los declara async porque
 * su cliente GrowthBook real puede esperar a la inicialización remota;
 * `@thyrox/config` ya resuelve todo en local y sin red (env → anulación en
 * proceso → default local → fallback de quien llama), así que aquí el
 * `async` es sólo de forma — misma decisión de diseño que el propio paquete
 * de config ya tomó, extendida a estos dos envoltorios.
 */
async function checkSecurityRestrictionGate(gate: string): Promise<boolean> {
  return checkStatsigFeatureGate_CACHED_MAY_BE_STALE(gate)
}

async function getDynamicConfig_BLOCKS_ON_INIT<T>(
  key: string,
  fallback: T,
): Promise<T> {
  return getFeatureValue_CACHED_MAY_BE_STALE<T>(key, fallback)
}

function isEnvTruthy(value: string | boolean | undefined): boolean {
  if (!value) return false
  if (typeof value === 'boolean') return value
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase().trim())
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

// ============================================================================
// TASK-THYROX-0004 (tarea #280) — los 23 exports restantes de la fuente.
//
// Todo lo que sigue depende de `feature('TRANSCRIPT_CLASSIFIER')`, del
// estado de auto mode (`autoModeState.ts`, hermano ya portado), del
// arranque desde la línea de comandos y de telemetría. Se implementa en
// bloques temáticos: tipos + shims + funciones puras → lectores sync del
// gate → transformaciones de contexto → async → CLI → el gate async
// completo (`verifyAutoModeGateAccess`) al final.
// ============================================================================

/**
 * Resultado de una verificación de disponibilidad del modo auto: una
 * función de transformación (no un contexto ya calculado) para que quien
 * llama la aplique dentro de `setAppState(prev => ...)` contra el contexto
 * VIGENTE. Pre-calcular el contexto aquí capturaría una foto vieja: el
 * await de GrowthBook de abajo puede ser adelantado por un cambio de modo
 * a mitad de turno, y devolver `{ ...contextoActual, ... }` pisaría el
 * cambio del usuario.
 */
export type AutoModeGateCheckResult = {
  updateContext: (ctx: ToolPermissionContext) => ToolPermissionContext
  notification?: string
}

export type AutoModeUnavailableReason = 'settings' | 'circuit-breaker' | 'model'

/**
 * DIVERGENCIA DECLARADA. La fuente añade, sólo para `USER_TYPE === 'ant'`,
 * el sufijo `· #claude-code-how-works-how-works-feedback` — el nombre de un
 * canal de feedback interno de Anthropic, no un placeholder genérico. Se
 * omite aquí, siguiendo el MISMO precedente que `planModeV2.ts` ya declaró
 * (su Divergencia Declarada 1): la condición es de esa organización y no
 * hay cadena fiel que portar para ella. Esto NO significa que el paquete
 * evite ramas `USER_TYPE === 'ant'` en general — `isDangerousClassifierPermission`
 * (arriba, en este mismo archivo), `getNextPermissionMode.ts` y
 * `dangerousPatterns.ts` sí las portan, porque ahí la rama es
 * comportamiento o dato de seguridad con sentido fuera de esa organización.
 * Aquí es sólo un texto de cortesía auto-referencial.
 */
export function getAutoModeUnavailableNotification(
  reason: AutoModeUnavailableReason,
): string {
  switch (reason) {
    case 'settings':
      return 'auto mode disabled by settings'
    case 'circuit-breaker':
      return 'auto mode is unavailable for your plan'
    case 'model':
      return 'auto mode unavailable for this model'
  }
}

/**
 * Convierte la lista de herramientas de la línea de comandos (o de
 * `allowedTools`/`disallowedTools`) en una lista normalizada. Separa por
 * coma o espacio, pero NO dentro de paréntesis — así `Bash(npm run:*)` no
 * se rompe en dos.
 */
export function parseToolListFromCLI(tools: string[]): string[] {
  if (tools.length === 0) return []

  const result: string[] = []

  for (const toolString of tools) {
    if (!toolString) continue

    let current = ''
    let isInParens = false

    for (const char of toolString) {
      switch (char) {
        case '(':
          isInParens = true
          current += char
          break
        case ')':
          isInParens = false
          current += char
          break
        case ',':
          if (isInParens) {
            current += char
          } else {
            if (current.trim()) result.push(current.trim())
            current = ''
          }
          break
        case ' ':
          if (isInParens) {
            current += char
          } else if (current.trim()) {
            result.push(current.trim())
            current = ''
          }
          break
        default:
          current += char
      }
    }

    if (current.trim()) result.push(current.trim())
  }

  return result
}

function isAutoModeDisabledBySettings(): boolean {
  const settings = getSettings() || {}
  return (
    (settings as { disableAutoMode?: 'disable' }).disableAutoMode === 'disable' ||
    (settings.permissions as { disableAutoMode?: 'disable' } | undefined)
      ?.disableAutoMode === 'disable'
  )
}

/**
 * Si el modo auto puede entrarse: el circuit-breaker no está activo y los
 * settings no lo deshabilitaron. Síncrono — usa el estado que
 * `verifyAutoModeGateAccess` (más abajo) ya pobló.
 */
export function isAutoModeGateEnabled(): boolean {
  if (autoModeStateModule?.isAutoModeCircuitBroken() ?? false) return false
  if (isAutoModeDisabledBySettings()) return false
  if (!modelSupportsAutoMode(getMainLoopModel())) return false
  return true
}

/**
 * La razón por la que el modo auto está indisponible ahora mismo, o `null`
 * si está disponible. Síncrono — misma fuente de estado que
 * `isAutoModeGateEnabled`, en el orden de precedencia: settings >
 * circuit-breaker > modelo.
 */
export function getAutoModeUnavailableReason(): AutoModeUnavailableReason | null {
  if (isAutoModeDisabledBySettings()) return 'settings'
  if (autoModeStateModule?.isAutoModeCircuitBroken() ?? false) return 'circuit-breaker'
  if (!modelSupportsAutoMode(getMainLoopModel())) return 'model'
  return null
}

/**
 * El campo `enabled` de la config GrowthBook `tengu_auto_mode_config`.
 * Controla la disponibilidad del modo auto en las superficies de UI.
 * - `'enabled'`: disponible en el carrusel de shift-tab (o equivalente).
 * - `'disabled'`: completamente indisponible — circuit-breaker de incidente.
 * - `'opt-in'`: disponible sólo si el usuario ya se inscribió explícitamente.
 */
export type AutoModeEnabledState = 'enabled' | 'disabled' | 'opt-in'

const AUTO_MODE_ENABLED_DEFAULT: AutoModeEnabledState = feature('TRANSCRIPT_CLASSIFIER')
  ? 'enabled'
  : 'disabled'

function parseAutoModeEnabledState(value: unknown): AutoModeEnabledState {
  if (value === 'enabled' || value === 'disabled' || value === 'opt-in') return value
  return AUTO_MODE_ENABLED_DEFAULT
}

/**
 * Lee el campo `enabled` de `tengu_auto_mode_config` (cacheado, puede estar
 * desactualizado). Por defecto `'disabled'` si GrowthBook no está
 * disponible o el campo no está fijado.
 */
export function getAutoModeEnabledState(): AutoModeEnabledState {
  const config = getFeatureValue_CACHED_MAY_BE_STALE<{
    enabled?: AutoModeEnabledState
  }>('tengu_auto_mode_config', {})
  return parseAutoModeEnabledState(config?.enabled)
}

const NO_CACHED_AUTO_MODE_CONFIG = Symbol('no-cached-auto-mode-config')

/**
 * Como `getAutoModeEnabledState` pero devuelve `undefined` cuando no hay
 * valor cacheado (arranque en frío, antes de que GrowthBook inicialice).
 * Lo usa el chequeo sync del circuit-breaker en `initialPermissionModeFromCLI`,
 * que no debe confundir "todavía no se obtuvo" con "se obtuvo y está
 * deshabilitado" — lo primero difiere a `verifyAutoModeGateAccess`, lo
 * segundo bloquea de inmediato.
 */
export function getAutoModeEnabledStateIfCached(): AutoModeEnabledState | undefined {
  const config = getFeatureValue_CACHED_MAY_BE_STALE<
    { enabled?: AutoModeEnabledState } | typeof NO_CACHED_AUTO_MODE_CONFIG
  >('tengu_auto_mode_config', NO_CACHED_AUTO_MODE_CONFIG)
  if (config === NO_CACHED_AUTO_MODE_CONFIG) return undefined
  return parseAutoModeEnabledState(
    (config as { enabled?: AutoModeEnabledState })?.enabled,
  )
}

/**
 * Si el usuario se inscribió al modo auto por CUALQUIER vía confiable:
 * bandera de CLI (con alcance de sesión) o el setting persistente.
 */
export function hasAutoModeOptInAnySource(): boolean {
  if (autoModeStateModule?.getAutoModeFlagCli() ?? false) return true
  return hasAutoModeOptIn()
}

/**
 * Si bypassPermissions está deshabilitado ahora mismo por el gate de
 * Statsig o por settings. Versión síncrona — usa valores cacheados.
 */
export function isBypassPermissionsModeDisabled(): boolean {
  const growthBookDisable = checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
    'tengu_disable_bypass_permissions_mode',
  )
  const settings = getSettings() || {}
  // `disableBypassPermissionsMode` no está en el esquema de `permissions`
  // que declara `@thyrox/config/settings` — fuera de mi alcance de
  // escritura ampliarlo. Mismo cast laxo que `isAutoModeDisabledBySettings`
  // ya usa para `disableAutoMode`, un campo con el mismo problema.
  const settingsDisable =
    (settings.permissions as { disableBypassPermissionsMode?: 'disable' } | undefined)
      ?.disableBypassPermissionsMode === 'disable'
  return growthBookDisable || settingsDisable
}

export function isDefaultPermissionModeAuto(): boolean {
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    const settings = getSettings() || {}
    // `defaultMode` en el esquema de `@thyrox/config/settings` está tipado
    // a los cinco modos EXTERNOS (`ExternalPermissionMode`) — no conoce
    // `'auto'`, que es interno y sólo existe bajo esta bandera. Cast
    // explícito, no un defecto: es la misma brecha de tipos que
    // `initialPermissionModeFromCLI` ya cruza con `as PermissionMode`.
    return (settings.permissions?.defaultMode as PermissionMode | undefined) === 'auto'
  }
  return false
}

/**
 * Si el modo plan debe usar la semántica de modo auto (el clasificador
 * corre durante plan). Verdadero cuando el usuario se inscribió al modo
 * auto y el gate está habilitado. Se evalúa al momento de verificar el
 * permiso, para que reaccione a cambios de configuración.
 */
export function shouldPlanUseAutoMode(): boolean {
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    return hasAutoModeOptIn() && isAutoModeGateEnabled() && getUseAutoModeDuringPlan()
  }
  return false
}

/** Crea un contexto actualizado con bypassPermissions deshabilitado. */
export function createDisabledBypassPermissionsContext(
  currentContext: ToolPermissionContext,
): ToolPermissionContext {
  let updatedContext = currentContext
  if (currentContext.mode === 'bypassPermissions') {
    updatedContext = applyPermissionUpdate(currentContext, {
      type: 'setMode',
      mode: 'default',
      destination: 'session',
    })
  }
  return { ...updatedContext, isBypassPermissionsModeAvailable: false }
}

/**
 * Entrada centralizada a modo plan. Guarda el modo vigente como
 * `prePlanMode` para que `ExitPlanMode` pueda restaurarlo. Cuando el
 * usuario ya se inscribió al modo auto, la semántica de auto sigue activa
 * durante plan.
 */
export function prepareContextForPlanMode(
  context: ToolPermissionContext,
): ToolPermissionContext {
  const currentMode = context.mode
  if (currentMode === 'plan') return context
  if (feature('TRANSCRIPT_CLASSIFIER')) {
    const planAutoMode = shouldPlanUseAutoMode()
    if (currentMode === 'auto') {
      if (planAutoMode) return { ...context, prePlanMode: 'auto' }
      autoModeStateModule?.setAutoModeActive(false)
      setNeedsAutoModeExitAttachment(true)
      return { ...restoreDangerousPermissions(context), prePlanMode: 'auto' }
    }
    if (planAutoMode && currentMode !== 'bypassPermissions') {
      autoModeStateModule?.setAutoModeActive(true)
      return {
        ...stripDangerousPermissionsForAutoMode(context),
        prePlanMode: currentMode,
      }
    }
  }
  logForDebugging(
    `[prepareContextForPlanMode] entrada llana, prePlanMode=${currentMode}`,
  )
  return { ...context, prePlanMode: currentMode }
}

/**
 * Reconcilia el estado de auto mode durante plan tras un cambio de
 * settings. Compara el estado deseado (`shouldPlanUseAutoMode`) contra el
 * real (`isAutoModeActive`) y activa/desactiva auto en consecuencia.
 * No-op fuera de plan.
 */
export function transitionPlanAutoMode(
  context: ToolPermissionContext,
): ToolPermissionContext {
  if (!feature('TRANSCRIPT_CLASSIFIER')) return context
  if (context.mode !== 'plan') return context
  // Nunca activar auto a mitad de plan si se entró desde un modo peligroso —
  // refleja la misma exclusión de entrada que `prepareContextForPlanMode`.
  if (context.prePlanMode === 'bypassPermissions') return context

  const want = shouldPlanUseAutoMode()
  const have = autoModeStateModule?.isAutoModeActive() ?? false

  if (want && have) {
    // Quien llama antes sincronizó las reglas desde disco, lo que puede
    // haber re-añadido reglas peligrosas sin tocar strippedDangerousRules.
    // Se re-despoja para que el clasificador no quede sin sentido.
    return stripDangerousPermissionsForAutoMode(context)
  }
  if (!want && !have) return context

  if (want) {
    autoModeStateModule?.setAutoModeActive(true)
    setNeedsAutoModeExitAttachment(false)
    return stripDangerousPermissionsForAutoMode(context)
  }
  autoModeStateModule?.setAutoModeActive(false)
  setNeedsAutoModeExitAttachment(true)
  return restoreDangerousPermissions(context)
}

/**
 * La transición de modo de permiso central. Dispara telemetría y los dos
 * handlers de transición (plan, auto), y ajusta el contexto según el modo
 * de destino.
 */
export function transitionPermissionMode(
  fromMode: string,
  toMode: string,
  context: ToolPermissionContext,
  trigger?: string,
): ToolPermissionContext {
  // plan→plan (p. ej. set_permission_mode del SDK) chocaría con la rama de
  // salida de abajo si no se corta aquí.
  if (fromMode === toMode) return context
  void logPermissionModeChangeEvent({ from: fromMode, to: toMode, trigger })
  handlePlanModeTransition(fromMode, toMode)
  handleAutoModeTransition(fromMode, toMode)

  if (fromMode === 'plan' && toMode !== 'plan') {
    setHasExitedPlanMode(true)
  }

  if (feature('TRANSCRIPT_CLASSIFIER')) {
    if (toMode === 'plan' && fromMode !== 'plan') {
      return prepareContextForPlanMode(context)
    }

    // Plan con auto activo cuenta como uso del clasificador (para el lado
    // de salida). `isAutoModeActive()` es la señal autoritativa —
    // `prePlanMode`/`strippedDangerousRules` son proxies poco fiables
    // porque auto puede desactivarse a mitad de plan.
    const fromUsesClassifier =
      fromMode === 'auto' ||
      (fromMode === 'plan' && (autoModeStateModule?.isAutoModeActive() ?? false))
    const toUsesClassifier = toMode === 'auto' // la entrada a plan ya se maneja arriba

    if (toUsesClassifier && !fromUsesClassifier) {
      if (!isAutoModeGateEnabled()) {
        throw new ContextError('Cannot transition to auto mode: gate is not enabled')
      }
      autoModeStateModule?.setAutoModeActive(true)
      context = stripDangerousPermissionsForAutoMode(context)
    } else if (fromUsesClassifier && !toUsesClassifier) {
      autoModeStateModule?.setAutoModeActive(false)
      setNeedsAutoModeExitAttachment(true)
      context = restoreDangerousPermissions(context)
    }
  }

  // Sólo esparcir si hay algo que limpiar (preserva la igualdad referencial).
  if (fromMode === 'plan' && toMode !== 'plan' && context.prePlanMode) {
    return { ...context, prePlanMode: undefined }
  }

  return context
}

/** Lógica central: si bypassPermissions debe deshabilitarse por el gate de Statsig. */
export function shouldDisableBypassPermissions(): Promise<boolean> {
  return checkSecurityRestrictionGate('tengu_disable_bypass_permissions_mode')
}

/**
 * Chequeo async de si bypassPermissions debe deshabilitarse por el gate, y
 * apaga el proceso si estaba activo cuando el gate lo pide — no hay
 * contexto seguro al que degradar a mitad de una sesión con bypass ya
 * concedido.
 */
export async function checkAndDisableBypassPermissions(
  currentContext: ToolPermissionContext,
  _signal?: AbortSignal,
): Promise<void> {
  if (!currentContext.isBypassPermissionsModeAvailable) return

  const shouldDisable = await shouldDisableBypassPermissions()
  if (!shouldDisable) return

  logForDebugging(
    'bypassPermissions mode is being disabled by Statsig gate (async check)',
  )

  void gracefulShutdown(1, 'bypass_permissions_disabled')
}

/**
 * Convierte la especificación de herramientas base de la línea de
 * comandos.
 *
 * DEFECTO MEDIDO EN LA PROPIA FUENTE — "la trampa del arreglo veraz", y es
 * más severo de lo que su nombre sugiere. `parseToolPreset` declara
 * `string[]` como tipo de retorno (no `string | undefined`) y cae a `[]`
 * cuando el binding no está instalado o cuando el binding mismo devuelve
 * `undefined`/`null` — ambos casos pasan por el mismo `?? []`. Como TODO
 * arreglo es verdadero en JS, incluido `[]`, `if (preset)` es verdadero
 * SIEMPRE, sin excepción: no hay ninguna forma de instalar un binding que
 * lo haga falso sin violar su propio tipo declarado (`string[]`).
 *
 * Consecuencia medida: esta función SIEMPRE devuelve
 * `getToolsForDefaultPreset()` — la rama de `parseToolListFromCLI(baseTools)`
 * es código muerto alcanzable sólo por análisis estático, nunca en
 * ejecución, para CUALQUIER `baseTools`. `parseToolListFromCLI` sigue
 * siendo una función real, exportada y probada por su cuenta (arriba); lo
 * que está muerto es específicamente este camino de llegada a ella.
 *
 * Se porta TAL CUAL — mismo tipo de retorno, mismo `?? []`, mismo
 * `if (preset)`. "Corregirlo" a `string | undefined` cambiaría el
 * comportamiento observable de la función entera, no sólo callaría una
 * advertencia; y el propio criterio del proyecto es que un defecto medido
 * en la fuente se declara, no se repara en silencio.
 */
export function parseBaseToolsFromCLI(baseTools: string[]): string[] {
  const joinedInput = baseTools.join(' ').trim()
  const preset = parseToolPreset(joinedInput)

  if (preset) return getToolsForDefaultPreset()

  return parseToolListFromCLI(baseTools)
}

/** Convierte flags de la CLI a un `PermissionMode`, con seguridad. */
export function initialPermissionModeFromCLI({
  permissionModeCli,
  dangerouslySkipPermissions,
}: {
  permissionModeCli: string | undefined
  dangerouslySkipPermissions: boolean | undefined
}): { mode: PermissionMode; notification?: string } {
  const settings = getSettings() || {}

  // El gate de GrowthBook se chequea primero — la precedencia más alta.
  const growthBookDisableBypassPermissionsMode = checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
    'tengu_disable_bypass_permissions_mode',
  )

  // Luego settings — precedencia menor. Mismo cast laxo que
  // `isBypassPermissionsModeDisabled` (arriba): el campo no está en el
  // esquema declarado de `@thyrox/config/settings`.
  const settingsDisableBypassPermissionsMode =
    (settings.permissions as { disableBypassPermissionsMode?: 'disable' } | undefined)
      ?.disableBypassPermissionsMode === 'disable'

  // El gate de Statsig gana sobre settings.
  const disableBypassPermissionsMode =
    growthBookDisableBypassPermissionsMode || settingsDisableBypassPermissionsMode

  // Chequeo sync del circuit-breaker (lectura cacheada de GB). Evita que el
  // diálogo de inscripción a auto mode se muestre cuando auto no se puede
  // entrar de verdad. `autoModeFlagCli` sigue llevando la intención hasta
  // `verifyAutoModeGateAccess`, que notifica al usuario por qué.
  const autoModeCircuitBrokenSync = feature('TRANSCRIPT_CLASSIFIER')
    ? getAutoModeEnabledStateIfCached() === 'disabled'
    : false

  const orderedModes: PermissionMode[] = []
  let notification: string | undefined

  if (dangerouslySkipPermissions) {
    orderedModes.push('bypassPermissions')
  }
  if (permissionModeCli) {
    const parsedMode = permissionModeFromString(permissionModeCli)
    if (feature('TRANSCRIPT_CLASSIFIER') && parsedMode === 'auto') {
      if (autoModeCircuitBrokenSync) {
        logForDebugging(
          'auto mode circuit breaker active (cached) — falling back to default',
        )
      } else {
        orderedModes.push('auto')
      }
    } else {
      orderedModes.push(parsedMode)
    }
  }
  if (settings.permissions?.defaultMode) {
    const settingsMode = settings.permissions.defaultMode as PermissionMode
    // CCR sólo admite acceptEdits y plan — se ignoran otros defaultModes de
    // settings (p. ej. bypassPermissions concedería acceso total en
    // silencio en un entorno remoto).
    if (
      isEnvTruthy(readEnv('CLAUDE_CODE_REMOTE')) &&
      !['acceptEdits', 'plan', 'default'].includes(settingsMode)
    ) {
      logForDebugging(
        `settings defaultMode "${settingsMode}" is not supported in CLAUDE_CODE_REMOTE — only acceptEdits and plan are allowed`,
      )
      logEvent('tengu_ccr_unsupported_default_mode_ignored', {
        mode: settingsMode,
      } as EventMetadata)
    } else if (feature('TRANSCRIPT_CLASSIFIER') && settingsMode === 'auto') {
      if (autoModeCircuitBrokenSync) {
        logForDebugging(
          'auto mode circuit breaker active (cached) — falling back to default',
        )
      } else {
        orderedModes.push('auto')
      }
    } else {
      orderedModes.push(settingsMode)
    }
  }

  let result: { mode: PermissionMode; notification?: string } | undefined

  for (const mode of orderedModes) {
    if (mode === 'bypassPermissions' && disableBypassPermissionsMode) {
      if (growthBookDisableBypassPermissionsMode) {
        logForDebugging('bypassPermissions mode is disabled by Statsig gate')
        notification = 'Bypass permissions mode was disabled by your organization policy'
      } else {
        logForDebugging('bypassPermissions mode is disabled by settings')
        notification = 'Bypass permissions mode was disabled by settings'
      }
      continue
    }
    result = { mode, notification }
    break
  }

  if (!result) {
    result = { mode: 'default', notification }
  }

  if (feature('TRANSCRIPT_CLASSIFIER') && result.mode === 'auto') {
    autoModeStateModule?.setAutoModeActive(true)
  }

  return result
}

/**
 * Chequeo async completo de disponibilidad del modo auto. Corre en TODOS
 * los builds (circuit-breaker, carrusel, expulsión). Es el único
 * verificador que hace una lectura FRESCA de `tengu_auto_mode_config` — el
 * chequeo sync de arranque usa caché que puede estar vieja; éste la
 * corrige.
 *
 * `_signal` no se referencia en el cuerpo — el mismo parámetro sin uso ya
 * está en la firma de la fuente decompilada, que lo llama `signal`
 * (`AbortSignal` para cancelación futura, no consumido hoy). El prefijo
 * `_` diverge del nombre literal de la fuente por una razón local: este
 * árbol fija `noUnusedParameters: true` en `tsconfig.json`, que exige el
 * prefijo en todo parámetro genuinamente sin uso — sin él, `tsc` falla con
 * TS6133. Se conserva el parámetro (fidelidad de firma) con el nombre
 * ajustado a la restricción local, no porque haga algo.
 */
export async function verifyAutoModeGateAccess(
  currentContext: ToolPermissionContext,
  fastMode?: boolean,
  _signal?: AbortSignal,
): Promise<AutoModeGateCheckResult> {
  const autoModeConfig = await getDynamicConfig_BLOCKS_ON_INIT<{
    enabled?: AutoModeEnabledState
    disableFastMode?: boolean
  }>('tengu_auto_mode_config', {})
  const enabledState = parseAutoModeEnabledState(autoModeConfig?.enabled)
  const disabledBySettings = isAutoModeDisabledBySettings()
  // Tratar "deshabilitado por settings" igual que 'disabled' de GrowthBook
  // para la semántica de circuit-breaker — bloquea la re-entrada
  // explícita vía `isAutoModeGateEnabled()`.
  autoModeStateModule?.setAutoModeCircuitBroken(
    enabledState === 'disabled' || disabledBySettings,
  )

  const mainModel = getMainLoopModel()
  // Circuit-breaker temporal: `tengu_auto_mode_config.disableFastMode`
  // bloquea el modo auto cuando el modo rápido está activo. Revisa el
  // AppState.fastMode en tiempo de ejecución (si se pasó) y, para "ant",
  // el substring '-fast' en el nombre del modelo (convención interna de
  // esa organización para sus modelos rápidos).
  const disableFastModeBreakerFires =
    !!autoModeConfig?.disableFastMode &&
    (!!fastMode ||
      (process.env.USER_TYPE === 'ant' && mainModel.toLowerCase().includes('-fast')))
  const modelSupported = modelSupportsAutoMode(mainModel) && !disableFastModeBreakerFires
  let carouselAvailable = false
  if (enabledState !== 'disabled' && !disabledBySettings && modelSupported) {
    carouselAvailable = enabledState === 'enabled' || hasAutoModeOptInAnySource()
  }
  // `canEnterAuto` protege la entrada explícita (--permission-mode auto,
  // defaultMode: auto) — la entrada explícita YA ES una inscripción, así
  // que sólo se bloquea por circuit-breaker + settings + modelo.
  const canEnterAuto = enabledState !== 'disabled' && !disabledBySettings && modelSupported
  logForDebugging(
    `[auto-mode] verifyAutoModeGateAccess: enabledState=${enabledState} disabledBySettings=${disabledBySettings} model=${mainModel} modelSupported=${modelSupported} disableFastModeBreakerFires=${disableFastModeBreakerFires} carouselAvailable=${carouselAvailable} canEnterAuto=${canEnterAuto}`,
  )

  const autoModeFlagCli = autoModeStateModule?.getAutoModeFlagCli() ?? false

  const setAvailable = (
    ctx: ToolPermissionContext,
    available: boolean,
  ): ToolPermissionContext => {
    if (ctx.isAutoModeAvailable !== available) {
      logForDebugging(
        `[auto-mode] verifyAutoModeGateAccess setAvailable: ${ctx.isAutoModeAvailable} -> ${available}`,
      )
    }
    return ctx.isAutoModeAvailable === available ? ctx : { ...ctx, isAutoModeAvailable: available }
  }

  if (canEnterAuto) {
    return { updateContext: ctx => setAvailable(ctx, carouselAvailable) }
  }

  // El gate está apagado o el circuit-breaker saltó — determinar la razón
  // (no depende del contexto).
  let reason: AutoModeUnavailableReason
  if (disabledBySettings) {
    reason = 'settings'
    logForDebugging('auto mode disabled: disableAutoMode in settings')
  } else if (enabledState === 'disabled') {
    reason = 'circuit-breaker'
    logForDebugging(
      'auto mode disabled: tengu_auto_mode_config.enabled === "disabled" (circuit breaker)',
    )
  } else {
    reason = 'model'
    logForDebugging(
      `auto mode disabled: model ${getMainLoopModel()} does not support auto mode`,
    )
  }
  const notification = getAutoModeUnavailableNotification(reason)

  // Transformación unificada de expulsión. Re-chequea el contexto FRESCO y
  // sólo dispara efectos colaterales cuando la expulsión aplica de verdad.
  const kickOutOfAutoIfNeeded = (ctx: ToolPermissionContext): ToolPermissionContext => {
    const inAuto = ctx.mode === 'auto'
    logForDebugging(
      `[auto-mode] kickOutOfAutoIfNeeded applying: ctx.mode=${ctx.mode} ctx.prePlanMode=${ctx.prePlanMode} reason=${reason}`,
    )
    const inPlanWithAutoActive =
      ctx.mode === 'plan' && (ctx.prePlanMode === 'auto' || !!ctx.strippedDangerousRules)
    if (!inAuto && !inPlanWithAutoActive) {
      return setAvailable(ctx, false)
    }
    if (inAuto) {
      autoModeStateModule?.setAutoModeActive(false)
      setNeedsAutoModeExitAttachment(true)
      return {
        ...applyPermissionUpdate(restoreDangerousPermissions(ctx), {
          type: 'setMode',
          mode: 'default',
          destination: 'session',
        }),
        isAutoModeAvailable: false,
      }
    }
    autoModeStateModule?.setAutoModeActive(false)
    setNeedsAutoModeExitAttachment(true)
    return {
      ...restoreDangerousPermissions(ctx),
      prePlanMode: ctx.prePlanMode === 'auto' ? 'default' : ctx.prePlanMode,
      isAutoModeAvailable: false,
    }
  }

  // Las decisiones de notificación usan el contexto viejo — está bien:
  // decidimos SI notificar según lo que el usuario ESTABA haciendo cuando
  // arrancó este chequeo.
  const wasInAuto = currentContext.mode === 'auto'
  const autoActiveDuringPlan =
    currentContext.mode === 'plan' &&
    (currentContext.prePlanMode === 'auto' || !!currentContext.strippedDangerousRules)
  const wantedAuto = wasInAuto || autoActiveDuringPlan || autoModeFlagCli

  if (!wantedAuto) {
    return { updateContext: kickOutOfAutoIfNeeded }
  }

  if (wasInAuto || autoActiveDuringPlan) {
    return { updateContext: kickOutOfAutoIfNeeded, notification }
  }

  // Sólo la bandera de CLI: defaultMode era auto pero el chequeo sync lo
  // rechazó. Se suprime la notificación si isAutoModeAvailable ya es
  // falso (ya se notificó en un chequeo anterior).
  return {
    updateContext: kickOutOfAutoIfNeeded,
    notification: currentContext.isAutoModeAvailable ? notification : undefined,
  }
}
