/** Un modelo local servido por Ollama, elegido porque una suite lo aprobó para la clase. */
export type LocalExecution = {
  runtime: 'ollama'
  /** Nombre contractual `thyrox-…` del catálogo. */
  model: string
  taskClass: TaskKind
  /** Contexto que el perfil exige; la cualificación midió al menos esto. */
  contextTokens: number
  qualification: ModelQualification
  /**
   * Los respaldos locales cualificados para la clase y el contexto, en el orden
   * de `fallback.chain`: a dónde avanza la ejecución si el elegido no se puede
   * servir (el `$a` de la referencia). Vacío sin política o sin cadena local.
   */
  fallbackModels: readonly string[]
}

/**
 * Por qué ningún modelo local cumple, como enumeración cerrada: lo que la
 * referencia llama `trigger`. `no_usable_fallback` es la cadena agotada.
 */
export type FallbackTrigger =
  | 'empty_catalog'
  | 'policy_excludes_catalog'
  | 'unqualified_profile'
  | 'unqualified'
  | 'insufficient_context'
  | 'no_usable_fallback'

/** El salto que llevó al proveedor: el motivo y la posición del eslabón en `fallback.chain`. */
export type FallbackStep = {
  trigger: FallbackTrigger
  chainIndex: number
}

/**
 * El catálogo del proveedor ejecutado por `claude -p`. `fallback` y
 * `fallbackReason` existen sólo cuando se llegó aquí porque ningún modelo
 * local cumplió.
 */
export type ProviderExecution = Recommendation & {
  runtime: 'claude-cli'
  taskClass: TaskKind
  fallback?: FallbackStep
  fallbackReason?: string
}

/**
 * Ningún modelo que la política permite cumple y ningún eslabón de la cadena
 * es utilizable: no hay ejecución que recomendar. No lleva modelo a propósito.
 */
export type BlockedExecution = {
  runtime: 'blocked'
  taskClass: TaskKind
  contextTokens: number
  trigger: FallbackTrigger
  blockedReason: string
}

export type ExecutionRecommendation = LocalExecution | ProviderExecution | BlockedExecution

/** El catálogo del proveedor, sin pasar por los modelos locales. */
export function providerExecution(kind: TaskKind, profile: TurnProfile): ProviderExecution {
  return { ...recommend(kind, profile), runtime: 'claude-cli', taskClass: kind }
}

/** La causa de que ningún modelo local cumpla: su motivo tipado y el texto que lo explica. */
type LocalShortfall = {
  trigger: FallbackTrigger
  reason: string
}

/**
 * Por qué ningún modelo local cumple: catálogo vacío, ninguna cualificación
 * aprobada vigente de la clase, o aprobadas con menos contexto medido del que
 * el perfil exige (se nombra la mayor medida).
 */
function localShortfall(kind: TaskKind, profile: TurnProfile, local: LocalModelInventory): LocalShortfall {
  if (local.entries.length === 0) return { trigger: 'empty_catalog', reason: 'catálogo local vacío: ningún modelo declarado' }
  const approvedAtAnyContext = qualifiedModels(local.entries, local.qualifications, kind, 0)
  if (approvedAtAnyContext.length === 0 && measuredWithOtherProfile(local, kind)) {
    return { trigger: 'unqualified_profile',
      reason: `hay medidas aprobadas de la clase ${kind}, pero con otro razonamiento: falta cualificar con el perfil del worker (reasoningEffort ${LOCAL_REASONING_EFFORT})` }
  }
  if (approvedAtAnyContext.length === 0) {
    return { trigger: 'unqualified',
      reason: `sin cualificación aprobada vigente de la clase ${kind} entre los ${local.entries.length} modelo(s) del catálogo local` }
  }
  const widest = Math.max(...approvedAtAnyContext.map((candidate) => candidate.qualification.contextTokens))
  return { trigger: 'insufficient_context',
    reason: `contexto medido insuficiente: el mayor aprobado para ${kind} midió ${widest} tokens < ${profile.contextTokens} exigidos` }
}

/** Hay una cualificación aprobada de la clase, pero medida con otro razonamiento que el del worker local. */
function measuredWithOtherProfile(local: LocalModelInventory, kind: TaskKind): boolean {
  const names = new Set(local.entries.map(entry => entry.name))
  return local.qualifications.some(q => names.has(q.model) && q.passed && q.taskClass === kind && q.reasoningEffort !== LOCAL_REASONING_EFFORT)
}

/** La política dejó fuera un catálogo que sí tiene entradas: la causa es la política, no el catálogo. */
function excludesWholeCatalog(local: LocalModelInventory, permitted: LocalModelInventory): boolean {
  return local.entries.length > 0 && permitted.entries.length === 0
}

function shortfallOf(kind: TaskKind, profile: TurnProfile, local: LocalModelInventory, permitted: LocalModelInventory): LocalShortfall {
  if (excludesWholeCatalog(local, permitted)) {
    return { trigger: 'policy_excludes_catalog', reason: `la política no permite ninguna de las ${local.entries.length} entrada(s) del catálogo local` }
  }
  return localShortfall(kind, profile, permitted)
}

/**
 * Los respaldos locales de `fallback.chain`, en su orden: cada eslabón local
 * aporta sus entradas cualificadas para la clase y el contexto, sin repetir el
 * elegido ni un modelo ya aportado.
 */
function localFallbackModels(kind: TaskKind, profile: TurnProfile, permitted: LocalModelInventory,
  policy: ExecutionPolicy | undefined, chosen: string): string[] {
  const qualified = qualifiedModels(permitted.entries, permitted.qualifications, kind, profile.contextTokens)
  const ordered = (policy?.fallback.chain ?? []).flatMap(target => (isProviderTarget(target)
    ? []
    : qualified.filter(candidate => matchesSelector(target, candidate.entry)).map(candidate => candidate.entry.name)))
  return [...new Set(ordered)].filter(name => name !== chosen)
}

/**
 * Sin modelo local: el primer eslabón utilizable de la cadena. Hoy sólo el
 * proveedor lo es aquí —un eslabón local cualificado ya habría ganado la
 * selección—; los locales cuentan en ejecución (`fallbackModels`).
 */
function providerFallback(kind: TaskKind, profile: TurnProfile, policy: ExecutionPolicy | undefined,
  shortfall: LocalShortfall): ExecutionRecommendation {
  const step = { trigger: shortfall.trigger, chainIndex: 0 }
  if (policy === undefined) return { ...providerExecution(kind, profile), fallback: step, fallbackReason: shortfall.reason }
  if (!policy.fallback.enabled) {
    return { runtime: 'blocked', taskClass: kind, contextTokens: profile.contextTokens, trigger: shortfall.trigger,
      blockedReason: `la política no permite respaldo y ningún modelo permitido cumple: ${shortfall.reason}` }
  }
  const chainIndex = policy.fallback.chain.findIndex(isProviderTarget)
  if (chainIndex < 0) {
    return { runtime: 'blocked', taskClass: kind, contextTokens: profile.contextTokens, trigger: 'no_usable_fallback',
      blockedReason: `ningún eslabón de fallback.chain es utilizable (${policy.fallback.chain.length} declarado(s)): ${shortfall.reason}` }
  }
  return { ...providerExecution(kind, profile), fallback: { ...step, chainIndex }, fallbackReason: shortfall.reason }
}

/**
 * Elige dónde se ejecuta una clase de tarea: el modelo local más rápido de los
 * que una medición aprobó para la clase con contexto suficiente, con sus
 * respaldos locales en orden; si no hay ninguno, el primer eslabón utilizable
 * de `fallback.chain`, con el motivo tipado del salto.
 */
export function recommendExecution(
  kind: TaskKind,
  profile: TurnProfile,
  local: LocalModelInventory,
  policy?: ExecutionPolicy,
): ExecutionRecommendation {
  // Con política, sólo compiten los modelos que permite; sin ella, todos (el comportamiento previo).
  const permitted = policy === undefined ? local : { ...local, entries: local.entries.filter(entry => allowsEntry(policy, entry)) }
  const [fastest] = qualifiedModels(permitted.entries, permitted.qualifications, kind, profile.contextTokens)
  if (fastest) {
    return {
      runtime: 'ollama',
      model: fastest.entry.name,
      taskClass: kind,
      contextTokens: profile.contextTokens,
      qualification: fastest.qualification,
      fallbackModels: localFallbackModels(kind, profile, permitted, policy, fastest.entry.name),
    }
  }
  return providerFallback(kind, profile, policy, shortfallOf(kind, profile, local, permitted))
}
