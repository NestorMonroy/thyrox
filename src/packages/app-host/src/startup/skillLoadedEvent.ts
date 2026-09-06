// Adaptación de @claude-code-how-works/app-host: src/startup/skillLoadedEvent.ts.
// Capa 1 — porte PARCIAL declarado.
//
// Las CUATRO piezas que la fuente cita son de paquetes hermanos ausentes
// en este árbol: `getSkillToolCommands` (de
// `@claude-code-how-works/command-runtime/runtime` — nuestro
// `@thyrox/command-runtime` no tiene ese símbolo, ver
// `command-runtime/package.json` exports), `computeSkillsBudgetStats` y
// `getCharBudget` (de
// `@claude-code-how-works/tool-registry/tools/SkillTool/prompt.js` —
// paquete `tool-registry` entero ausente aquí) y `logEvent`/
// `AnalyticsMetadata_*` (de `@claude-code-how-works/local-observability` —
// también ausente).
//
// Se resuelve con inyección de dependencia total: las cuatro se reciben
// en `deps`, con defaults seguros (lista de skills vacía, presupuesto en
// `fits`, sumidero no-op) que reproducen el estado real de hoy — sin esos
// cuatro paquetes, no hay skills que enumerar ni telemetría a la que
// mandar. El mecanismo — el filtro `type === 'prompt'`, la construcción
// del evento, el segundo bloque que compara el modo de presupuesto — se
// porta verbatim; lo único que cambia es de dónde vienen los datos.

export type SkillCommand = {
  type: string
  name: string
  source: string
  loadedFrom: string
  kind?: string
}

export type SkillsBudgetStats = {
  budgetMode: string
  cappedSkills: unknown[]
  budgetTruncatedSkills: unknown[]
}

export type SkillLoadedEventDeps = {
  getSkillCommands?: (cwd: string) => Promise<SkillCommand[]>
  getCharBudget?: (contextWindowTokens: number) => number
  computeSkillsBudgetStats?: (skills: SkillCommand[], contextWindowTokens: number) => SkillsBudgetStats
  logEvent?: (event: string, metadata: Record<string, unknown>) => void
}

const defaultGetSkillCommands: NonNullable<SkillLoadedEventDeps['getSkillCommands']> = async () => []
const defaultGetCharBudget: NonNullable<SkillLoadedEventDeps['getCharBudget']> = () => 0
const defaultComputeSkillsBudgetStats: NonNullable<SkillLoadedEventDeps['computeSkillsBudgetStats']> = () => ({
  budgetMode: 'fits',
  cappedSkills: [],
  budgetTruncatedSkills: [],
})
const defaultLogEvent: NonNullable<SkillLoadedEventDeps['logEvent']> = () => {}

/**
 * Registra un evento `tengu_skill_loaded` por cada skill de tipo `prompt`
 * disponible al arrancar la sesión, y un `tengu_skill_budget_truncated` si
 * el presupuesto de caracteres tuvo que truncar o descartar descripciones.
 * Habilita analítica sobre qué skills están disponibles entre sesiones.
 */
export async function logSkillsLoaded(
  cwd: string,
  contextWindowTokens: number,
  deps: SkillLoadedEventDeps = {},
): Promise<void> {
  const getSkillCommands = deps.getSkillCommands ?? defaultGetSkillCommands
  const getCharBudget = deps.getCharBudget ?? defaultGetCharBudget
  const computeSkillsBudgetStats = deps.computeSkillsBudgetStats ?? defaultComputeSkillsBudgetStats
  const logEvent = deps.logEvent ?? defaultLogEvent

  const skills = await getSkillCommands(cwd)
  const skillBudget = getCharBudget(contextWindowTokens)

  for (const skill of skills) {
    if (skill.type !== 'prompt') continue

    logEvent('tengu_skill_loaded', {
      // _PROTO_skill_name enruta a la columna BQ privilegiada skill_name.
      // Los nombres sin redactar no van en additional_metadata.
      _PROTO_skill_name: skill.name,
      skill_source: skill.source,
      skill_loaded_from: skill.loadedFrom,
      skill_budget: skillBudget,
      ...(skill.kind && { skill_kind: skill.kind }),
    })
  }

  // Porte del ant v2.1.131 Ws7+pSK (4142.js / 5025.js): si el presupuesto
  // tuvo que truncar o descartar descripciones de skills, emitir
  // telemetría para que se note cuándo los usuarios empiezan a topar el
  // límite. La notificación visible al usuario dispara vía el hook
  // useSkillsBudgetNotification (`packages/repl/.../skillsBudgetWarning.ts`,
  // fuera de alcance de este porte).
  try {
    const stats = computeSkillsBudgetStats(skills, contextWindowTokens)
    if (stats.budgetMode !== 'fits' || stats.cappedSkills.length > 0 || stats.budgetTruncatedSkills.length > 0) {
      logEvent('tengu_skill_budget_truncated', {
        budget_mode: stats.budgetMode,
        capped_count: stats.cappedSkills.length,
        truncated_count: stats.budgetTruncatedSkills.length,
        skill_total: skills.length,
      })
    }
  } catch {
    // el cómputo del presupuesto no debe bloquear el arranque
  }
}
