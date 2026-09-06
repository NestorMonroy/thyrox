/**
 * Porte PARCIAL de `ccnmt: packages/agent/internal/cronTasksCore.ts`.
 *
 * Tareas agendadas, guardadas en `<proyecto>/.claude/scheduled_tasks.json`.
 * Vienen en dos sabores: one-shot (`recurring: false`/`undefined`) —
 * disparan una vez y se auto-borran— y recurrentes (`recurring: true`) —
 * disparan según agenda, se reprograman desde ahora, y persisten hasta
 * borrado explícito o auto-expiración pasado
 * `DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs`.
 *
 * Recorte declarado: la fuente trae además ocho funciones de E/S de
 * archivo — `getCronFilePath`, `readCronTasks`, `hasCronTasksSync`,
 * `writeCronTasks`, `addCronTask`, `removeCronTasks`, `markCronTasksFired`,
 * `listAllCronTasks` — que dependen de `getAgentHostBindings()`
 * (`ccnmt: packages/agent/host.ts`), inexistente en este árbol. Ninguna
 * entra aquí; el porte se limita a la superficie PURA que
 * `__tests__/cronTasksJitter.test.ts` y
 * `__tests__/internalCronTasksCore.behavior.test.ts` ejercitan sin tocar el
 * disco: el tipo `CronTask`, `CronJitterConfig` con su valor por defecto,
 * `nextCronRunMs`, `jitteredNextCronRunMs`, `oneShotJitteredNextCronRunMs`
 * y `findMissedTasks`.
 */

import { computeNextCronRun, parseCronExpression } from './cronCore.js'

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
