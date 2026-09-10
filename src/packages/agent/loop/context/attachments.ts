/**
 * El `attachment` y sus cuatro etapas (T-085).
 *
 * Porte del mecanismo que el ejecutable 2.1.258 declara en cuatro piezas
 * separadas, no en una. Análisis, citas y el censo de los 59 miembros:
 * `docs: …/construir-harness-propio/analisis-flujo-del-attachment-en-el-binario.rst`.
 *
 * | Etapa | Aquí | En el ejecutable |
 * |---|---|---|
 * | construir | `makeAttachment` | `hBn(e)` — envuelve y lo inserta en el arreglo de mensajes |
 * | validar | `isValidAttachment` | un predicado por miembro, con cotas (`iho=4096`) |
 * | renderizar | `renderAttachment` | `switch` → bloques con `isMeta:!0`, o `[]` |
 * | contar | `attachmentBreakdown` | `lGo` → `attachmentTokens` + `attachmentsByType` |
 *
 * **El defecto que cierra:** el harness producía dos attachments —el
 * `additionalContext` de `UserPromptSubmit` y el de `PostToolUse`— y los
 * **concatenaba al texto de otro mensaje**. Con eso el contexto del hook era
 * indistinguible de lo que el usuario escribió, y su costo se facturaba a
 * `userMessageTokens` en vez de a su propia línea.
 */
import { randomUUID } from 'node:crypto'
import { estimateMessagesTokens } from './autocompact.ts'
import type { ContentBlock, Message } from '../types.ts'

/**
 * El payload de un adjunto. `type` queda **abierto** a propósito: el
 * ejecutable declara 59 miembros y este harness produce cinco. Cerrar la
 * unión congelaría un universo que la propia fuente no cierra — el
 * sub-patrón B de `metrica-decide-la-conclusion.md`.
 */
export type AttachmentPayload = { type: string; [otro: string]: unknown }

/** La línea del transcript y el elemento del historial. */
export type AttachmentEntry = {
  type: 'attachment'
  attachment: AttachmentPayload
  uuid: string
  timestamp: string
}

/** Un mensaje inyectado desde un adjunto: lleva `isMeta`, como en `Ie({…,isMeta:!0})`. */
export type MetaMessage = Message & { isMeta?: boolean }

/** La cota de `skill_listing`, verbatim del ejecutable (`var iho=4096`). */
export const SKILL_LISTING_MAX_NAMES = 4096

/**
 * El texto del recordatorio de tareas, verbatim del ejecutable 2.1.259
 * (``claude_strings.txt:712821``): ``The task tools haven't been used
 * recently…``. Los nombres de herramienta van interpolados allá
 * (``${vA}``/``${TA}``); aquí son las cadenas fijas ``TaskCreate``/``TaskUpdate``,
 * que es como el harness las expone.
 *
 * Es la etapa 4 (camino 2) del flujo del subsistema de tareas
 * (``docs: …/construir-harness-propio/analisis-flujo-subsistema-de-tareas-en-el-binario.rst``):
 * la tarea vuelve a la vista del modelo sin que él la pida. Sin esto, el
 * tablero queda «en el archivo» y nunca «en el plan».
 */
/**
 * El gate del recordatorio, verbatim del ejecutable 2.1.259
 * (`Tzt={TURNS_SINCE_WRITE:10,TURNS_BETWEEN_REMINDERS:10}`,
 * `claude_strings.txt` ≈ 584041): 10 turnos sin escritura de tarea Y 10 desde
 * el último recordatorio. Muy frecuente → el modelo ignora la repetición; muy
 * raro → pierde el hilo (`hccw: 11-task-system.md:378-382`).
 */
export const TURNS_SINCE_WRITE = 10
export const TURNS_BETWEEN_REMINDERS = 10

export const TASK_REMINDER_TEXT =
  "The task tools haven't been used recently. If you're working on tasks that would benefit from tracking progress, consider using TaskCreate to add new tasks and TaskUpdate to update task status (set to in_progress when starting, completed when done). Also consider cleaning up the task list if it has become stale. Only use these if relevant to the current work. This is just a gentle reminder - ignore if not applicable."

/**
 * Una tarea del tablero, en la forma minima que el recordatorio necesita.
 *
 * ``citationId`` es el identificador de cita segmentado (``TASK-<CAPA>-NNNN``)
 * que ``task_ids`` acuña sobre el store. Es **opcional** por construcción: el
 * esquema del harness (``TABLERO_DDL``) no declara la columna, así que una
 * base recién creada aquí no la tiene y la línea cae a la forma del
 * ejecutable.
 */
export type TaskReminderItem = {
  id: string
  status: string
  subject: string
  citationId?: string | null
}

/**
 * La línea de una tarea en el recordatorio.
 *
 * El ejecutable 2.1.261 rinde tres campos —``#${f.id}. [${f.status}]
 * ${f.subject}``— y **ninguno** es el identificador de cita: el suyo es el
 * ordinal, que reinicia por sesión. Por decisión del ejecutor (2026-09-05) la
 * cita segmentada tiene que **verse** ahí, porque es lo único que un ``.rst``
 * puede citar sin ambigüedad (ERR-024).
 *
 * La divergencia con la fuente es deliberada y mínima: se **añade** entre
 * paréntesis tras el ordinal, sin mover ni renombrar los tres campos que la
 * fuente declara. Una tarea sin cita conserva la forma verbatim.
 */
function taskReminderLine(t: TaskReminderItem): string {
  const cita = typeof t.citationId === 'string' ? t.citationId.trim() : ''
  const ordinal = cita ? `#${t.id} (${cita})` : `#${t.id}`
  return `${ordinal}. [${t.status}] ${t.subject}`
}

/**
 * El cuerpo del recordatorio: el texto fijo, y sólo si hay tareas, el bloque
 * ``Here are the existing tasks:`` con una línea ``#N. [status] subject`` por
 * tarea — la misma condición que el ejecutable (``if (taskItems.length > 0)``,
 * ``hccw: 11-task-system.md:357``). Se envuelve en ``<system-reminder>`` como
 * el ``Vl`` del ejecutable (``claude_strings.txt:712824``).
 */
function renderTaskReminder(tasks: TaskReminderItem[]): string {
  let cuerpo = TASK_REMINDER_TEXT
  if (tasks.length > 0) {
    const lineas = tasks.map(taskReminderLine).join('\n')
    cuerpo += `\n\nHere are the existing tasks:\n\n${lineas}`
  }
  return `<system-reminder>\n${cuerpo}\n</system-reminder>`
}

/**
 * Los eventos cuyo `hook_success` SÍ se renderiza.
 *
 * `if(e.hookEvent!=="SessionStart"&&e.hookEvent!=="UserPromptSubmit"&&
 * e.hookEvent!=="UserPromptExpansion")return[]` — la salida de un hook de
 * herramienta no vuelve al modelo por esta vía.
 */
export const HOOK_SUCCESS_RENDERED_EVENTS: ReadonlySet<string> = new Set([
  'SessionStart', 'UserPromptSubmit', 'UserPromptExpansion',
])

/**
 * Qué miembros vuelven al reanudar (#37).
 *
 * `readTranscript`/`resumableMessages` saltaban toda línea `attachment`, así que
 * el contexto que un hook inyectó no volvía tras un reinicio. Pero no todos
 * deben volver: los de **andamiaje de sesión** —`instructions`, `environment`,
 * `invoked_skills`— los **re-renderiza la sesión nueva** al arrancar (su
 * `SessionStart`), así que reproducir los viejos duplicaría. Es la regla que el
 * ejecutable declara como `if(e.renderedByBatchHead)return[]` (medido: 3
 * ocurrencias en 2.1.258): lo que la cabeza de tanda ya renderiza no se repite.
 *
 * Lo que SÍ vuelve es el **contexto de hook de turnos pasados**
 * —`hook_additional_context`, `hook_success`—: ese hook no se dispara de nuevo
 * para el historial reanudado, así que sin reproducirlo el modelo pierde
 * contexto que sí tuvo. Los demás miembros (recordatorios, presupuesto, modo
 * plan, `date_change`…) son transitorios al turno vivo y la sesión nueva los
 * recomputa — no se reproducen.
 */
export const RESUME_REPLAYED_TYPES: ReadonlySet<string> = new Set([
  'hook_additional_context', 'hook_success',
])

/** ¿El payload de este adjunto sobrevive a una reanudación? (#37) */
export function survivesResume(a: AttachmentPayload): boolean {
  return RESUME_REPLAYED_TYPES.has(a.type)
}

/** Etapa 1 — envolver. `hBn(e)`. */
export function makeAttachment(attachment: AttachmentPayload): AttachmentEntry {
  return { type: 'attachment', attachment, uuid: randomUUID(), timestamp: new Date().toISOString() }
}

/**
 * Etapa 2 — validar, con un predicado **por miembro**.
 *
 * El `default` acepta (`default:return!0`): es una red por miembro, no una
 * lista blanca. Una lista blanca rechazaría los 54 miembros que este harness
 * todavía no produce y convertiría cada uno nuevo en un fallo silencioso.
 */
export function isValidAttachment(a: AttachmentPayload): boolean {
  switch (a.type) {
    case 'hook_success':
      return typeof a.content === 'string'
    case 'hook_additional_context':
      return Array.isArray(a.content) && a.content.every((n) => typeof n === 'string')
    case 'skill_listing':
      return a.names === undefined
        || (Array.isArray(a.names) && a.names.length <= SKILL_LISTING_MAX_NAMES
          && a.names.every((n) => typeof n === 'string'))
    case 'task_reminder':
      return a.tasks === undefined
        || (Array.isArray(a.tasks) && a.tasks.every((t) => t !== null && typeof t === 'object'))
    default:
      return true
  }
}

/** Un mensaje inyectado, con la marca que lo distingue de lo que alguien escribió. */
function meta(text: string): MetaMessage {
  const content: ContentBlock[] = [{ type: 'text', text }]
  return { role: 'user', content, isMeta: true }
}

/**
 * Etapa 3 — renderizar a payload, o **no renderizar**.
 *
 * Devolver `[]` es un desenlace de primera clase, no un fallo: el ejecutable
 * lo hace en cada miembro que no aplica al turno. Un miembro sin renderizador
 * **no rinde**, y eso es correcto — lo que no vale es que rinda algo genérico,
 * porque entonces `[]` dejaría de discriminar.
 */
export function renderAttachment(a: AttachmentPayload): MetaMessage[] {
  switch (a.type) {
    case 'hook_additional_context': {
      const partes = Array.isArray(a.content) ? a.content.filter((n) => typeof n === 'string') : []
      if (partes.length === 0) return []
      return [meta(partes.join('\n'))]
    }
    case 'hook_success': {
      if (typeof a.hookEvent !== 'string' || !HOOK_SUCCESS_RENDERED_EVENTS.has(a.hookEvent)) return []
      if (typeof a.content !== 'string' || a.content === '') return []
      return [meta(`${String(a.hookName ?? 'hook')} hook:\n${a.content}`)]
    }
    case 'instructions':
    case 'environment':
    case 'invoked_skills': {
      if (typeof a.content !== 'string' || a.content === '') return []
      return [meta(a.content)]
    }
    case 'task_reminder': {
      const tasks = Array.isArray(a.tasks) ? (a.tasks as TaskReminderItem[]) : []
      return [meta(renderTaskReminder(tasks))]
    }
    default:
      return []
  }
}

/**
 * Etapa 4 — contar, con línea presupuestaria propia.
 *
 * El ejecutable declara siete líneas (`messageBreakdown`); aquí van las tres
 * que este harness puede atribuir hoy. **Separar `attachmentTokens` de
 * `userMessageTokens` es el punto entero**: fundidos, un desglose no puede
 * distinguir «el usuario escribió mucho» de «los hooks inyectan mucho», que
 * es justo la decisión que el desglose existe para informar.
 */
export type AttachmentBreakdown = {
  attachmentTokens: number
  userMessageTokens: number
  assistantMessageTokens: number
  /** Por miembro de la unión — `n.attachmentsByType.set(d, …)`. */
  attachmentsByType: Record<string, number>
}

export function attachmentBreakdown(items: (Message | AttachmentEntry)[]): AttachmentBreakdown {
  const b: AttachmentBreakdown = {
    attachmentTokens: 0, userMessageTokens: 0, assistantMessageTokens: 0, attachmentsByType: {},
  }
  for (const it of items) {
    if ('attachment' in it) {
      // Se mide el payload serializado, como `Uc(b(e.attachment))`: lo que
      // ocupa el adjunto es su contenido, no el mensaje en que se renderice.
      const t = Math.ceil(JSON.stringify(it.attachment).length / 4)
      b.attachmentTokens += t
      const clave = it.attachment.type || 'unknown'
      b.attachmentsByType[clave] = (b.attachmentsByType[clave] ?? 0) + t
      continue
    }
    const t = estimateMessagesTokens([it])
    if (it.role === 'assistant') b.assistantMessageTokens += t
    else b.userMessageTokens += t
  }
  return b
}
