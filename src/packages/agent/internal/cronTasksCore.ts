/**
 * Porte COMPLETO de `ccnmt: packages/agent/internal/cronTasksCore.ts`.
 *
 * Tareas agendadas, guardadas en `<proyecto>/.claude/scheduled_tasks.json`.
 * Vienen en dos sabores: one-shot (`recurring: false`/`undefined`) —
 * disparan una vez y se auto-borran— y recurrentes (`recurring: true`) —
 * disparan según agenda, se reprograman desde ahora, y persisten hasta
 * borrado explícito o auto-expiración pasado
 * `DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs`.
 *
 * Antes era un porte PARCIAL, y su premisa era una sola: las ocho funciones
 * de E/S dependen de `getAgentHostBindings()`, «inexistente en este árbol».
 * Hoy es falsa — `host.ts:266` lo exporta.
 *
 * Y la pregunta que de verdad importaba no era si el símbolo existe sino si
 * da los miembros que esas ocho consultan. Los cinco están, y **ninguno vive
 * en `host.ts`**, que es donde el docstring anterior los buscaba: cuatro los
 * declara `contracts.ts` —`getProjectRoot`, `getSessionCronTasks`,
 * `addSessionCronTask`, `removeSessionCronTasks`— y `logDebug` es de
 * `host.ts`. Un grep sobre `host.ts` da cero para los cuatro **en los dos
 * árboles**: el instrumento equivocado habría confirmado el bloqueo.
 *
 * Los cinco son opcionales y se consultan con encadenado opcional más
 * respaldo, así que el porte no exige que el anfitrión los instale.
 */

import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { computeNextCronRun, parseCronExpression } from './cronCore.js'
import { getAgentHostBindings } from '../host.js'
import type { AgentFsImplementation, AgentSessionCronTask } from '../contracts.js'
import {
  isFsInaccessible,
  jsonStringify,
  safeParseJSON,
} from '../internalUtils.js'

/**
 * Los cinco bindings de cron que `contracts.ts` declara y que el subconjunto
 * local de `host.ts` aun no incluye (docstring de este archivo: son
 * opcionales, asi que el porte no exige que el anfitrion los instale). Se
 * declaran aqui, junto a quien los consume, con el mismo criterio que
 * `host.ts` ya usa para acotar su tipo a lo portado: se amplia el tipo local
 * donde el binding se necesita, no el tipo compartido de `host.ts`.
 */
type CronHostBindings = {
  getProjectRoot?: () => string
  getFsImplementation?: () => AgentFsImplementation
  getSessionCronTasks?: () => AgentSessionCronTask[]
  addSessionCronTask?: (task: AgentSessionCronTask) => void
  removeSessionCronTasks?: (ids: readonly string[]) => number
}

function getCronBindings(): ReturnType<typeof getAgentHostBindings> & CronHostBindings {
  return getAgentHostBindings()
}

export type CronTask = {
  id: string
  /** Cadena cron de 5 campos (hora local) — validada al escribir, revalidada al leer. */
  cron: string
  /** Prompt a encolar cuando la tarea dispara. */
  prompt: string
  /** Epoch ms de cuándo se creó la tarea. Ancla para detectar tareas perdidas. */
  createdAt: number
  /**
   * Epoch ms del disparo más reciente. Lo re-escribe el scheduler tras cada
   * disparo recurrente para que el cómputo del próximo disparo sobreviva a
   * reinicios del proceso. El scheduler ancla el primer avistamiento en
   * `lastFiredAt ?? createdAt` — una tarea que nunca disparó usa createdAt
   * (correcto para crones fijos como `30 14 27 2 *` cuyo próximo-desde-ahora
   * es el año siguiente); una tarea ya disparada reconstruye el mismo
   * `nextFireAt` que el proceso anterior tenía en memoria. Nunca se
   * establece para los one-shots (se borran al disparar).
   */
  lastFiredAt?: number
  /** Cuando es true, la tarea se reprograma tras disparar en vez de borrarse. */
  recurring?: boolean
  /**
   * Cuando es true, la tarea queda exenta de la auto-expiración por
   * recurringMaxAgeMs. Válvula de escape del sistema para las tareas
   * incorporadas del modo asistente.
   */
  permanent?: boolean
  /**
   * Flag de solo-runtime. false → limitado a la sesión (nunca se escribe a
   * disco). Las tareas respaldadas por archivo dejan esto undefined.
   */
  durable?: boolean
  /**
   * Solo-runtime. Cuando está fijado, la tarea la creó un compañero
   * (teammate) en proceso. El scheduler enruta los disparos a la cola de
   * ese compañero en vez de a la del REPL principal. Nunca se escribe a
   * disco.
   */
  agentId?: string
}

type CronFile = { tasks: CronTask[] }

const CRON_FILE_REL = join('.claude', 'scheduled_tasks.json')

/**
 * Ruta del archivo de cron. `dir` cae por defecto a `getProjectRoot()` — se
 * pasa explicito desde contextos que no arrancan por `main.tsx` (por ejemplo
 * el daemon del SDK de agentes, que no tiene estado de bootstrap).
 */
export function getCronFilePath(dir?: string): string {
  return join(dir ?? getCronBindings().getProjectRoot?.() ?? process.cwd(), CRON_FILE_REL)
}

/**
 * Lee y analiza `.claude/scheduled_tasks.json`. Devuelve una lista vacia si el
 * archivo falta, esta vacio o esta malformado. Las tareas con una cadena cron
 * invalida se descartan en silencio —se registran a nivel debug— para que una
 * sola entrada mala nunca bloquee el archivo entero.
 */
export async function readCronTasks(dir?: string): Promise<CronTask[]> {
  const bindings = getCronBindings()
  const fs = bindings.getFsImplementation?.() ?? { readFile: async (p: string, opts: { encoding: BufferEncoding }) => { const { readFile: fsReadFile } = await import('fs/promises'); return fsReadFile(p, opts) } }
  let raw: string
  try {
    raw = await fs.readFile(getCronFilePath(dir), { encoding: 'utf-8' })
  } catch (e: unknown) {
    if (isFsInaccessible(e)) return []
    bindings.logError?.(e)
    return []
  }

  const parsed = safeParseJSON(raw, false)
  if (!parsed || typeof parsed !== 'object') return []
  const file = parsed as Partial<CronFile>
  if (!Array.isArray(file.tasks)) return []

  const out: CronTask[] = []
  for (const t of file.tasks) {
    if (
      !t ||
      typeof t.id !== 'string' ||
      typeof t.cron !== 'string' ||
      typeof t.prompt !== 'string' ||
      typeof t.createdAt !== 'number'
    ) {
      getAgentHostBindings().logDebug?.(
        `[ScheduledTasks] skipping malformed task: ${jsonStringify(t)}`,
      )
      continue
    }
    if (!parseCronExpression(t.cron)) {
      getAgentHostBindings().logDebug?.(
        `[ScheduledTasks] skipping task ${t.id} with invalid cron '${t.cron}'`,
      )
      continue
    }
    out.push({
      id: t.id,
      cron: t.cron,
      prompt: t.prompt,
      createdAt: t.createdAt,
      ...(typeof t.lastFiredAt === 'number'
        ? { lastFiredAt: t.lastFiredAt }
        : {}),
      ...(t.recurring ? { recurring: true } : {}),
      ...(t.permanent ? { permanent: true } : {}),
    })
  }
  return out
}

/**
 * Comprobacion sincrona de si el archivo de cron tiene alguna tarea valida. La
 * usa `cronScheduler.start()` para decidir si auto-habilitarse. Una sola
 * lectura de archivo.
 */
export function hasCronTasksSync(dir?: string): boolean {
  let raw: string
  try {
    // eslint-disable-next-line custom-rules/no-sync-fs -- se llama una vez desde cronScheduler.start()
    raw = readFileSync(getCronFilePath(dir), 'utf-8')
  } catch {
    return false
  }
  const parsed = safeParseJSON(raw, false)
  if (!parsed || typeof parsed !== 'object') return false
  const tasks = (parsed as Partial<CronFile>).tasks
  return Array.isArray(tasks) && tasks.length > 0
}

/**
 * Sobreescribe `.claude/scheduled_tasks.json` con las tareas dadas. Crea
 * `.claude/` si falta. Una lista vacia escribe un archivo vacio —en vez de
 * borrarlo— para que el observador de archivos vea un evento de cambio al
 * retirarse la ultima tarea.
 */
export async function writeCronTasks(
  tasks: CronTask[],
  dir?: string,
): Promise<void> {
  const root = dir ?? getCronBindings().getProjectRoot?.() ?? process.cwd()
  await mkdir(join(root, '.claude'), { recursive: true })
  // Se retira la bandera `durable`, que solo vive en tiempo de ejecucion: todo
  // lo que esta en disco es durable por definicion, y dejarla fuera hace que
  // `readCronTasks()` devuelva `durable: undefined` sin tener que fijarlo.
  const body: CronFile = {
    tasks: tasks.map(({ durable: _durable, ...rest }) => rest),
  }
  await writeFile(
    getCronFilePath(root),
    jsonStringify(body, null, 2) + '\n',
    'utf-8',
  )
}

/**
 * Agrega una tarea al final. Devuelve el id generado. Quien llama es
 * responsable de haber validado ya la cadena cron (la herramienta lo hace con
 * `validateInput`).
 *
 * Cuando `durable` es `false` la tarea se guarda solo en memoria del proceso
 * (`bootstrap/state.ts`): dispara segun agenda en esta sesion, nunca se
 * escribe en `.claude/scheduled_tasks.json` y muere con el proceso. El
 * planificador mezcla las tareas de sesion en su bucle directamente, asi que
 * no hace falta ningun evento de cambio de archivo.
 */
export async function addCronTask(
  cron: string,
  prompt: string,
  recurring: boolean,
  durable: boolean,
  agentId?: string,
): Promise<string> {
  // Id corto — 8 caracteres hexadecimales sobran para MAX_JOBS=50, y evitan
  // el malabarismo de recorte y prefijo entre la capa de herramienta —que
  // muestra ids cortos— y el disco.
  const id = randomUUID().slice(0, 8)
  const task = {
    id,
    cron,
    prompt,
    createdAt: Date.now(),
    ...(recurring ? { recurring: true } : {}),
  }
  if (!durable) {
    getCronBindings().addSessionCronTask?.({ ...task, ...(agentId ? { agentId } : {}) })
    return id
  }
  const tasks = await readCronTasks()
  tasks.push(task)
  await writeCronTasks(tasks)
  return id
}

/**
 * Retira tareas por id. No hace nada si ninguna coincide (por ejemplo, otra
 * sesion se adelanto). Se usa tanto para la limpieza de las de un solo disparo
 * como para un `CronDelete` explicito.
 *
 * Con `dir` sin definir —el camino del REPL— barre ademas el almacen de sesion
 * en memoria: quien llama no sabe en cual de los dos vive un id. El daemon pasa
 * `dir` explicito; no tiene sesion, y la guarda `dir !== undefined` impide que
 * esta funcion toque el estado de bootstrap por ese camino (los tests lo
 * exigen).
 */
export async function removeCronTasks(
  ids: string[],
  dir?: string,
): Promise<void> {
  if (ids.length === 0) return
  // Primero se barre el almacen de sesion. Si todos los ids quedaron cubiertos
  // ahi, se termina — se salta la lectura del archivo por completo.
  // `removeSessionCronTasks` no hace nada (devuelve 0) cuando no acierta, asi
  // que los caminos previos de borrado durable caen sin reservar memoria.
  if (dir === undefined && (getCronBindings().removeSessionCronTasks?.(ids) ?? 0) === ids.length) {
    return
  }
  const idSet = new Set(ids)
  const tasks = await readCronTasks(dir)
  const remaining = tasks.filter(t => !idSet.has(t.id))
  if (remaining.length === tasks.length) return
  await writeCronTasks(remaining, dir)
}

/**
 * Sella `lastFiredAt` en las tareas recurrentes dadas y las vuelve a escribir.
 * Va por lotes, para que N disparos en un mismo tic del planificador sean una
 * lectura-modificacion-escritura y no N. Solo toca las tareas respaldadas por
 * archivo: las de sesion mueren con el proceso y no tiene sentido persistir su
 * hora de disparo. No hace nada si ninguno de los ids coincide —la tarea se
 * borro entre el disparo y la escritura, por ejemplo con un `CronDelete` a
 * mitad del tic.
 *
 * El cerrojo del planificador garantiza que a lo sumo un proceso llame aqui;
 * chokidar recoge la escritura y dispara una recarga que vuelve a sembrar
 * `nextFireAt` desde el `lastFiredAt` recien escrito — idempotente (mismo
 * computo, misma respuesta).
 */
export async function markCronTasksFired(
  ids: string[],
  firedAt: number,
  dir?: string,
): Promise<void> {
  if (ids.length === 0) return
  const idSet = new Set(ids)
  const tasks = await readCronTasks(dir)
  let changed = false
  for (const t of tasks) {
    if (idSet.has(t.id)) {
      t.lastFiredAt = firedAt
      changed = true
    }
  }
  if (!changed) return
  await writeCronTasks(tasks, dir)
}

/**
 * Las tareas respaldadas por archivo mas las de solo sesion, mezcladas. Las de
 * sesion reciben `durable: false` para que quien llama pueda distinguirlas; las
 * de archivo se devuelven tal cual (`durable` sin definir, que es verdadero).
 *
 * Solo mezcla cuando `dir` esta sin definir: quien llama con `dir` explicito
 * —el daemon— no tiene almacen de sesion con el que mezclar.
 */
export async function listAllCronTasks(dir?: string): Promise<CronTask[]> {
  const fileTasks = await readCronTasks(dir)
  if (dir !== undefined) return fileTasks
  const sessionTasks = (getCronBindings().getSessionCronTasks?.() ?? []).map(t => ({
    ...t,
    durable: false as const,
  }))
  return [...fileTasks, ...sessionTasks]
}

/**
 * Perillas de ajuste del scheduler cron. Se obtienen en runtime de la
 * configuración GrowthBook `tengu_kairos_cron_config` (ver
 * `misc/cronJitterConfig.ts`) para que ops pueda ajustar el comportamiento
 * de toda la flota sin publicar un build de cliente. Los valores por
 * defecto aquí preservan exactamente el comportamiento previo a la config.
 */
export type CronJitterConfig = {
  /** Retraso hacia adelante de una tarea recurrente, como fracción del intervalo entre disparos. */
  recurringFrac: number
  /** Cota superior del retraso hacia adelante recurrente sin importar la duración del intervalo. */
  recurringCapMs: number
  /** Adelanto hacia atrás de un one-shot: ms máximos que una tarea puede disparar antes. */
  oneShotMaxMs: number
  /**
   * Adelanto hacia atrás de un one-shot: ms mínimos que una tarea dispara
   * antes cuando la compuerta de minuto-módulo coincide. 0 = los taskIds
   * que hashean cerca de cero disparan en la marca exacta. Subir esto
   * garantiza que nadie caiga en el límite exacto del reloj.
   */
  oneShotFloorMs: number
  /**
   * El jitter dispara en minutos donde `minuto % N === 0`. 30 → :00/:30
   * (los puntos calientes de redondeo humano). 15 → :00/:15/:30/:45. 1 →
   * cada minuto.
   */
  oneShotMinuteMod: number
  /**
   * Las tareas recurrentes auto-expiran a estos ms tras su creación (salvo
   * que estén marcadas `permanent`). `0` = ilimitado (nunca auto-expiran).
   */
  recurringMaxAgeMs: number
  /**
   * Ventana de adelanto de caché de LoopDynamic. Cuando está fijada,
   * ScheduleWakeup retrocede los despertares desde el límite de TTL de
   * caché de prompt de 5 minutos en esta cantidad, para que el turno
   * reanudado aterrice mientras la caché sigue caliente. 0 para disparar
   * exactamente en el retraso solicitado por el usuario.
   */
  cacheLeadMs: number
}

export const DEFAULT_CRON_JITTER_CONFIG: CronJitterConfig = {
  recurringFrac: 0.1,
  recurringCapMs: 15 * 60 * 1000,
  oneShotMaxMs: 90 * 1000,
  oneShotFloorMs: 0,
  oneShotMinuteMod: 30,
  recurringMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  cacheLeadMs: 60_000,
}

/**
 * taskId es una porción hex de 8 caracteres de un UUID (ver `addCronTask`
 * en la fuente) → se parsea como u32 → [0, 1). Estable entre reinicios,
 * uniformemente distribuido en toda la flota. Los ids no-hex (JSON editado
 * a mano) caen por defecto a 0 = sin jitter.
 */
function jitterFrac(taskId: string): number {
  const frac = parseInt(taskId.slice(0, 8), 16) / 0x1_0000_0000
  return Number.isFinite(frac) ? frac : 0
}

/**
 * Próximo disparo en epoch ms para una cadena cron, estrictamente posterior
 * a `fromMs`. Devuelve null si es inválida o no hay coincidencia en los
 * próximos 366 días.
 */
export function nextCronRunMs(cron: string, fromMs: number): number | null {
  const fields = parseCronExpression(cron)
  if (!fields) return null
  const next = computeNextCronRun(fields, new Date(fromMs))
  return next ? next.getTime() : null
}

/**
 * Igual que `nextCronRunMs`, más un retraso determinístico por tarea para
 * evitar una manada estampida cuando muchas sesiones agendan la misma
 * cadena cron (p. ej. `0 * * * *` → todos golpean inferencia a :00).
 *
 * El retraso es proporcional al hueco actual entre disparos
 * (`CronJitterConfig.recurringFrac`, acotado por
 * `CronJitterConfig.recurringCapMs`), así que con los valores por defecto
 * una tarea horaria se esparce en [:00, :06) pero una tarea por minuto solo
 * se esparce por unos pocos segundos.
 *
 * Solo se usa para tareas recurrentes. Los one-shots usan
 * `oneShotJitteredNextCronRunMs` (jitter hacia atrás, acotado por minuto).
 */
export function jitteredNextCronRunMs(
  cron: string,
  fromMs: number,
  taskId: string,
  cfg: CronJitterConfig = DEFAULT_CRON_JITTER_CONFIG,
): number | null {
  const t1 = nextCronRunMs(cron, fromMs)
  if (t1 === null) return null
  const t2 = nextCronRunMs(cron, t1)
  // Sin segunda coincidencia en el próximo año (p. ej. fecha fija) → no hay
  // nada contra qué proporcionar, y con certeza casi total no es un riesgo
  // de manada. Dispara en t1.
  if (t2 === null) return t1
  const jitter = Math.min(
    jitterFrac(taskId) * cfg.recurringFrac * (t2 - t1),
    cfg.recurringCapMs,
  )
  return t1 + jitter
}

/**
 * Igual que `nextCronRunMs`, menos un adelanto determinístico por tarea
 * cuando la hora de disparo cae en un límite de minuto que coincide con
 * `CronJitterConfig.oneShotMinuteMod`.
 *
 * Las tareas one-shot están fijadas por el usuario ("recuérdame a las
 * 3pm"), así que retrasarlas rompe el contrato — pero disparar un poco
 * antes es invisible y esparce el pico de inferencia de que todos elijan
 * la misma hora redonda de reloj. Con los valores por defecto (mod 30,
 * máx 90s, floor 0) solo :00 y :30 reciben jitter, porque los humanos
 * redondean a la media hora.
 *
 * Chequea la hora de disparo calculada en vez de la cadena cron, así que
 * `0 15 * * *`, expresiones de paso, y `0,30 9 * * *` reciben jitter por
 * igual cuando caen en un minuto coincidente. Acotado a `fromMs` para que
 * una tarea creada dentro de su propia ventana de jitter no dispare antes
 * de haber sido creada.
 */
export function oneShotJitteredNextCronRunMs(
  cron: string,
  fromMs: number,
  taskId: string,
  cfg: CronJitterConfig = DEFAULT_CRON_JITTER_CONFIG,
): number | null {
  const t1 = nextCronRunMs(cron, fromMs)
  if (t1 === null) return null
  // La resolución del cron es de 1 minuto → las horas calculadas siempre
  // tienen :00 segundos, así que un chequeo del campo de minuto basta para
  // identificar las marcas calientes. getMinutes() (local), no
  // getUTCMinutes(): el cron se evalúa en hora local, y "el usuario eligió
  // una hora redonda" significa redonda en SU zona horaria. En zonas con
  // offset de media hora (India UTC+5:30) el :00 local es :30 UTC — el
  // chequeo en UTC esparciría las marcas equivocadas.
  if (new Date(t1).getMinutes() % cfg.oneShotMinuteMod !== 0) return t1
  // floor + frac * (max - floor) → uniforme sobre [floor, max). Con
  // floor=0 esto se reduce al frac * max original. Con floor>0, incluso un
  // taskId que hashea a 0 recibe `floor` ms de adelanto — nadie dispara en
  // la marca exacta.
  const lead =
    cfg.oneShotFloorMs +
    jitterFrac(taskId) * (cfg.oneShotMaxMs - cfg.oneShotFloorMs)
  // t1 > fromMs está garantizado por nextCronRunMs (estrictamente
  // posterior), así que el max() solo actúa cuando la tarea se creó dentro
  // de su propia ventana de adelanto.
  return Math.max(t1 - lead, fromMs)
}

/**
 * Una tarea está "perdida" cuando su próxima corrida agendada (calculada
 * desde createdAt) está en el pasado. Se muestra al usuario al arrancar.
 * Funciona tanto para one-shots como para recurrentes — una tarea
 * recurrente cuya ventana pasó mientras Claude estaba caído sigue estando
 * "perdida".
 */
export function findMissedTasks(tasks: CronTask[], nowMs: number): CronTask[] {
  return tasks.filter(t => {
    const next = nextCronRunMs(t.cron, t.createdAt)
    return next !== null && next < nowMs
  })
}
