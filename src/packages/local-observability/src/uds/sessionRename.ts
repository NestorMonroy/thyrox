/**
 * Los flujos que hacen único el nombre de una sesión entre las sesiones vivas
 * de la máquina. Al arrancar, al revisar tres segundos después y al restaurar
 * un nombre guardado, la sesión pregunta al registro quién más lleva ese
 * nombre y, si debe ceder, toma `nombre-adjetivo-sustantivo`, lo escribe en el
 * registro como `collision` y lo anuncia.
 *
 * Porte de `tPt`, `Gkr`, `Vtn`, `VFn`, `sae`, `jkr`, `y`, `z` y `T`
 * (`chunk-bhsyyycy.js`) y de `li`/`AY` (`chunk-1ay853f5.js`) de 2.1.283. El
 * registro de sesiones (`HH`, `kv`, `Cut`, `eF`, `D3`) y el generador de
 * slugs (`Q5`, en `@thyrox/tool-registry`, que depende de este paquete)
 * llegan en el contexto.
 */
import { reportFeatureBad, reportFeatureOk } from './featureTelemetry.ts'
import {
  MAX_SESSION_NAME,
  decideNameCollision,
  keptYieldName,
  normalizeSessionName,
  retainedSlugName,
  splitSlugSuffix,
  type CollisionMoment,
  type LiveSession,
  type SessionNameState,
} from './sessionNameState.ts'
import { controlsToSpace } from './unicodeSanitize.ts'

/** `z`. */
export const NAME_RECHECK_DELAY_MS = 3000

const COLLISION_FEATURE = 'session_name_collision'

/** `kv`: el nombre que el registro tiene para esta sesión y de dónde vino. */
export type RegisteredName = { name: string; source: string; givenAtLaunch?: boolean }

/** `w`: lo que el registro de sesiones responde. */
export type SessionRegistryAccess = {
  /** `Cut`: si la sesión quedó registrada. */
  whenRegistered: () => Promise<boolean>
  /** `D3`: las sesiones vivas de la máquina. */
  listLive: () => Promise<LiveSession[]>
  slug?: () => string
}

export type RenameContext = {
  /** `wS()`. */
  state: SessionNameState
  registry: SessionRegistryAccess
  /** `kv`. */
  registeredName: () => RegisteredName | undefined
  /** `HH()`: los contadores que dicen si una restauración quedó obsoleta. */
  registration: () => { adoptions: number; restores: number }
  /** `eF`: escribe el nombre en el registro, con su fuente. */
  writeName: (name: string, target: unknown, source: string | undefined) => Promise<unknown>
  /** `ADo`. */
  isShortWordSlug: (text: string) => boolean
  /** `Q5`: el slug por omisión cuando el registro no trae uno. */
  slug: () => string
  /** `N`: la bandera `tengu_session_name_uniqueness`. */
  uniquenessEnabled: () => boolean
  pid: number
  log: (message: string, level: 'info' | 'warn') => void
  sink?: (name: string, metadata: Record<string, unknown>) => void
  /** `T`: por omisión, un temporizador que no retiene el proceso. */
  scheduleRecheck?: (callback: () => void) => void
}

export type UniqueNameResult = { name: string; yielded: boolean }

/** `T`. */
function scheduleAfterDelay(callback: () => void): void {
  setTimeout(callback, NAME_RECHECK_DELAY_MS).unref()
}

/** `AY`: sin controles C0 ni C1, en `pA` puntos de código. */
function stripNameControls(name: string): string {
  return [...name.replace(/[\x00-\x1f\x7f-\x9f]/g, '')].slice(0, MAX_SESSION_NAME).join('')
}

/** `li`. */
export function sanitizeSessionName(name: string): string {
  return stripNameControls(controlsToSpace(name.trim())).trim()
}

/** `y`: si `name` es el nombre registrado de esta sesión. */
export function isCurrentName(name: string, context: RenameContext): boolean {
  const current = context.registeredName()
  return current !== undefined && normalizeSessionName(current.name) === normalizeSessionName(name)
}

/** `jkr`: el nombre actual si lo escribió el usuario (o su cesión) y sigue siendo el que tecleó. */
export function userTypedCurrentName(context: RenameContext): string | undefined {
  const current = context.registeredName()
  return current !== undefined && (current.source === 'user' || current.source === 'collision') && context.state.userTypedName === current.name ? current.name : undefined
}

/** `C`. */
function slugBase(name: string, context: RenameContext): string | undefined {
  return splitSlugSuffix(name, context.isShortWordSlug)?.base
}

/** `tPt`: el nombre que esta sesión debe llevar para no repetir el de otra sesión viva. */
export async function resolveUniqueName(desiredName: string, moment: CollisionMoment, context: RenameContext, suffixBase: string = desiredName): Promise<UniqueNameResult> {
  const keep = { name: desiredName, yielded: false }
  if (!context.uniquenessEnabled()) return keep
  const base = slugBase(suffixBase, context) ?? suffixBase
  if (!(await context.registry.whenRegistered())) return keep
  try {
    const live = await context.registry.listLive()
    const self = live.find(session => session.pid === context.pid)
    if (!self) return keep
    const decision = decideNameCollision({ desiredName, self, live, moment, slug: context.registry.slug ?? context.slug, suffixBase: base })
    if (decision.kind === 'keep') return keep
    const retained = retainedSlugName(desiredName, self, context.state, context.isShortWordSlug, context.uniquenessEnabled())
    const chosen = retained !== undefined && normalizeSessionName(retained) !== normalizeSessionName(desiredName) ? retained : decision.newName
    const name = sanitizeSessionName(chosen) || decision.newName
    context.log(`[session-name] "${desiredName}" is held by live pid ${decision.holders[0]?.pid}; this session takes "${name}"`, 'info')
    reportFeatureOk(COLLISION_FEATURE, undefined, context.sink)
    context.state.lastYield = { base: normalizeSessionName(base), name }
    return { name, yielded: true }
  } catch (error) {
    context.log(`[session-name] uniqueness check failed, keeping "${desiredName}": ${error instanceof Error ? error.message : String(error)}`, 'warn')
    reportFeatureBad(COLLISION_FEATURE, 'check_failed', undefined, context.sink)
    return keep
  }
}

export type StartupNamingOptions = {
  sessionNameArg?: string
  sessionNameArgSource?: string
  interactive: boolean
  writeName: (name: string, source: string) => Promise<unknown>
  onRenamed?: (name: string, previousName: string) => void
}

/** `Gkr`: al arrancar, escribe el nombre pedido y lo hace único, con una revisión posterior. */
export async function runStartupNaming(options: StartupNamingOptions, context: RenameContext): Promise<void> {
  const { sessionNameArg, interactive, writeName, onRenamed } = options
  const schedule = context.scheduleRecheck ?? scheduleAfterDelay
  if (sessionNameArg && interactive) context.state.userTypedName = sessionNameArg
  if (sessionNameArg) await writeName(sessionNameArg, options.sessionNameArgSource ?? 'user')
  const current = context.registeredName()
  if (!interactive || !current || current.source === 'derived') return
  const check = async (name: string, isRecheck: boolean, suffixBase: string = name): Promise<void> => {
    if (isRecheck && !isCurrentName(name, context)) return
    const result = await resolveUniqueName(name, isRecheck ? 'recheck' : 'startup', context, suffixBase)
    if (!isCurrentName(name, context)) return
    if (!result.yielded) {
      if (!isRecheck) schedule(() => void check(name, true))
      return
    }
    if (context.state.userTypedName === name) context.state.userTypedName = result.name
    await writeName(result.name, 'collision')
    onRenamed?.(result.name, name)
    context.state.announceYield(result.name, name)
    if (!isRecheck) schedule(() => void check(result.name, true, name))
  }
  await check(current.name, false)
}

export type NameRecheckOptions = {
  name: string
  suffixBase?: string
  onYield: (name: string, previousName: string) => Promise<void>
}

/** `Vtn`: una revisión diferida del nombre; si debe cederlo, avisa a `onYield`. */
export function scheduleNameRecheck(options: NameRecheckOptions, context: RenameContext): void {
  const { name, onYield } = options
  const suffixBase = options.suffixBase ?? name
  const schedule = context.scheduleRecheck ?? scheduleAfterDelay
  schedule(() => {
    void (async () => {
      if (!isCurrentName(name, context)) return
      const result = await resolveUniqueName(name, 'recheck', context, suffixBase)
      if (!result.yielded || !isCurrentName(name, context)) return
      if (context.state.userTypedName === name) context.state.userTypedName = result.name
      await onYield(result.name, name)
    })()
  })
}

/**
 * `VFn`: el nombre explícito que la sesión tiene ahora, si una restauración
 * no debe pisarlo. No cuentan los nombres derivados ni automáticos, el que
 * esta sesión conserva tras ceder, ni el que ya es uno de los implicados.
 */
export function conflictingExplicitName(before: RegisteredName | undefined, requested: string, chosen: string, context: RenameContext): RegisteredName | undefined {
  const current = context.registeredName()
  if (current === undefined || current.source === 'derived' || current.source === 'auto') return undefined
  if (current.source === 'collision' && keptYieldName(before?.name ?? requested, current.name, context.state, context.isShortWordSlug, context.uniquenessEnabled()) !== undefined) return undefined
  const normalized = normalizeSessionName(current.name)
  if ((before !== undefined && normalized === normalizeSessionName(before.name)) || normalized === normalizeSessionName(requested) || normalized === normalizeSessionName(chosen)) return undefined
  return current
}

export type RestoreOptions = { autoOnly?: boolean; source?: string; yieldToLaterRestore?: boolean }

/** `sae`: restaura un nombre guardado, haciéndolo único, salvo que una adopción o una restauración posterior lo dejen obsoleto. */
export async function restoreSessionName(name: string | undefined, target: unknown, options: RestoreOptions, context: RenameContext): Promise<void> {
  const requested = name ? sanitizeSessionName(name) : ''
  if (!requested) return
  const counters = context.registration()
  const adoptions = counters.adoptions
  const restore = ++counters.restores
  const stillCurrent = () => counters.adoptions === adoptions && (!options.yieldToLaterRestore || counters.restores === restore)
  if (!(await context.registry.whenRegistered()) || !stillCurrent()) return
  if (options.autoOnly) {
    await context.writeName(requested, target, 'auto')
    return
  }
  const before = context.registeredName()
  if (before !== undefined && before.source !== 'auto' && before.source !== 'derived' && normalizeSessionName(before.name) === normalizeSessionName(requested)) return
  const result = await resolveUniqueName(requested, 'rename', context)
  if (!stillCurrent() || conflictingExplicitName(before, requested, result.name, context)) return
  const onYield = async (yieldedName: string, previousName: string) => {
    await context.writeName(yieldedName, target, 'collision')
    context.state.announceYield(yieldedName, previousName)
  }
  if (!result.yielded) {
    await context.writeName(requested, target, options.source)
    scheduleNameRecheck({ name: requested, onYield }, context)
    return
  }
  await context.writeName(result.name, target, 'collision')
  if (context.state.userTypedName === requested) context.state.userTypedName = result.name
  scheduleNameRecheck({ name: result.name, suffixBase: requested, onYield }, context)
  if (result.name === before?.name) return
  context.state.announceYield(result.name, requested)
}
