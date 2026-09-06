/**
 * Puerto de `ccnmt: packages/storage/src/sessionPaths.ts` (90 líneas
 * fuente). Módulo hoja: helpers de ruta para el almacenamiento de sesión
 * en JSONL. Extraído en la fuente de `sessionStorage.ts` (#132) para que
 * quien sólo necesite calcular rutas no arrastre el barril completo de
 * ~5K líneas.
 *
 * Cuatro dependencias hermanas ausentes del árbol, reimplementadas aquí:
 *
 *  - `getOriginalCwd`/`getSessionId`/`getSessionProjectDir`
 *    (`@claude-code-how-works/app-host/bootstrap/state.js`) — la fuente
 *    los lee de un `STATE` global mutable. Se reimplementan como el MISMO
 *    contrato reducido a sus campos relevantes: `originalCwd` (string,
 *    `process.cwd()` por defecto, mutable via `setOriginalCwd` — nombre
 *    real de la fuente, no un shim de test) y `sessionProjectDir` (string
 *    | null, `null` por defecto, mutable via `setSessionProjectDir` —
 *    ídem). `getSessionId` se reimplementa memoizado por proceso
 *    (`randomUUID()` en el primer uso) — fiel al contrato que TODOS los
 *    consumidores de este archivo asumen ("estable durante la sesión"),
 *    sin la semántica de regeneración en `/clear` (`regenerateSessionId`),
 *    que ningún test de este pase ejercita. Se expone `setSessionId` para
 *    los tests y para los demás módulos de esta misma tanda que necesiten
 *    sincronizar el mismo id de sesión (ver `sessionEnvironment.ts`,
 *    `agentMetadata.ts`, `task/diskOutput.ts` — todos importan el
 *    `getSessionId` de ESTE archivo, no reimplementan el suyo, para que
 *    los cuatro compartan un mismo id dentro del mismo proceso).
 *  - `getClaudeConfigHomeDir` (`@claude-code-how-works/config/env/utils`)
 *    — fiel: `$CLAUDE_CONFIG_DIR` o `~/.claude`, NFC-normalizado. Mismo
 *    cuerpo que ya usa `projectPurge.ts` de este paquete (duplicado a
 *    propósito — cada archivo es dueño exclusivo de sus símbolos en este
 *    pase, ver la convención de aislamiento de working tree).
 *  - `AgentId` (`@claude-code-how-works/agent/idTypes`) — el paquete
 *    `agent` YA importa de `storage` en este árbol (dirección canónica);
 *    importar el tipo en sentido inverso reabriría el ciclo que esa regla
 *    prohíbe (mismo razonamiento que documenta `projectPurge.ts` para
 *    `getTasksDir`/`sanitizePathComponent`). Se usa un alias local
 *    `type AgentId = string`.
 *
 * `sanitizePath` SÍ se reusa de verdad: se importa de
 * `./sessionStoragePortable.js`, hermano YA portado en este árbol — no se
 * duplica su cuerpo aquí.
 *
 * `memoize` (`lodash-es/memoize.js` en la fuente, un `Map` sin límite de
 * tamaño) NO se instala como dependencia nueva — se usa en su lugar
 * `memoizeWithLRU` de `./internal/pendingCrossPackageDeps.js` (ya presente
 * en este paquete, Map-LRU acotado a 100 entradas en vez de ilimitado;
 * ningún test de este pase necesita más de un puñado de cwds distintos).
 */
import { randomUUID } from 'crypto'
import { homedir } from 'os'
import { join } from 'path'
import { memoizeWithLRU } from './internal/pendingCrossPackageDeps.js'
import { sanitizePath } from './sessionStoragePortable.js'

type AgentId = string

// ---------------------------------------------------------------------------
// Sustitutos de `app-host/bootstrap/state.js` — ver docstring del archivo.
// ---------------------------------------------------------------------------

function getClaudeConfigHomeDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize(
    'NFC',
  )
}

let _originalCwd: string | undefined
export function getOriginalCwd(): string {
  if (_originalCwd === undefined) _originalCwd = process.cwd()
  return _originalCwd
}

/** Nombre real de la fuente (`app-host/bootstrap/state.js`) — no es un
 * setter de sólo-test: EnterWorktreeTool lo llama al cambiar de worktree. */
export function setOriginalCwd(cwd: string): void {
  _originalCwd = cwd
}

let _sessionId: string | undefined
export function getSessionId(): string {
  if (_sessionId === undefined) _sessionId = randomUUID()
  return _sessionId
}

/** Nombre real de la fuente — `regenerateSessionId` la reemplaza en
 * `/clear`; aquí se expone directo, sin la reasignación de
 * `parentSessionId` que esta reimplementación no modela. */
export function setSessionId(id: string): void {
  _sessionId = id
}

let _sessionProjectDir: string | null = null
export function getSessionProjectDir(): string | null {
  return _sessionProjectDir
}

/** Fijado por `switchActiveSession` en la fuente al reanudar/bifurcar una
 * sesión — aquí, un campo mutable simple con el mismo contrato. */
export function setSessionProjectDir(dir: string | null): void {
  _sessionProjectDir = dir
}

// ---------------------------------------------------------------------------
// El módulo real — porte fiel.
// ---------------------------------------------------------------------------

export function getProjectsDir(): string {
  return join(getClaudeConfigHomeDir(), 'projects')
}

// Memoizado: se llama 12+ veces por turno vía hooks.ts createBaseHookInput
// (ruta PostToolUse, 5×/turno) + varias funciones save*. La entrada es un
// string de cwd; homedir/env/regex son invariantes de sesión, así que el
// resultado es estable para una entrada dada. Los cambios de worktree sólo
// cambian la llave — no hace falta limpiar el caché.
export const getProjectDir = memoizeWithLRU(
  (projectDir: string): string => {
    return join(getProjectsDir(), sanitizePath(projectDir))
  },
  projectDir => projectDir,
  100,
)

export function getTranscriptPath(): string {
  const projectDir = getSessionProjectDir() ?? getProjectDir(getOriginalCwd())
  return join(projectDir, `${getSessionId()}.jsonl`)
}

/**
 * Resuelve la ruta JSONL para un id de sesión arbitrario. Para la sesión
 * ACTUAL respeta sessionProjectDir (fijado por switchActiveSession al
 * reanudar/bifurcar) — igual que getTranscriptPath(). Sin esto, los hooks
 * reciben un transcript_path calculado desde originalCwd mientras el
 * archivo real se escribió en sessionProjectDir, así que el hook ve
 * MISSING (gh-30217).
 *
 * Para OTROS ids de sesión sólo se puede adivinar vía originalCwd — no se
 * rastrea un mapa sessionId→projectDir. Quien quiera la ruta de otra
 * sesión concreta debería pasar el fullPath explícito (la mayoría de las
 * funciones save* ya lo aceptan).
 */
export function getTranscriptPathForSession(sessionId: string): string {
  if (sessionId === getSessionId()) {
    return getTranscriptPath()
  }
  const projectDir = getProjectDir(getOriginalCwd())
  return join(projectDir, `${sessionId}.jsonl`)
}

// 50 MB — el JSONL de sesión puede crecer a varios GB (inc-3930). Quien lea
// el transcript crudo debe abortar por encima de este umbral para evitar OOM.
export const MAX_TRANSCRIPT_READ_BYTES = 50 * 1024 * 1024

// Mapa en memoria de agentId → subdirectorio, para agrupar transcripts de
// subagentes relacionados (p. ej. las corridas de workflow escriben en
// subagents/workflows/<runId>/). Se puebla antes de correr el agente; lo
// consulta getAgentTranscriptPath.
const agentTranscriptSubdirs = new Map<string, string>()

export function setAgentTranscriptSubdir(
  agentId: string,
  subdir: string,
): void {
  agentTranscriptSubdirs.set(agentId, subdir)
}

export function clearAgentTranscriptSubdir(agentId: string): void {
  agentTranscriptSubdirs.delete(agentId)
}

export function getAgentTranscriptPath(agentId: AgentId): string {
  // Misma consistencia con sessionProjectDir que getTranscriptPathForSession
  // — los transcripts de subagentes viven bajo el directorio de sesión, así
  // que si el transcript de sesión está en sessionProjectDir, los de
  // subagentes también.
  const projectDir = getSessionProjectDir() ?? getProjectDir(getOriginalCwd())
  const sessionId = getSessionId()
  const subdir = agentTranscriptSubdirs.get(agentId)
  const base = subdir
    ? join(projectDir, sessionId, 'subagents', subdir)
    : join(projectDir, sessionId, 'subagents')
  return join(base, `agent-${agentId}.jsonl`)
}
