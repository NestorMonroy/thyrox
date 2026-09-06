/**
 * El bucle (T-006) — la pieza que define a un harness.
 *
 * petición → bloques de respuesta → ejecución de herramientas → repetición,
 * hasta `end_turn`, `maxTurns` o abort. Cada paso pasa por sus hooks con el
 * contrato del cliente, y cada llamada a herramienta por la puerta de
 * permisos ANTES de tocar el disco.
 *
 * Lo que este bucle NO hace, y es deliberado: no lanza subagentes (T-018) y no
 * cambia de modelo a mitad. Cada una de esas cosas tiene su tarea; ninguna está
 * escondida aquí a medias.
 *
 * Sí compacta (T-023, T-024), y **sólo si se le pide**: `context` es opcional y
 * sin él el bucle no toca el historial. Compactar cambia el prefijo de la
 * petición y por tanto **rompe la caché**, así que no puede ser un default
 * silencioso — el ahorro de una es el gasto de la otra, y quién gana depende
 * del tamaño del contexto, que sólo el llamante conoce.
 */
import { compactMessages, estimateMessagesTokens } from './context/autocompact.ts'
import { renderAttachment, TURNS_SINCE_WRITE, TURNS_BETWEEN_REMINDERS } from './context/attachments.ts'
import { resumenTablero } from './tools/tasks.ts'
import { MICROCOMPACT_MIN_FREED_TOKENS, projectMicrocompact } from './context/microcompact.ts'
import { makeClearedPersister, toolCallIndex } from './observability/clearedResults.ts'
import { STORE_PATH } from './observability/store.ts'
import { probeStore } from '../../../store/db.ts'
import {
  THRASHING_MESSAGE, advanceTurn, contextLevel, markCompacted, rapidRefill,
  type RemoteAutocompactState,
  type CompactionState, type ContextLevel,
} from './context/contextLevel.ts'
import { collectCompactableToolIds, microcompact } from './context/microcompact.ts'
import { Journal } from './observability/journal.ts'
import { turnCost } from './observability/cost.ts'
import { runHooks, type HookConfig } from './hooks.ts'
import { evaluate, type PermissionPolicy } from './permission.ts'
import { openSession } from './session.ts'
import type { Transcript } from './transcript.ts'
import { registry, toolSpecs } from './tools/registry.ts'
import type { ContentBlock, HarnessEvent, LoopResult, LoopStop, Message, Provider, Tool, Usage } from './types.ts'
import { USAGE_CERO } from './types.ts'

export type LoopOptions = {
  provider: Provider
  model: string
  system: string
  prompt: string
  tools: Tool[]
  cwd: string
  transcriptDir: string
  resume?: string
  maxTurns?: number
  maxTokens?: number
  cacheTtl?: '5m' | '1h'
  hooks?: HookConfig
  permissions?: PermissionPolicy
  /** Compactación. Sin esta clave, el bucle no toca el historial. */
  context?: ContextOptions
  /** Dónde escribir el diario de eventos. Sin ruta, no hay diario. */
  journalPath?: string
  interactive?: boolean
  /**
   * Pedir el turno como stream. Sólo cambia CUÁNDO se ve el texto, nunca el
   * turno: el `AssistantTurn` que se guarda y se cobra es el mismo.
   */
  stream?: boolean
  /**
   * Inyección periódica del tablero (etapa 4 del subsistema de tareas,
   * DEC-TASK-01). Con esta clave, el bucle relee el store cada 10 turnos sin
   * escritura de tarea y lo inyecta como `task_reminder`. Sin ella, el tablero
   * queda «en el archivo» y nunca «en el plan».
   */
  taskReminder?: { dbPath: string; sessionId: string }
  signal?: AbortSignal
}

/**
 * Las dos compactaciones, con su disparador propio.
 *
 * La micro se dispara por **conteo** de resultados y no toca la conversación;
 * la automática se dispara por **tokens** contra el umbral del catálogo y
 * sustituye el pasado por un resumen. La primera es barata y frecuente; la
 * segunda es cara y rara.
 */
export type ContextOptions = {
  /** Microcompactar cuando haya más de N resultados compactables. */
  microcompactAfter?: number
  /** Cuántos resultados recientes conserva la microcompactación. */
  keepToolResults?: number
  /**
   * Dónde se registra lo que la microcompactación vacía, antes de vaciarlo.
   *
   * Por defecto el store local. `false` lo apaga y entonces se limpia con el
   * marcador pelado, como hace el ejecutable cuando nadie le pasa
   * persistidor: es una decisión, no un descuido.
   */
  persistCleared?: string | false
  /**
   * El piso: cuántos tokens tiene que liberar la microcompactación para que
   * valga la pena ejecutarla. Por defecto el `Sdn=20000` del ejecutable.
   *
   * Bajarlo a 0 es legítimo y **se declara**: purgar rompe la caché de prompt,
   * así que hacerlo para liberar doscientos tokens cuesta más que no hacerlo.
   */
  minFreedTokens?: number
  /** Cuántos mensajes recientes sobreviven a la compactación automática. */
  keepMessages?: number
  /**
   * Quién escribe el resumen. Sin esta función NO hay compactación automática:
   * inventar el resumen aquí sería fabricar contexto que nadie produjo.
   */
  summarize?: (messages: Message[]) => Promise<string>
  /**
   * `ko("autoCompactEnabled",!0)` — el ajuste que `Qp()` consulta.
   *
   * No apaga el tope duro: sólo quita el escalón `compact` y hace que
   * `pctLeft` se mida contra la ventana entera, o sea que reporte más margen
   * del que hay. Ver `contextLevel.ts`.
   */
  autoCompactEnabled?: boolean
  /**
   * `n` de `MF` — la ventana de compactación fijada por ajuste.
   *
   * Sólo puede **bajar** la del modelo, y no mueve el tope duro: con 200 000
   * sobre un modelo de 1 M se compacta a los 187 000 y se bloquea a los
   * 977 000. Son dos ventanas distintas a propósito.
   */
  autoCompactWindow?: number
  /**
   * `remoteAutocompactState` — el frame que el servidor adopta.
   *
   * Cuando está presente, ventana, umbral y `enabled` vienen del servidor y
   * los dos overrides de entorno se **descartan**; el tope duro sigue siendo
   * local. El harness no lo recibe todavía por sí mismo: lo pasa quien opere
   * el bucle contra una sesión remota. Sin este campo el porte de la rama
   * remota sería inalcanzable desde el bucle — capacidad muerta.
   */
  remoteAutocompact?: RemoteAutocompactState
}

function suma(a: Usage, b: Usage): Usage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cache_creation_input_tokens: a.cache_creation_input_tokens + b.cache_creation_input_tokens,
    cache_read_input_tokens: a.cache_read_input_tokens + b.cache_read_input_tokens,
  }
}

const textoDe = (bloques: ContentBlock[]): string =>
  bloques.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map((b) => b.text).join('\n')

/**
 * El bucle como **generador de eventos**: la forma que una interfaz necesita.
 * `runLoop` es su envoltura para quien sólo quiere el resultado final.
 */
export async function* streamLoop(opts: LoopOptions): AsyncGenerator<HarnessEvent, LoopResult> {
  const maxTurns = opts.maxTurns ?? 20
  const herramientas = registry(opts.tools)
  const sesion = openSession({ cwd: opts.cwd, transcriptDir: opts.transcriptDir, resume: opts.resume })
  const shared = { session_id: sesion.id, transcript_path: sesion.transcriptPath, cwd: opts.cwd }
  // El diario registra el mismo flujo de eventos que ve la interfaz. Escribir
  // dos veces la misma verdad sería dos verdades: se anota lo que se emite.
  const diario = opts.journalPath ? new Journal(opts.journalPath, sesion.id) : null
  const annotate = (e: HarnessEvent): HarnessEvent => {
    if (diario) {
      const { type, ...resto } = e
      diario.log(type, resto as Record<string, unknown>)
    }
    return e
  }

  await runHooks(opts.hooks ?? {}, 'SessionStart', { ...shared, source: opts.resume ? 'resume' : 'startup' })
  // Lo que el modelo va a leer como sistema, medido en caracteres. El tamaño
  // es el dato: `h-docs-99` midió 126 029 tokens de piso siempre-cargado, y
  // sin este evento ese piso sólo se ve pagándolo.
  await runHooks(opts.hooks ?? {}, 'InstructionsLoaded', {
    ...shared, characters: opts.system.length, model: opts.model,
  })
  yield annotate({ type: 'session_start', sessionId: sesion.id, transcriptPath: sesion.transcriptPath })
  // #26: sondear el store al arranque. Un store que no abre se descubría antes
  // en la primera purga (`sin-store`); aquí se dice temprano. `false` lo apaga,
  // y entonces no hay store que sondear.
  {
    const destinoStore = opts.context?.persistCleared ?? STORE_PATH
    if (destinoStore !== false) {
      const sonda = probeStore(destinoStore)
      if (!sonda.ok) yield annotate({ type: 'store_unavailable', detail: sonda.detail })
    }
  }
  // Al reanudar, el veredicto de reconciliación va justo tras el arranque:
  // qué estaba pasando cuando el worker anterior murió, en qué época estamos,
  // y cuántos `tool_use` huérfanos se retiraron. Sólo aparece con `resume`.
  if (sesion.reconcile) {
    yield annotate({
      type: 'session_reconcile', lastTurn: sesion.reconcile.lastTurn,
      epoch: sesion.reconcile.epoch, priorWorker: sesion.reconcile.priorWorker,
      messages: sesion.previous.length, rescuedToolUses: sesion.reconcile.rescuedToolUses,
    })
  }
  const submit = await runHooks(opts.hooks ?? {}, 'UserPromptSubmit', { ...shared, prompt: opts.prompt })

  const mensajes: Message[] = [...sesion.previous]
  // El prompt del usuario es SÓLO el prompt. Antes de T-085 el
  // `additionalContext` del hook se concatenaba aquí, y con eso el transcript
  // atribuía al usuario texto que no escribió y su costo se facturaba a
  // `userMessageTokens`. La referencia lo trata como un elemento propio del
  // arreglo de mensajes (`hBn`), no como parte del anterior.
  mensajes.push({ role: 'user', content: [{ type: 'text', text: opts.prompt }] })
  sesion.transcript.appendUser(opts.prompt)
  if (submit.additionalContext.length > 0) {
    const payload = { type: 'hook_additional_context', content: submit.additionalContext }
    sesion.transcript.appendAttachment(payload)
    // Separar no es descartar: el contexto llega al modelo igual, marcado.
    for (const m of renderAttachment(payload)) mensajes.push({ role: m.role, content: m.content })
  }

  let usage: Usage = { ...USAGE_CERO }
  let turns = 0
  // El gate del recordatorio de tareas: turnos sin escritura de tarea y
  // turnos desde el último recordatorio (DEC-TASK-01).
  let turnosSinEscrituraTarea = 0
  let turnosSinRecordatorio = 0
  let ultimoTexto = ''
  let stop: LoopStop = 'max_turns'
  let modeloServido: string | null = null
  // El estado que el guard antithrashing necesita: sin llevarlo, tres
  // compactaciones seguidas son indistinguibles de tres turnos normales.
  let compactState: CompactionState | undefined

  while (turns < maxTurns) {
    if (opts.signal?.aborted) {
      stop = 'aborted'
      break
    }
    turns += 1
    yield annotate({ type: 'turn_start', turn: turns })
    compactState = advanceTurn(compactState)

    // El nivel se mide ANTES de decidir nada: es el insumo de las tres ramas.
    const tokensAntes = estimateMessagesTokens(mensajes)
    const nivel = contextLevel(tokensAntes, opts.model, {
      ...opts.context, remote: opts.context?.remoteAutocompact,
    })
    yield annotate({
      type: 'context_level', turn: turns, level: nivel.level,
      tokens: tokensAntes, pctLeft: nivel.pctLeft,
    })

    // `blocked` para el bucle sin emitir la petición. El API la rechazaría con
    // `input length and `max_tokens` exceed context limit`, y ese rechazo llega
    // cuando el turno ya se pagó.
    if (nivel.level === 'blocked') {
      stop = 'context_blocked'
      break
    }

    for (const evento of await compact(mensajes, opts, turns, shared, nivel.level, sesion.transcript)) yield annotate(evento)
    const auto = await comprimirAuto(mensajes, opts, turns, shared, nivel.level, sesion.transcript)
    if (auto) {
      // Sólo aquí se consulta el guard: es la compactación la que puede
      // repetirse en círculo, no el turno.
      const refill = rapidRefill(compactState)
      compactState = markCompacted(String(turns), refill.consecutiveRapidRefills)
      yield annotate(auto)
      if (refill.action === 'trip') {
        ultimoTexto = THRASHING_MESSAGE
        stop = 'compaction_thrashing'
        break
      }
    }
    // Etapa 4 (camino 2): la tarea vuelve a la vista del modelo sin que la
    // pida. A los 10 turnos sin escritura de tarea Y 10 desde el último
    // recordatorio, se relee el store y se inyecta el tablero como
    // `task_reminder` — el mismo mecanismo `<system-reminder>` del ejecutable.
    if (opts.taskReminder) {
      turnosSinEscrituraTarea += 1
      turnosSinRecordatorio += 1
      if (turnosSinEscrituraTarea >= TURNS_SINCE_WRITE && turnosSinRecordatorio >= TURNS_BETWEEN_REMINDERS) {
        const tasks = resumenTablero(opts.taskReminder.dbPath, opts.taskReminder.sessionId)
        const payload = { type: 'task_reminder', tasks }
        sesion.transcript.appendAttachment(payload)
        for (const m of renderAttachment(payload)) mensajes.push({ role: m.role, content: m.content })
        turnosSinRecordatorio = 0
      }
    }
    const request = {
      model: opts.model,
      system: opts.system,
      tools: toolSpecs(opts.tools),
      messages: mensajes,
      maxTokens: opts.maxTokens ?? 8192,
      cacheTtl: opts.cacheTtl ?? '1h',
      ...(opts.stream ? { stream: true as const } : {}),
    }
    let turn
    if (opts.stream && opts.provider.stream) {
      const it = opts.provider.stream(request)
      let step = await it.next()
      while (!step.done) {
        // El tipo del delta se conserva: aplanar el pensamiento a texto lo
        // mezclaría con la respuesta, y quien renderiza no podría separarlos.
        yield annotate({ type: step.value.type, turn: turns, text: step.value.text })
        step = await it.next()
      }
      turn = step.value
    } else {
      // Un proveedor sin `stream()` es legítimo: se pide el turno entero.
      turn = await opts.provider.send(request)
    }
    usage = suma(usage, turn.usage)
    modeloServido = turn.model
    mensajes.push({ role: 'assistant', content: turn.content })
    sesion.transcript.appendAssistant({ id: turn.id, model: turn.model, content: turn.content }, turn.usage)
    const texto = textoDe(turn.content)
    if (texto) {
      ultimoTexto = texto
      yield annotate({ type: 'text', turn: turns, text: texto })
    }

    const llamadas = turn.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
    if (llamadas.length === 0) {
      stop = turn.stop_reason === 'refusal' ? 'refusal' : 'end_turn'
      break
    }
    if (opts.signal?.aborted) {
      stop = 'aborted'
      break
    }

    // Una escritura de tarea reinicia el contador: el recordatorio vuelve a
    // contar 10 turnos desde aquí (DEC-TASK-01).
    if (opts.taskReminder && llamadas.some((l) => l.name === 'TaskCreate' || l.name === 'TaskUpdate')) {
      turnosSinEscrituraTarea = 0
    }
    const resultados: ContentBlock[] = []
    for (const llamada of llamadas) {
      yield annotate({ type: 'tool_start', turn: turns, tool: llamada.name, input: llamada.input })
      const r = await ejecutar(llamada, { herramientas, opts, shared, sesionId: sesion.id, mensajes })
      resultados.push(r)
      const contenido = r.type === 'tool_result' ? r.content : ''
      const esError = r.type === 'tool_result' ? r.is_error === true : false
      yield annotate({ type: 'tool_end', turn: turns, tool: llamada.name, output: contenido, isError: esError })
    }
    // Cierra el GRUPO, no cada llamada: `PostToolUse` ya cubre la unidad. Un
    // hook que quiera ver el turno entero —coste, orden, fallos juntos— no
    // puede reconstruirlo desde N eventos sueltos sin saber dónde corta.
    await runHooks(opts.hooks ?? {}, 'PostToolBatch', {
      ...shared,
      turn: turns,
      tool_count: llamadas.length,
      tool_names: llamadas.map((l) => l.name),
      failures: resultados.filter((r) => r.type === 'tool_result' && r.is_error === true).length,
    })
    mensajes.push({ role: 'user', content: resultados })
    sesion.transcript.appendUser(resultados)
  }

  await runHooks(opts.hooks ?? {}, 'Stop', { ...shared, stop_hook_active: false, last_assistant_message: ultimoTexto })
  sesion.transcript.appendSystem('loop_stop', stop)
  const result: LoopResult = {
    stop, turns: turns, lastText: ultimoTexto, usage,
    sessionId: sesion.id, transcriptPath: sesion.transcriptPath,
    // El modelo del coste es el que los turnos DECLARARON, no el que se pidió:
    // el proveedor puede haber caído a su respaldo, y cobrar por el alias
    // solicitado mediría el modelo equivocado.
    usd: turnCost(modeloServido ?? opts.model, usage, opts.cacheTtl ?? '1h').usd,
  }

  // `SessionEnd` va DESPUÉS de `Stop` y del resultado: `Stop` puede vetar el
  // cierre de un turno, éste no puede vetar nada — la sesión ya terminó. Un
  // veto aquí sería un bloqueo sin efecto que el operador leería como si
  // hubiera impedido algo, así que su veredicto se ignora a propósito.
  await runHooks(opts.hooks ?? {}, 'SessionEnd', {
    ...shared,
    // La razón del cierre: sin ella, un tope de turnos y una respuesta
    // completa se leen igual desde el hook.
    reason: stop,
    turns,
    last_assistant_message: ultimoTexto,
  })
  yield annotate({ type: 'done', turn: turns, result })
  return result
}

/** El bucle, sin eventos: para quien sólo quiere el resultado. */
export async function runLoop(opts: LoopOptions): Promise<LoopResult> {
  const gen = streamLoop(opts)
  let ultimo = await gen.next()
  while (!ultimo.done) ultimo = await gen.next()
  return ultimo.value
}

/**
 * Qué herramienta cambia un archivo, y con qué clase de cambio.
 *
 * Es una tabla y no un `includes('Write')` porque el emisor de `FileChanged`
 * tiene que poder decir QUÉ pasó: un hook que reacciona igual a una creación
 * y a una edición no necesita el evento.
 */
const ESCRITURAS: Record<string, string | undefined> = { Write: 'write', Edit: 'edit' }

/**
 * El id que el tablero asignó, leído de la salida de la herramienta.
 *
 * Devuelve `undefined` si la salida no es el JSON esperado: un id inventado
 * sería peor que ninguno — el hook lo usaría para buscar una tarea que no
 * existe y leería el vacío como «la tarea no está».
 */
function idDeTarea(salida: string): string | undefined {
  try {
    const v = JSON.parse(salida) as { task_id?: unknown }
    return typeof v.task_id === 'string' ? v.task_id : undefined
  } catch {
    return undefined
  }
}

/** Una llamada a herramienta: permiso → PreToolUse → ejecución → PostToolUse. */
async function ejecutar(
  llamada: Extract<ContentBlock, { type: 'tool_use' }>,
  ctx: { herramientas: Map<string, Tool>; opts: LoopOptions; shared: Record<string, unknown>; sesionId: string; mensajes: Message[] },
): Promise<ContentBlock> {
  const { herramientas, opts, shared, mensajes } = ctx
  const resultado = (content: string, is_error = false): ContentBlock =>
    ({ type: 'tool_result', tool_use_id: llamada.id, content, is_error })

  const tool = herramientas.get(llamada.name)
  if (!tool) return resultado(`herramienta desconocida: ${llamada.name}`, true)

  // Las tres capas: confinamiento, reglas por patrón, capacidad. El veredicto
  // vuelve con la regla que decidió, y esa razón viaja al modelo: un `deny`
  // sin motivo no le deja corregir.
  await runHooks(opts.hooks ?? {}, 'PermissionRequest', {
    ...shared, tool_name: llamada.name, tool_input: llamada.input, capability: tool.permission,
  })
  const veredicto = evaluate(opts.permissions, llamada.name, tool.permission, llamada.input, opts.interactive)
  if (veredicto.decision !== 'allow') {
    const razon = veredicto.reason ?? `capacidad ${tool.permission}`
    // El evento lleva la razón que decidió: un `deny` sin motivo no deja
    // corregir ni al modelo ni a quien audita después.
    await runHooks(opts.hooks ?? {}, 'PermissionDenied', {
      ...shared, tool_name: llamada.name, tool_input: llamada.input, reason: razon,
    })
    return resultado(`permiso denegado para ${llamada.name}: ${razon}`, true)
  }

  const pre = await runHooks(opts.hooks ?? {}, 'PreToolUse', { ...shared, tool_name: llamada.name, tool_input: llamada.input })
  if (pre.blocked) return resultado(`bloqueado por un hook PreToolUse: ${pre.reason ?? ''}`.trim(), true)

  let salida: { content: string; isError: boolean }
  try {
    salida = await tool.run(llamada.input, { cwd: opts.cwd, sessionId: ctx.sesionId, abort: opts.signal ?? new AbortController().signal, messages: mensajes.slice() })
  } catch (e) {
    salida = { content: `la herramienta lanzó: ${(e as Error).message}`, isError: true }
  }

  if (salida.isError) {
    // Distinto de `PostToolUse`: aquél cuenta llamadas, éste separa las que
    // fallaron. Un hook que quiera reaccionar al fallo no debería filtrar.
    await runHooks(opts.hooks ?? {}, 'PostToolUseFailure', {
      ...shared, tool_name: llamada.name, tool_input: llamada.input, tool_response: salida.content,
    })
  }
  // El tablero como emisor: `TaskCreate` y `TaskUpdate` existen desde T-019, y
  // el bucle ya sabe el nombre de la herramienta y su resultado. El evento vive
  // aquí y no dentro de la herramienta porque ésta no conoce la configuración
  // de hooks — acoplarla la ataría a un harness concreto.
  //
  // Dispara por el RESULTADO, no por el nombre: una `TaskUpdate` que falla no
  // completó nada, y un emisor que mirara sólo el nombre lo diría igual.
  if (!salida.isError) {
    if (llamada.name === 'TaskCreate') {
      await runHooks(opts.hooks ?? {}, 'TaskCreated', {
        ...shared, task_id: idDeTarea(salida.content), subject: llamada.input?.subject,
      })
    } else if (llamada.name === 'TaskUpdate' && llamada.input?.status === 'completed') {
      await runHooks(opts.hooks ?? {}, 'TaskCompleted', {
        ...shared, task_id: llamada.input?.task_id,
      })
    }
  }
  const cambio = ESCRITURAS[llamada.name]
  if (cambio && !salida.isError && typeof llamada.input?.file_path === 'string') {
    await runHooks(opts.hooks ?? {}, 'FileChanged', {
      ...shared, file_path: llamada.input.file_path, change: cambio, tool_name: llamada.name,
    })
  }
  const post = await runHooks(opts.hooks ?? {}, 'PostToolUse', {
    ...shared, tool_name: llamada.name, tool_input: llamada.input, tool_response: salida.content,
  })
  const extra = post.additionalContext.length ? `\n\n${post.additionalContext.join('\n')}` : ''
  return resultado(`${salida.content}${extra}`, salida.isError)
}

/**
 * Microcompactación (T-024): sustituye en sitio los resultados viejos.
 *
 * Muta `mensajes` a propósito — es el historial vivo del bucle, y el turno
 * siguiente tiene que verlo ya compactado. Devuelve los eventos que la
 * interfaz necesita para decirlo.
 */
async function compact(
  mensajes: Message[], opts: LoopOptions, turn: number, shared: Record<string, unknown>,
  nivel?: ContextLevel, transcript?: Transcript,
): Promise<HarnessEvent[]> {
  const umbral = opts.context?.microcompactAfter
  const compactables = collectCompactableToolIds(mensajes).length
  // Dos disparadores, y el de presión es el que manda. El ejecutable lo
  // instrumenta como `trigger: S("context_hint")`; el conteo es ciego al
  // TAMAÑO, que es lo único que mueve la aguja del `cache_read`: veinte
  // resultados de una línea no justifican purgar y tres enormes sí.
  const porPresion = nivel === 'warn' || nivel === 'compact'
  const porConteo = umbral !== undefined && compactables > umbral
  if (!porPresion && !porConteo) return []
  if (compactables === 0) return []
  const trigger: 'context_hint' | 'count' = porConteo ? 'count' : 'context_hint'
  // El PISO, antes de tocar nada: `if (d < Sdn) return null` del ejecutable.
  // Se proyecta lo que liberaría sin aplicarlo, porque preguntar «¿cuánto
  // libera?» no puede costar la reescritura que se está evaluando. Y la
  // reescritura no es gratis: rompe la caché de prompt, que es el 98 % del
  // consumo. Purgar para liberar doscientos tokens sale más caro que no
  // purgar — ejecutarla ahí causa más problemas de los que resuelve.
  //
  // Rige los DOS disparadores, no sólo el de presión: el daño es el mismo
  // venga de donde venga. Quien quiera purgar sin piso lo declara con
  // `minFreedTokens: 0`, y entonces es una decisión, no un descuido.
  const keepLast = opts.context?.keepToolResults ?? 3
  const piso = opts.context?.minFreedTokens ?? MICROCOMPACT_MIN_FREED_TOKENS
  // `piso > 0` porque un piso de CERO es la ausencia de piso, no un piso en
  // cero: sin esa distinción, un resultado más corto que el marcador —cuya
  // limpieza libera un delta negativo— seguiría vetado, y quien declaró 0
  // pidió justo lo contrario.
  if (piso > 0 && projectMicrocompact(mensajes, { keepLast }).freedTokens < piso) return []
  // `PreCompact` puede vetarla: compactar rompe la caché y borra detalle, así
  // que un hook tiene que poder decir «ahora no».
  const pre = await runHooks(opts.hooks ?? {}, 'PreCompact', { ...shared, trigger: 'micro', reason: trigger, candidates: compactables })
  if (pre.blocked) return []
  // El registro va antes de vaciar, y su fallo VETA la limpieza de ese
  // bloque: lo que no quedó registrado no se pierde por descuido.
  const destino = opts.context?.persistCleared ?? STORE_PATH
  const persistidor = destino === false ? null : makeClearedPersister({
    dbPath: destino, sessionId: String(shared.session_id), calls: toolCallIndex(mensajes),
  })
  const r = microcompact(mensajes, { keepLast, persist: persistidor?.persist })

  // Los fallos de registro se DICEN, uno por uno y con su causa, y se
  // construyen ANTES de cualquier salida temprana. Que no se limpiara nada es
  // justo el caso en que hay que decirlo: si el retorno por `cleared === 0`
  // los precediera, el unico escenario donde TODOS fallan seria tambien el
  // unico silencioso — el contexto no baja y nadie sabe por que.
  const fallos: HarnessEvent[] = r.unpersisted.map((id) => {
    const f = persistidor?.failures.get(id)
    return {
      type: 'cleared_unpersisted' as const, turn, toolUseId: id,
      reason: f?.reason ?? 'insert-fallo',
      ...(f?.detail ? { detail: f.detail } : {}),
    }
  })
  if (r.unpersisted.length > 0) {
    await runHooks(opts.hooks ?? {}, 'PostCompact', {
      ...shared, trigger: 'micro', reason: 'unpersisted', unpersisted: r.unpersisted.length,
    })
  }
  if (r.cleared.length === 0) return fallos
  const antes = estimateMessagesTokens(mensajes)
  mensajes.splice(0, mensajes.length, ...r.messages)
  // La micro deja frontera igual que la auto: la referencia la escribe tambien
  // en su camino de recorte (`ccnmt: snipCompactCore.ts:67-85`), y sin ella el
  // contexto que la microcompactacion tira no aparece en `droppedTokens`.
  transcript?.appendCompactBoundary({
    trigger: 'micro', preTokens: antes, postTokens: estimateMessagesTokens(mensajes),
  })
  await runHooks(opts.hooks ?? {}, 'PostCompact', {
    ...shared, trigger: 'micro', reason: trigger, cleared: r.cleared.length, freed_tokens: r.freedTokens,
  })
  return [...fallos,
    { type: 'compaction', turn: turn, kind: 'micro', cleared: r.cleared.length, freedTokens: r.freedTokens, trigger }]
}

/**
 * Compactación automática (T-023): el pasado se sustituye por un resumen.
 *
 * Exige `summarize` porque el resumen lo escribe un modelo, no este archivo.
 * Sin esa función el umbral se alcanza y no pasa nada — declarado, no silencioso.
 */
async function comprimirAuto(
  mensajes: Message[], opts: LoopOptions, turn: number, shared: Record<string, unknown>,
  nivel?: ContextLevel, transcript?: Transcript,
): Promise<HarnessEvent | null> {
  const resumir = opts.context?.summarize
  if (!resumir) return null
  const antes = estimateMessagesTokens(mensajes)
  // El nivel ya lo decidió: `compact` sólo se emite con la compactación activa
  // (`r.enabled && e>=p` en `fZe`), así que apagarla desactiva esta rama sin
  // que este archivo tenga que consultar el ajuste otra vez.
  if (nivel !== 'compact') return null
  const pre = await runHooks(opts.hooks ?? {}, 'PreCompact', { ...shared, trigger: 'auto', tokens: antes })
  if (pre.blocked) return null
  const arranque = Date.now()
  const summary = await resumir(mensajes)
  const r = compactMessages(mensajes, { summary, keepLast: opts.context?.keepMessages ?? 6 })
  if (r.compacted === 0) return null
  mensajes.splice(0, mensajes.length, ...r.messages)
  const despues = estimateMessagesTokens(mensajes)
  const freedTokens = antes - despues
  // La frontera va al transcript ANTES del hook: es el registro de que el
  // contexto cayo, y un hook que falle no puede dejar la sesion sin el.
  transcript?.appendCompactBoundary({
    trigger: 'auto', preTokens: antes, postTokens: despues, durationMs: Date.now() - arranque,
  })
  await runHooks(opts.hooks ?? {}, 'PostCompact', {
    ...shared, trigger: 'auto', cleared: r.compacted, freed_tokens: freedTokens,
  })
  return { type: 'compaction', turn: turn, kind: 'auto', cleared: r.compacted, freedTokens, trigger: 'context_hint' }
}
