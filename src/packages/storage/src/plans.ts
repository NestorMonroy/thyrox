/**
 * Puerto de `ccnmt: packages/storage/src/plans.ts` (401 líneas fuente).
 * Gestión del archivo de plan por sesión: slug de palabras, directorio de
 * planes (con validación anti-traversal si viene de settings), lectura,
 * y recuperación de contenido de plan al reanudar/bifurcar una sesión
 * cuando el archivo local no sobrevivió (sesiones remotas/CCR).
 *
 * Ocho dependencias hermanas ausentes, reimplementadas PRIVADAMENTE (o
 * reusadas de módulos ya presentes en este mismo paquete):
 *
 *  - `getSessionId` (`app-host/bootstrap/state.js`) — se importa de
 *    `./sessionPaths.js` (uno de mis 14 módulos), no se reimplementa.
 *  - `getPlanSlugCache` (`app-host/bootstrap/state.js`) — un
 *    `Map<SessionId,string>` module-scoped; se reimplementa con el mismo
 *    contrato exacto (no hay lógica que perder: es sólo un mapa).
 *  - `AgentId`/`SessionId` (`agent/idTypes`) — alias locales `= string`
 *    (agent ya importa de storage; iría en sentido inverso).
 *  - `LogOption` / los tipos de mensaje (`agent/logsTypes.js`,
 *    `agent/messageShapes`) — se reimplementan como un tipo `PlanMessage`
 *    aplanado con sólo los campos que este archivo lee (`slug`,
 *    `message.content`, `planContent`, `attachment`, `subtype`,
 *    `snapshotFiles`), no el discriminated union completo de la fuente.
 *  - `EXIT_PLAN_MODE_V2_TOOL_NAME`
 *    (`tool-registry/tools/ExitPlanModeTool/constants.js`) — constante
 *    cuyo VALOR es su contrato (`'ExitPlanMode'`), se inlinea verbatim.
 *  - `getCwd` y `logForDebugging` — SÍ se reusan de verdad, importados de
 *    `./internal/pendingCrossPackageDeps.js`.
 *  - `getClaudeConfigHomeDir` (`config/env/utils`) — reimplementación
 *    PRIVADA fiel, mismo cuerpo que ya usan `projectPurge.ts` y
 *    `sessionPaths.ts` de este paquete.
 *  - `isENOENT` (`local-observability/errorHelpers.js`) — fiel, una línea.
 *  - `getEnvironmentKind` (`./filePersistence/outputsScanner.js`, hermano
 *    del propio paquete `storage` pero NO uno de mis 14 módulos ni
 *    presente todavía en este árbol) — se reimplementa aquí, fiel a su
 *    cuerpo real (lee `CLAUDE_CODE_ENVIRONMENT_KIND`, 8 líneas).
 *  - `getFsImplementation` (`./fsOperations.js`, archivo de 23801 B en la
 *    fuente, AUSENTE de este árbol y fuera de mis 14 módulos) — se usa
 *    `fs`/`fs/promises` DIRECTO en vez de la capa de abstracción
 *    inyectable que la fuente usa para mockear sin tocar disco real; los
 *    tests de este pase ya usan directorios temporales reales (mismo
 *    patrón que el resto de este paquete).
 *  - `getInitialSettings` (`config/settings`, paquete de settings
 *    completo ausente) — se reimplementa como un valor inyectable vía
 *    `setInitialSettingsForTest` (por defecto `{}`, sin
 *    `plansDirectory` — usa siempre la ruta por defecto), para poder
 *    ejercitar en test TANTO la rama por defecto COMO la rama de
 *    `plansDirectory` personalizado + su validación anti-traversal.
 *  - `generateWordSlug` (`tool-registry/words.js`, listas de palabras
 *    curadas de cientos de entradas cada una) — se reimplementa con
 *    listas locales de un puñado de palabras cada una: el contrato que
 *    los tests ejercitan es la FORMA (`adjetivo-verbo-sustantivo`) y el
 *    reintento ante colisión, no el vocabulario concreto.
 *
 * `getPlansDirectory` NO se memoiza (la fuente sí, con `lodash-es/
 * memoize.js` sin argumentos) — mismo criterio que YA declara
 * `projectPurge.ts` de este paquete para `getClaudeConfigHomeDir`: cada
 * test de este pase cambia `CLAUDE_CONFIG_DIR`/settings/cwd a un valor
 * nuevo, así que memoizar no ahorraría nada y rompería el aislamiento
 * entre casos.
 */
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { copyFile, readFile, writeFile } from 'fs/promises'
import { homedir } from 'os'
import { join, resolve, sep } from 'path'
import { logForDebugging, getCwd } from './internal/pendingCrossPackageDeps.js'
import { logError } from './logging.js'
import { getSessionId } from './sessionPaths.js'

type AgentId = string
type SessionId = string

/** Constante cuyo VALOR literal es su contrato — ver docstring del archivo. */
const EXIT_PLAN_MODE_V2_TOOL_NAME = 'ExitPlanMode'

const MAX_SLUG_RETRIES = 10

// ---------------------------------------------------------------------------
// Sustitutos — ver docstring del archivo.
// ---------------------------------------------------------------------------

const _planSlugCache = new Map<SessionId, string>()
function getPlanSlugCache(): Map<SessionId, string> {
  return _planSlugCache
}

function getClaudeConfigHomeDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize(
    'NFC',
  )
}

function isENOENT(e: unknown): boolean {
  return Boolean(
    e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT',
  )
}

/** Fiel a `filePersistence/outputsScanner.ts::getEnvironmentKind` — ver
 * docstring del archivo. */
function getEnvironmentKind(): 'byoc' | 'anthropic_cloud' | null {
  const kind = process.env.CLAUDE_CODE_ENVIRONMENT_KIND
  if (kind === 'byoc' || kind === 'anthropic_cloud') {
    return kind
  }
  return null
}

type InitialSettings = { plansDirectory?: string }
let _initialSettings: InitialSettings = {}
/** Inyección de dependencias para test — ver docstring del archivo. */
export function setInitialSettingsForTest(settings: InitialSettings): void {
  _initialSettings = settings
}
function getInitialSettings(): InitialSettings {
  return _initialSettings
}

// Listas reducidas — ver docstring del archivo (la fuente real trae
// cientos de palabras por lista; aquí bastan las suficientes para
// ejercitar forma + reintento ante colisión).
const ADJECTIVES = [
  'brave', 'calm', 'eager', 'fuzzy', 'gentle', 'happy', 'jolly', 'lively',
  'mighty', 'nimble', 'proud', 'quiet', 'rapid', 'sunny', 'witty', 'zesty',
]
const VERBS = [
  'climbs', 'dances', 'floats', 'glides', 'hums', 'jumps', 'runs', 'sings',
  'soars', 'spins', 'swims', 'walks', 'wanders', 'weaves', 'whirls', 'writes',
]
const NOUNS = [
  'badger', 'canyon', 'delta', 'ember', 'falcon', 'glacier', 'harbor',
  'island', 'jasmine', 'kernel', 'lagoon', 'meadow', 'nebula', 'otter',
  'pebble', 'quartz',
]
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}
function generateWordSlug(): string {
  return `${pickRandom(ADJECTIVES)}-${pickRandom(VERBS)}-${pickRandom(NOUNS)}`
}

// ---------------------------------------------------------------------------
// Tipos aplanados de mensaje — ver docstring del archivo.
// ---------------------------------------------------------------------------

type PlanMessageContentBlock = {
  type: string
  name?: string
  input?: Record<string, unknown>
}
export type PlanMessage = {
  type: string
  slug?: string
  message?: { content: PlanMessageContentBlock[] | string }
  planContent?: string
  attachment?: { type: string; planContent?: string }
  subtype?: string
  snapshotFiles?: Array<{ key: string; path: string; content: string }>
}
export type LogOption = { messages: PlanMessage[] }

// ---------------------------------------------------------------------------
// El módulo real — porte fiel.
// ---------------------------------------------------------------------------

/**
 * Obtiene o genera un slug de palabras para el plan de la sesión actual.
 * El slug se genera perezosamente en el primer acceso y se cachea para
 * la sesión. Si ya existe un archivo de plan con el slug generado,
 * reintenta hasta 10 veces.
 */
export function getPlanSlug(sessionId?: SessionId): string {
  const id = sessionId ?? getSessionId()
  const cache = getPlanSlugCache()
  let slug = cache.get(id)
  if (!slug) {
    const plansDir = getPlansDirectory()
    // Intenta encontrar un slug único que no choque con archivos existentes.
    for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
      slug = generateWordSlug()
      const filePath = join(plansDir, `${slug}.md`)
      if (!existsSync(filePath)) {
        break
      }
    }
    cache.set(id, slug!)
  }
  return slug!
}

/** Fija un slug de plan concreto para una sesión (se usa al reanudar). */
export function setPlanSlug(sessionId: SessionId, slug: string): void {
  getPlanSlugCache().set(sessionId, slug)
}

/**
 * Limpia el slug de plan de la sesión actual.
 * Debe llamarse en /clear para asegurar que se use un archivo de plan
 * nuevo.
 */
export function clearPlanSlug(sessionId?: SessionId): void {
  const id = sessionId ?? getSessionId()
  getPlanSlugCache().delete(id)
}

/**
 * Limpia TODAS las entradas de slug de plan (todas las sesiones).
 * Se usa en /clear para liberar entradas de slug de sub-sesión.
 */
export function clearAllPlanSlugs(): void {
  getPlanSlugCache().clear()
}

export function getPlansDirectory(): string {
  const settings = getInitialSettings()
  const settingsDir = settings.plansDirectory
  let plansPath: string

  if (settingsDir) {
    // settings.json (relativo a la raíz del proyecto)
    const cwd = getCwd()
    const resolved = resolve(cwd, settingsDir)

    // Valida que la ruta se mantenga dentro de la raíz del proyecto,
    // para prevenir path traversal.
    if (!resolved.startsWith(cwd + sep) && resolved !== cwd) {
      logError(
        new Error(`plansDirectory must be within project root: ${settingsDir}`),
      )
      plansPath = join(getClaudeConfigHomeDir(), 'plans')
    } else {
      plansPath = resolved
    }
  } else {
    // Por defecto.
    plansPath = join(getClaudeConfigHomeDir(), 'plans')
  }

  // Asegura que el directorio exista (mkdirSync con recursive:true es
  // no-op si ya existe).
  try {
    mkdirSync(plansPath, { recursive: true })
  } catch (error) {
    logError(error)
  }

  return plansPath
}

/**
 * Obtiene la ruta de archivo del plan de una sesión.
 * @param agentId Id de agente opcional para subagentes. Si se omite,
 * devuelve el plan de la sesión principal.
 * Para la conversación principal (sin agentId), devuelve
 * {planSlug}.md. Para subagentes (con agentId), devuelve
 * {planSlug}-agent-{agentId}.md
 */
export function getPlanFilePath(agentId?: AgentId): string {
  const planSlug = getPlanSlug(getSessionId())

  // Conversación principal: nombre de archivo simple con el slug de palabras.
  if (!agentId) {
    return join(getPlansDirectory(), `${planSlug}.md`)
  }

  // Subagentes: incluye el agent ID.
  return join(getPlansDirectory(), `${planSlug}-agent-${agentId}.md`)
}

/**
 * Obtiene el contenido del plan de una sesión.
 * @param agentId Id de agente opcional para subagentes. Si se omite,
 * devuelve el plan de la sesión principal.
 */
export function getPlan(agentId?: AgentId): string | null {
  const filePath = getPlanFilePath(agentId)
  try {
    return readFileSync(filePath, { encoding: 'utf-8' })
  } catch (error) {
    if (isENOENT(error)) return null
    logError(error)
    return null
  }
}

/** Extrae el slug de plan del historial de mensajes de un log. */
function getSlugFromLog(log: LogOption): string | undefined {
  return log.messages.find(m => m.slug)?.slug
}

/**
 * Restaura el slug de plan de una sesión reanudada. Fija el slug en el
 * caché de sesión para que getPlanSlug lo devuelva. Si el archivo de
 * plan falta, intenta recuperarlo de un snapshot de archivo (escrito
 * incrementalmente durante la sesión) o del historial de mensajes.
 * Devuelve true si existe (o se recuperó) un archivo de plan para el
 * slug.
 * @param log El log del que restaurar
 * @param targetSessionId El session ID al que asociar el slug de plan.
 *                        Debe ser el session ID ORIGINAL que se está
 *                        reanudando, no el session ID temporal previo
 *                        al resume.
 */
export async function copyPlanForResume(
  log: LogOption,
  targetSessionId?: SessionId,
): Promise<boolean> {
  const slug = getSlugFromLog(log)
  if (!slug) {
    return false
  }

  // Fija el slug para el session ID destino (o el actual si no se dio).
  const sessionId = targetSessionId ?? getSessionId()
  setPlanSlug(sessionId, slug)

  // Intenta leer el archivo de plan directo — la recuperación dispara en ENOENT.
  const planPath = join(getPlansDirectory(), `${slug}.md`)
  try {
    await readFile(planPath, { encoding: 'utf-8' })
    return true
  } catch (e: unknown) {
    if (!isENOENT(e)) {
      // No lanza — se llama fire-and-forget (void copyPlanForResume(...)) sin .catch().
      logError(e)
      return false
    }
    // Sólo intenta recuperación en sesiones remotas (CCR), donde los
    // archivos no persisten.
    if (getEnvironmentKind() === null) {
      return false
    }

    logForDebugging(
      `Plan file missing during resume: ${planPath}. Attempting recovery.`,
    )

    // Intenta primero el snapshot de archivo (escrito incrementalmente
    // durante la sesión).
    const snapshotPlan = findFileSnapshotEntry(log.messages, 'plan')
    let recovered: string | null = null
    if (snapshotPlan && snapshotPlan.content.length > 0) {
      recovered = snapshotPlan.content
      logForDebugging(
        `Plan recovered from file snapshot, ${recovered.length} chars`,
      )
    } else {
      // Recurre a buscar en el historial de mensajes.
      recovered = recoverPlanFromMessages(log)
      if (recovered) {
        logForDebugging(
          `Plan recovered from message history, ${recovered.length} chars`,
        )
      }
    }

    if (recovered) {
      try {
        await writeFile(planPath, recovered, { encoding: 'utf-8' })
        return true
      } catch (writeError) {
        logError(writeError)
        return false
      }
    }
    logForDebugging(
      'Plan file recovery failed: no file snapshot or plan content found in message history',
    )
    return false
  }
}

/**
 * Copia un archivo de plan para una sesión bifurcada. A diferencia de
 * copyPlanForResume (que reusa el slug original), esta genera un slug
 * NUEVO para la sesión bifurcada y escribe el contenido del plan
 * original en el archivo nuevo. Esto evita que la sesión original y la
 * bifurcada se pisen los archivos de plan entre sí.
 */
export async function copyPlanForFork(
  log: LogOption,
  targetSessionId: SessionId,
): Promise<boolean> {
  const originalSlug = getSlugFromLog(log)
  if (!originalSlug) {
    return false
  }

  const plansDir = getPlansDirectory()
  const originalPlanPath = join(plansDir, `${originalSlug}.md`)

  // Genera un slug nuevo para la sesión bifurcada (NO reusa el original).
  const newSlug = getPlanSlug(targetSessionId)
  const newPlanPath = join(plansDir, `${newSlug}.md`)
  try {
    await copyFile(originalPlanPath, newPlanPath)
    return true
  } catch (error) {
    if (isENOENT(error)) {
      return false
    }
    logError(error)
    return false
  }
}

/**
 * Recupera el contenido del plan del historial de mensajes. El
 * contenido del plan puede aparecer en tres formas según lo que haya
 * pasado durante la sesión:
 *
 * 1. Input del tool_use de ExitPlanMode — normalizeToolInput inyecta el
 *    contenido del plan en el input del tool_use, que persiste en el
 *    transcript.
 *
 * 2. Campo planContent en mensajes de usuario — se fija durante el flujo
 *    "limpiar contexto e implementar" cuando se aprueba ExitPlanMode.
 *
 * 3. Attachment plan_file_reference — creado por auto-compact para
 *    preservar el plan a través de los límites de compactación.
 */
function recoverPlanFromMessages(log: LogOption): string | null {
  for (let i = log.messages.length - 1; i >= 0; i--) {
    const msg = log.messages[i]
    if (!msg) {
      continue
    }

    if (msg.type === 'assistant') {
      const content = msg.message?.content
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block.type === 'tool_use' &&
            block.name === EXIT_PLAN_MODE_V2_TOOL_NAME
          ) {
            const plan = block.input?.plan
            if (typeof plan === 'string' && plan.length > 0) {
              return plan
            }
          }
        }
      }
    }

    if (msg.type === 'user') {
      if (
        typeof msg.planContent === 'string' &&
        msg.planContent.length > 0
      ) {
        return msg.planContent
      }
    }

    if (msg.type === 'attachment') {
      if (msg.attachment?.type === 'plan_file_reference') {
        const plan = msg.attachment.planContent
        if (typeof plan === 'string' && plan.length > 0) {
          return plan
        }
      }
    }
  }
  return null
}

/**
 * Encuentra una entrada de archivo en el mensaje de sistema
 * file-snapshot más reciente del transcript. Escanea hacia atrás para
 * encontrar el snapshot más nuevo.
 */
function findFileSnapshotEntry(
  messages: LogOption['messages'],
  key: string,
): { key: string; path: string; content: string } | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.type === 'system' && msg.subtype === 'file_snapshot' && msg.snapshotFiles) {
      return msg.snapshotFiles.find(f => f.key === key)
    }
  }
  return undefined
}

/**
 * Persiste un snapshot de los archivos de sesión (plan, todos) al
 * transcript. Se llama incrementalmente cada vez que estos archivos
 * cambian. Sólo está activo en sesiones remotas (CCR), donde los
 * archivos locales no persisten entre sesiones.
 */
export async function persistFileSnapshotIfRemote(): Promise<void> {
  if (getEnvironmentKind() === null) {
    return
  }
  try {
    const snapshotFiles: Array<{
      key: string
      path: string
      content: string
    }> = []

    // Snapshot del archivo de plan.
    const plan = getPlan()
    if (plan) {
      snapshotFiles.push({
        key: 'plan',
        path: getPlanFilePath(),
        content: plan,
      })
    }

    if (snapshotFiles.length === 0) {
      return
    }

    const message = {
      type: 'system',
      subtype: 'file_snapshot',
      content: 'File snapshot',
      level: 'info',
      isMeta: true,
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
      snapshotFiles,
    }

    // `recordTranscript` no existe todavía en el porte parcial de
    // `./sessionStorage.js` de este árbol (ver docstring del archivo) —
    // la llamada revienta con TypeError, capturado por el catch de
    // afuera. Ese es el comportamiento observado y el que se prueba.
    const { recordTranscript } = (await import('./sessionStorage.js')) as {
      recordTranscript: (messages: unknown[]) => Promise<void>
    }
    await recordTranscript([message])
  } catch (error) {
    logError(error)
  }
}
