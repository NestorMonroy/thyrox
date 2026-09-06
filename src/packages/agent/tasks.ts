/**
 * Porte de `ccnmt: packages/agent/tasks.ts` — el almacén de tareas
 * (`TaskCreate`/`TaskUpdate`/`TaskList`/`TaskGet`), su esquema Zod y el
 * grafo de dependencias `blocks`/`blockedBy` con deteccion de ciclos.
 *
 * La fuente tiene 850 lineas y once dependencias de paquetes hermanos del
 * monorepo `ccnmt` (`@claude-code-how-works/*`) que este arbol NO tiene:
 * `app-host`, `local-observability`, `config`, `tool-registry`, `storage`,
 * `swarm`. Ninguno de esos paquetes viaja con el porte, asi que las piezas
 * que consumian son la parte declarada como NO portada o reimplementada:
 *
 * NO PORTADO (depende de `app-host`/`swarm`, y ningun test de este arbol
 * los ejercita):
 *   - `setLeaderTeamName` / `clearLeaderTeamName` — set/clear del nombre de
 *     equipo del lider (via `swarm/teammateState.js`).
 *   - la resolucion por equipo de `getTaskListId()` (via
 *     `swarm/teammateContext.js` + `app-host/bootstrap/state.js`); esta
 *     version resuelve solo por `CLAUDE_CODE_TASK_LIST_ID` o el id explicito
 *     que el llamador pase.
 *   - `isTodoV2Enabled()` — depende de `getIsNonInteractiveSession()`.
 *   - `resetTaskList()`, `claimTask()`/`claimTaskWithBusyCheck()` y sus
 *     tipos `ClaimTaskResult`/`ClaimTaskOptions` — ningun test los ejercita
 *     y dependen del mismo sustrato ausente.
 *
 * REIMPLEMENTADO LOCALMENTE (la logica es trivial; no amerita traer una
 * dependencia externa para 3-10 lineas cada una):
 *   - `lazySchema` (memoiza la construccion del schema Zod al primer uso;
 *     `tool-registry/utils/lazySchema.ts`, 4 lineas).
 *   - `getClaudeConfigHomeDir` — la fuente la memoiza con `lodash-es`
 *     keyed por `CLAUDE_CONFIG_DIR`; aqui se lee el env var en cada
 *     llamada (sin memo: es una optimizacion de performance, no de
 *     comportamiento, y el valor puede cambiar entre tests).
 *   - `errorMessage` / `getErrnoCode` (`local-observability/errorHelpers.ts`).
 *   - `jsonParse` / `jsonStringify` — la fuente envuelve `JSON.parse`/
 *     `JSON.stringify` en un medidor de operaciones lentas
 *     (`slowLogging`); aqui son el `JSON.parse`/`stringify` desnudo, sin
 *     la instrumentacion de performance.
 *   - `logForDebugging` / `logError` — no-ops locales (la fuente enruta a
 *     un logger de diagnostico que este arbol no tiene).
 *   - una senal minima (equivalente a `config/signal.ts::createSignal`,
 *     18 lineas) para `onTasksUpdated`/`notifyTasksUpdated`.
 *   - el candado por lista/tarea: la fuente usa `proper-lockfile`
 *     (bloqueo real entre PROCESOS, via `storage/lockfile.ts`). Este
 *     arbol no declara esa dependencia. Se reimplementa como un mutex
 *     asincrono EN PROCESO, indexado por ruta — suficiente para serializar
 *     las llamadas concurrentes dentro de un mismo `bun test`, que es todo
 *     lo que los tests de este arbol ejercitan (no hay multi-proceso).
 *     Diferencia declarada: dos procesos distintos de este puerto SI
 *     podrian pisarse — la fuente no.
 */
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'
import { TaskCycleError } from './errors.ts'

// ---------------------------------------------------------------------------
// Reimplementaciones locales de utilidades de paquetes hermanos ausentes.
// ---------------------------------------------------------------------------

/** ≙ `tool-registry/utils/lazySchema.ts` — memoiza la construccion al primer uso. */
function lazySchema<T>(factory: () => T): () => T {
  let cached: T | undefined
  return () => (cached ??= factory())
}

/** ≙ `config/env/utils.ts::getClaudeConfigHomeDir`, sin la memoizacion de lodash. */
function getClaudeConfigHomeDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize('NFC')
}

/** ≙ `local-observability/errorHelpers.ts::errorMessage`. */
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** ≙ `local-observability/errorHelpers.ts::getErrnoCode`. */
function getErrnoCode(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') {
    return (e as { code: string }).code
  }
  return undefined
}

/** ≙ `local-observability/slowOperations.ts::jsonParse`, sin el medidor de lentitud. */
function jsonParse(text: string): unknown {
  return JSON.parse(text)
}

/** ≙ `local-observability/slowOperations.ts::jsonStringify`, sin el medidor de lentitud. */
function jsonStringify(value: unknown, space?: string | number): string {
  return JSON.stringify(value, null, space)
}

/** No-op local — la fuente enruta a un logger de diagnostico ausente aqui. */
function logForDebugging(_message: string): void {}

/** No-op local — igual que `logForDebugging`. */
function logError(_e: unknown): void {}

/** ≙ `config/signal.ts::createSignal`, sin argumentos tipados por posicion. */
function createSignal(): { subscribe: (fn: () => void) => () => void; emit: () => void } {
  const listeners = new Set<() => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit() {
      for (const listener of listeners) listener()
    },
  }
}

/**
 * Mutex asincrono en proceso, indexado por ruta — reemplaza a
 * `proper-lockfile` (candado real entre procesos) por uno que solo
 * serializa promesas dentro de este mismo proceso. Ver la divergencia
 * declarada en el docstring del modulo.
 */
const inProcessLocks = new Map<string, Promise<void>>()

async function acquireLock(lockPath: string): Promise<() => Promise<void>> {
  const previous = inProcessLocks.get(lockPath) ?? Promise.resolve()
  let releaseFn: () => void = () => {}
  const gate = new Promise<void>(resolve => {
    releaseFn = resolve
  })
  inProcessLocks.set(
    lockPath,
    previous.then(() => gate),
  )
  await previous
  return async () => {
    releaseFn()
  }
}

// ---------------------------------------------------------------------------
// Senal de actualizacion de la lista de tareas.
// ---------------------------------------------------------------------------

const tasksUpdated = createSignal()

/**
 * Nombre de equipo fijado por el lider al crear un equipo.
 * Lo usa `getTaskListId()` para que las tareas del lider se guarden bajo el
 * nombre de equipo (haciendo juego con donde los compañeros tmux/iTerm2
 * tambien resuelven), en vez de bajo el ID de sesion.
 */
let leaderTeamName: string | undefined

/**
 * Fija el nombre de equipo del lider para la resolucion de la lista de
 * tareas. Lo llama `TeamCreateTool` cuando se crea un equipo.
 */
export function setLeaderTeamName(teamName: string): void {
  if (leaderTeamName === teamName) return
  leaderTeamName = teamName
  notifyTasksUpdated()
}

/** Limpia el nombre de equipo del lider. Se llama al borrar un equipo. */
export function clearLeaderTeamName(): void {
  if (leaderTeamName === undefined) return
  leaderTeamName = undefined
  notifyTasksUpdated()
}

/**
 * Registra un listener a llamar cuando las tareas se actualizan en este
 * proceso. Devuelve una funcion para des-suscribirse.
 */
export const onTasksUpdated = tasksUpdated.subscribe

/**
 * Notifica a los listeners que las tareas se actualizaron.
 * Envuelve el emit en try/catch para que un fallo de listener nunca se
 * propague al llamador (las mutaciones de tarea deben tener exito desde
 * la perspectiva de quien llama).
 */
export function notifyTasksUpdated(): void {
  try {
    tasksUpdated.emit()
  } catch {
    // Se ignoran los errores del listener — la mutacion no debe fallar
    // por un problema de notificacion.
  }
}

export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const

export const TaskStatusSchema = lazySchema(() =>
  z.enum(['pending', 'in_progress', 'completed']),
)
export type TaskStatus = z.infer<ReturnType<typeof TaskStatusSchema>>

export const TaskSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    subject: z.string(),
    description: z.string(),
    activeForm: z.string().optional(), // forma en gerundio para el spinner (p.ej. "Corriendo tests")
    owner: z.string().optional(), // ID de agente
    status: TaskStatusSchema(),
    blocks: z.array(z.string()), // IDs de tarea que esta tarea bloquea
    blockedBy: z.array(z.string()), // IDs de tarea que bloquean a esta
    metadata: z.record(z.string(), z.unknown()).optional(), // metadata arbitraria
  }),
)
export type Task = z.infer<ReturnType<typeof TaskSchema>>

// Nombre del archivo de marca de agua alta — guarda el ID de tarea maximo
// jamas asignado.
const HIGH_WATER_MARK_FILE = '.highwatermark'

function getHighWaterMarkPath(taskListId: string): string {
  return join(getTasksDir(taskListId), HIGH_WATER_MARK_FILE)
}

async function readHighWaterMark(taskListId: string): Promise<number> {
  const path = getHighWaterMarkPath(taskListId)
  try {
    const content = (await readFile(path, 'utf-8')).trim()
    const value = parseInt(content, 10)
    return isNaN(value) ? 0 : value
  } catch {
    return 0
  }
}

async function writeHighWaterMark(taskListId: string, value: number): Promise<void> {
  const path = getHighWaterMarkPath(taskListId)
  await writeFile(path, String(value))
}

/**
 * Obtiene el ID de la lista de tareas segun el contexto actual.
 * Prioridad (version portada — ver la divergencia declarada arriba):
 * 1. `CLAUDE_CODE_TASK_LIST_ID` — ID de lista de tareas explicito.
 * 2. Nombre de equipo del lider — fijado al crear un equipo via TeamCreate.
 */
export function getTaskListId(): string {
  const taskListId = process.env.CLAUDE_CODE_TASK_LIST_ID
  if (taskListId) {
    return taskListId
  }
  if (leaderTeamName) {
    return leaderTeamName
  }
  throw new Error(
    'getTaskListId(): no hay CLAUDE_CODE_TASK_LIST_ID ni equipo de lider — ' +
      'la resolucion por sesion/equipo no se porto (ver docstring del modulo).',
  )
}

/**
 * Sanitiza una cadena para uso seguro en rutas de archivo.
 * Elimina caracteres de traversal de ruta y otros caracteres potencialmente
 * peligrosos. Solo permite alfanumericos, guiones y guiones bajos.
 */
export function sanitizePathComponent(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '-')
}

export function getTasksDir(taskListId: string): string {
  return join(getClaudeConfigHomeDir(), 'tasks', sanitizePathComponent(taskListId))
}

export function getTaskPath(taskListId: string, taskId: string): string {
  return join(getTasksDir(taskListId), `${sanitizePathComponent(taskId)}.json`)
}

export async function ensureTasksDir(taskListId: string): Promise<void> {
  const dir = getTasksDir(taskListId)
  try {
    await mkdir(dir, { recursive: true })
  } catch {
    // El directorio ya existe o la creacion fallo; los llamadores
    // subsiguientes veran el error si es real.
  }
}

/**
 * Encuentra el ID de tarea mas alto entre los archivos de tarea existentes
 * (sin contar la marca de agua alta).
 */
async function findHighestTaskIdFromFiles(taskListId: string): Promise<number> {
  const dir = getTasksDir(taskListId)
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return 0
  }
  let highest = 0
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue
    }
    const taskId = parseInt(file.replace('.json', ''), 10)
    if (!isNaN(taskId) && taskId > highest) {
      highest = taskId
    }
  }
  return highest
}

/**
 * Encuentra el ID de tarea mas alto jamas asignado, considerando tanto los
 * archivos existentes como la marca de agua alta (para tareas borradas/reset).
 */
async function findHighestTaskId(taskListId: string): Promise<number> {
  const [fromFiles, fromMark] = await Promise.all([
    findHighestTaskIdFromFiles(taskListId),
    readHighWaterMark(taskListId),
  ])
  return Math.max(fromFiles, fromMark)
}

/**
 * Obtiene la ruta del archivo de candado de una lista de tareas (para el
 * candado a nivel de lista).
 */
function getTaskListLockPath(taskListId: string): string {
  return join(getTasksDir(taskListId), '.lock')
}

/** Asegura que exista el archivo de candado de una lista de tareas. */
async function ensureTaskListLockFile(taskListId: string): Promise<string> {
  await ensureTasksDir(taskListId)
  const lockPath = getTaskListLockPath(taskListId)
  try {
    await writeFile(lockPath, '', { flag: 'wx' })
  } catch {
    // EEXIST u otro — el archivo ya existe, lo cual esta bien.
  }
  return lockPath
}

/**
 * Crea una tarea nueva con un ID unico.
 * Usa el candado de lista para evitar condiciones de carrera cuando varios
 * procesos crean tareas de forma concurrente.
 */
export async function createTask(
  taskListId: string,
  taskData: Omit<Task, 'id'>,
): Promise<string> {
  const lockPath = await ensureTaskListLockFile(taskListId)
  const release = await acquireLock(lockPath)
  try {
    const highestId = await findHighestTaskId(taskListId)
    const id = String(highestId + 1)
    const task: Task = { id, ...taskData }
    const path = getTaskPath(taskListId, id)
    await writeFile(path, jsonStringify(task, 2))
    notifyTasksUpdated()
    return id
  } finally {
    await release()
  }
}

export async function getTask(taskListId: string, taskId: string): Promise<Task | null> {
  const path = getTaskPath(taskListId, taskId)
  try {
    const content = await readFile(path, 'utf-8')
    const data = jsonParse(content)
    const parsed = TaskSchema().safeParse(data)
    if (!parsed.success) {
      logForDebugging(`[Tasks] Task ${taskId} failed schema validation: ${parsed.error.message}`)
      return null
    }
    return parsed.data
  } catch (e) {
    const code = getErrnoCode(e)
    if (code === 'ENOENT') {
      return null
    }
    logForDebugging(`[Tasks] Failed to read task ${taskId}: ${errorMessage(e)}`)
    logError(e)
    return null
  }
}

// Interno: sin candado propio. Los llamadores que ya tienen el candado de
// `taskPath` (o de la lista) deben usar esta variante para evitar deadlock
// (blockTask, la cascada de deleteTask, etc.).
async function updateTaskUnsafe(
  taskListId: string,
  taskId: string,
  updates: Partial<Omit<Task, 'id'>>,
): Promise<Task | null> {
  const existing = await getTask(taskListId, taskId)
  if (!existing) {
    return null
  }
  const updated: Task = { ...existing, ...updates, id: taskId }
  const path = getTaskPath(taskListId, taskId)
  await writeFile(path, jsonStringify(updated, 2))
  notifyTasksUpdated()
  return updated
}

export async function updateTask(
  taskListId: string,
  taskId: string,
  updates: Partial<Omit<Task, 'id'>>,
): Promise<Task | null> {
  const path = getTaskPath(taskListId, taskId)

  // Se verifica existencia antes de tomar el candado — un candado sobre un
  // archivo inexistente es un caso limpio que queremos resolver como null.
  const taskBeforeLock = await getTask(taskListId, taskId)
  if (!taskBeforeLock) {
    return null
  }

  const release = await acquireLock(path)
  try {
    return await updateTaskUnsafe(taskListId, taskId, updates)
  } finally {
    await release()
  }
}

/**
 * Borra una tarea y elimina las referencias a ella desde las aristas de
 * las demas tareas.
 *
 * Toda la operacion corre bajo el candado de la lista, para que un
 * createTask concurrente no pueda reusar este taskId a mitad de la
 * cascada y terminar con las entradas blocks/blockedBy que estabamos por
 * scrubbear. Las escrituras de la cascada usan updateTaskUnsafe (el
 * candado de lista ya las serializa; anidar candados por tarea aqui
 * produciria deadlock contra blockTask/claimTaskWithBusyCheck).
 */
export async function deleteTask(taskListId: string, taskId: string): Promise<boolean> {
  const path = getTaskPath(taskListId, taskId)
  const lockPath = await ensureTaskListLockFile(taskListId)

  const release = await acquireLock(lockPath)
  try {
    // Se actualiza la marca de agua alta antes de borrar, para prevenir
    // la reutilizacion del ID.
    const numericId = parseInt(taskId, 10)
    if (!isNaN(numericId)) {
      const currentMark = await readHighWaterMark(taskListId)
      if (numericId > currentMark) {
        await writeHighWaterMark(taskListId, numericId)
      }
    }

    try {
      await unlink(path)
    } catch (e) {
      const code = getErrnoCode(e)
      if (code === 'ENOENT') {
        return false
      }
      throw e
    }

    // Cascada: elimina las referencias a esta tarea de blocks/blockedBy
    // de las demas. Las lecturas + escrituras ocurren bajo el mismo
    // candado, asi que no hay ventana donde una operacion de grafo vea a
    // la tarea borrada como todavia referenciada.
    const allTasks = await listTasks(taskListId)
    for (const task of allTasks) {
      const newBlocks = task.blocks.filter(id => id !== taskId)
      const newBlockedBy = task.blockedBy.filter(id => id !== taskId)
      if (
        newBlocks.length !== task.blocks.length ||
        newBlockedBy.length !== task.blockedBy.length
      ) {
        await updateTaskUnsafe(taskListId, task.id, {
          blocks: newBlocks,
          blockedBy: newBlockedBy,
        })
      }
    }

    notifyTasksUpdated()
    return true
  } catch (error) {
    logForDebugging(`[Tasks] Failed to delete task ${taskId}: ${errorMessage(error)}`)
    return false
  } finally {
    await release()
  }
}

export async function listTasks(taskListId: string): Promise<Task[]> {
  const dir = getTasksDir(taskListId)
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }
  const taskIds = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  const results = await Promise.all(taskIds.map(id => getTask(taskListId, id)))
  return results.filter((t): t is Task => t !== null)
}

/**
 * Registra que `fromTaskId` bloquea a `toTaskId` — es decir, `from` debe
 * completarse antes de que `to` pueda reclamarse. Mantiene el invariante
 * bipartito `from.blocks ∋ to ⟺ to.blockedBy ∋ from` de forma atomica y
 * rechaza aristas que crearian un ciclo en el grafo de dependencias.
 *
 * Atomicidad: ambas escrituras ocurren bajo el candado de la lista para
 * que un blockTask() concurrente no pueda ver solo la mitad de la arista
 * y sobrescribirla.
 *
 * Deteccion de ciclos: camina `.blocks` desde `to` buscando `from`. Si se
 * encuentra, agregar la arista formaria `from → to → ... → from`, lo que
 * produce un interbloqueo en claimTask (cada tarea del ciclo esta
 * blockedBy otra tarea sin resolver del mismo ciclo). Lanza
 * `TaskCycleError` con el camino ofensor.
 *
 * El auto-ciclo (`from === to`) es el caso degenerado y se rechaza de
 * forma temprana.
 *
 * Devuelve `false` solo cuando falta una de las tareas. Los intentos de
 * ciclo lanzan — son errores de programador, no "no se puede alcanzar
 * este estado".
 */
export async function blockTask(
  taskListId: string,
  fromTaskId: string,
  toTaskId: string,
): Promise<boolean> {
  if (fromTaskId === toTaskId) {
    throw new TaskCycleError([fromTaskId, toTaskId])
  }

  const lockPath = await ensureTaskListLockFile(taskListId)
  const release = await acquireLock(lockPath)
  try {
    // Se relee dentro del candado — un createTask/updateTask concurrente
    // pudo haber cambiado el grafo entre la vista del llamador y ahora.
    const allTasks = await listTasks(taskListId)
    const byId = new Map(allTasks.map(t => [t.id, t]))
    const fromTask = byId.get(fromTaskId)
    const toTask = byId.get(toTaskId)
    if (!fromTask || !toTask) {
      return false
    }

    // Arista ya presente: no-op idempotente (se verifica igual la
    // direccion inversa abajo; si solo un lado esta registrado, es un
    // grafo obsoleto que queremos reparar).
    const hasForward = fromTask.blocks.includes(toTaskId)
    const hasReverse = toTask.blockedBy.includes(fromTaskId)
    if (hasForward && hasReverse) {
      return true
    }

    // Deteccion de ciclos: desde `toTaskId`, camina cada tarea que
    // bloquea (y las que esas bloquean, transitivamente). Si se alcanza
    // `fromTaskId`, agregar la arista nueva cerraria el bucle.
    const visited = new Set<string>()
    const walk = (start: string): string[] | null => {
      const stack: Array<{ id: string; path: string[] }> = [{ id: start, path: [start] }]
      while (stack.length > 0) {
        const { id, path } = stack.pop()!
        if (id === fromTaskId) {
          return [fromTaskId, ...path]
        }
        if (visited.has(id)) continue
        visited.add(id)
        const node = byId.get(id)
        if (!node) continue
        for (const next of node.blocks) {
          stack.push({ id: next, path: [...path, next] })
        }
      }
      return null
    }
    const cyclePath = walk(toTaskId)
    if (cyclePath) {
      throw new TaskCycleError(cyclePath)
    }

    // Escritura dual atomica mientras se sigue reteniendo el candado de
    // lista. Se usa updateTaskUnsafe porque el llamador ya serializo via
    // el candado de lista; anidar candados por tarea aqui produciria
    // deadlock contra cualquier llamador (claimTaskWithBusyCheck, la
    // cascada de deleteTask) que los tome en otro orden.
    if (!hasForward) {
      await updateTaskUnsafe(taskListId, fromTaskId, {
        blocks: [...fromTask.blocks, toTaskId],
      })
    }
    if (!hasReverse) {
      await updateTaskUnsafe(taskListId, toTaskId, {
        blockedBy: [...toTask.blockedBy, fromTaskId],
      })
    }
    return true
  } finally {
    await release()
  }
}

/**
 * Encadena un evento de completado de tarea a traves del grafo de
 * dependencias.
 *
 * Elimina `completedTaskId` de la `blockedBy` de cada otra tarea,
 * manteniendo el invariante bipartito honesto al momento de escribir.
 * Devuelve los IDs de las tareas cuyo `blockedBy` quedo vacio como
 * resultado directo — los llamadores (TaskUpdateTool) pueden usar esto
 * para despertar a compañeros ociosos con un mensaje de buzon
 * `task_unblocked`.
 *
 * Sin esta cascada, los IDs de tarea completada se acumulan para siempre
 * en el `blockedBy` de otras tareas; el filtro del lado de lectura en
 * claimTask tapa el sintoma pero la salida de TaskGet sigue mostrando
 * dependencias fantasma.
 *
 * Corre bajo el candado de la lista para que dos completados
 * concurrentes no puedan leer el mismo `blockedBy` y pisarse la
 * eliminacion.
 */
export async function cascadeUnblockOnCompletion(
  taskListId: string,
  completedTaskId: string,
): Promise<{ newlyUnblockedIds: string[] }> {
  const lockPath = await ensureTaskListLockFile(taskListId)
  const release = await acquireLock(lockPath)
  try {
    const allTasks = await listTasks(taskListId)

    // Tareas que esperaban a `completedTaskId`. Solo se verifica
    // .blockedBy: el invariante bipartito garantiza que cualquier cosa
    // presente aqui tambien tiene la arista simetrica .blocks desde la
    // tarea completada — pero si blockTask tuvo un bug en el pasado, se
    // scrubbea ambos lados por seguridad.
    const newlyUnblockedIds: string[] = []
    for (const task of allTasks) {
      const idx = task.blockedBy.indexOf(completedTaskId)
      if (idx === -1) continue

      const newBlockedBy = task.blockedBy.filter(id => id !== completedTaskId)
      await updateTaskUnsafe(taskListId, task.id, { blockedBy: newBlockedBy })
      // Se registran las tareas que quedaron completamente desbloqueadas
      // (sin otras dependencias abiertas).
      if (newBlockedBy.length === 0 && task.status !== 'completed') {
        newlyUnblockedIds.push(task.id)
      }
    }

    // Tambien se scrubbea la propia lista .blocks de la tarea completada
    // (esas IDs ahora son referencias obsoletas — la cascada acaba de
    // eliminar las entradas simetricas del otro lado).
    const completed = allTasks.find(t => t.id === completedTaskId)
    if (completed && completed.blocks.length > 0) {
      await updateTaskUnsafe(taskListId, completedTaskId, { blocks: [] })
    }

    return { newlyUnblockedIds }
  } finally {
    await release()
  }
}

export const DEFAULT_TASKS_MODE_TASK_LIST_ID = 'tasklist'
