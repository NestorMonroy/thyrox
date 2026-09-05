/**
 * Contratos del harness (T-001).
 *
 * La forma de los mensajes y de los bloques es la del API de mensajes, no una
 * invención: el harness los envía tal cual y los guarda tal cual, para que el
 * transcript sea legible por la instrumentación que ya existe
 * (`reconciliar_store.py`, `model_catalog.py sesion`).
 */

/** Un bloque de contenido dentro de un mensaje. */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  /**
   * El razonamiento extendido, con la firma que el servicio le puso.
   *
   * Viaja **verbatim**: el cliente de referencia reconoce un 400 cuyo mensaje
   * dice que estos bloques «cannot be modified» y lo clasifica como
   * `thinking_blocks_modified`. Alterarlo o dejarlo caer no degrada la
   * respuesta — invalida la petición siguiente.
   */
  | { type: 'thinking'; thinking: string; signature?: string }
  /** El mismo bloque cuando el servicio lo cifra: `data` es todo lo que hay. */
  | { type: 'redacted_thinking'; data: string }

export type Role = 'user' | 'assistant'

export type Message = { role: Role; content: ContentBlock[] }

/** Lo que el servicio cobra por turno. Los cuatro campos del API, sin renombrar. */
export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
}

export const USAGE_CERO: Usage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}

/** Por qué se detuvo un turno del modelo. Mismos valores que el API. */
export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'refusal'

/** La respuesta de un turno, ya normalizada por el adaptador de proveedor. */
export type AssistantTurn = {
  id: string
  model: string
  content: ContentBlock[]
  stop_reason: StopReason
  usage: Usage
}

/** Lo que el bucle entrega al proveedor. */
export type ProviderRequest = {
  model: string
  system: string
  tools: ToolSpec[]
  messages: Message[]
  maxTokens: number
  cacheTtl: '5m' | '1h'
  /**
   * Pedir la respuesta como SSE en vez de un JSON de una pieza (T-011).
   * El turno que vuelve es el mismo objeto en los dos casos: la diferencia es
   * que con `stream` el texto se puede leer mientras llega.
   */
  stream?: boolean
}

export interface Provider {
  readonly name: string
  send(request: ProviderRequest): Promise<AssistantTurn>
  /**
   * El texto conforme llega, con el turno completo como valor de retorno del
   * generador. **Opcional a propósito**: un proveedor que no lo implemente
   * sigue siendo válido, y el bucle cae a `send()` sin romperse.
   */
  /**
   * El incremental lleva su tipo: `text_delta` es lo dicho y `thinking_delta`
   * el razonamiento, y quien renderiza necesita distinguirlos.
   */
  stream?(request: ProviderRequest): AsyncGenerator<{ type: 'text_delta' | 'thinking_delta'; text: string }, AssistantTurn>
}

/** El contrato de una herramienta: lo que el modelo ve y lo que el harness ejecuta. */
export type ToolSpec = {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
}

export type ToolContext = {
  cwd: string
  sessionId: string
  abort: AbortSignal
  /**
   * El hilo de la sesión hasta esta llamada — una instantánea, no la
   * referencia viva: una herramienta lee el contexto, no reescribe qué mensajes
   * lo forman. Un skill `getPrompt` lo consume vía `SkillContext.messages`; sin
   * este campo el hilo llegaba vacío (#70). Las herramientas que lo ignoran no
   * pagan nada por él.
   */
  messages: Message[]
}

export type ToolResult = { content: string; isError: boolean }

export type Tool = ToolSpec & {
  /** La capacidad que la puerta de permisos evalúa antes de ejecutar. */
  permission: 'read' | 'write' | 'execute'
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}

/** Por qué terminó el bucle — no es lo mismo que por qué terminó un turno. */
/**
 * Por qué paró el bucle.
 *
 * Los dos últimos son paradas de CONTEXTO, y existen porque el ejecutable
 * 2.1.258 las tiene: `blocked` de `fZe` llega antes que el 400 del servidor
 * (`input length and \`max_tokens\` exceed context limit`), y el `trip` de
 * `rxe` corta cuando compactar dejó de servir. Sin ellas el bucle gasta un
 * turno para que el API lo rechace, o comprime en círculo.
 */
export type LoopStop =
  | 'end_turn' | 'max_turns' | 'aborted' | 'refusal' | 'permission_denied'
  | 'context_blocked' | 'compaction_thrashing'

export type LoopResult = {
  stop: LoopStop
  turns: number
  lastText: string
  usage: Usage
  sessionId: string
  transcriptPath: string
  /**
   * Lo que costó la sesión, en USD del catálogo. `null` cuando el modelo no
   * está en él — un modelo desconocido no cuesta cero, cuesta lo que no se
   * puede leer.
   */
  usd: number | null
}

/**
 * Los eventos que el bucle emite mientras corre (T-037).
 *
 * Un bucle que sólo devuelve al terminar no sirve a una interfaz: la CLI no
 * puede pintar nada hasta el final. La referencia lo resuelve exponiendo el
 * bucle como generador (`ccb: AgentLoop.test.ts` lo consume con `for await`),
 * y aquí se hace igual. `runLoop` se conserva como envoltura para quien sólo
 * quiere el resultado.
 */
export type HarnessEvent =
  | { type: 'session_start'; sessionId: string; transcriptPath: string }
  | { type: 'turn_start'; turn: number }
  /**
   * Un trozo de texto tal como llega del proveedor, antes de que el turno
   * termine. Sólo aparece con `stream`; el `text` del turno completo llega
   * después igual, así que un consumidor que lo ignore no pierde nada.
   */
  | { type: 'text_delta'; turn: number; text: string }
  | { type: 'thinking_delta'; turn: number; text: string }
  | { type: 'text'; turn: number; text: string }
  | { type: 'tool_start'; turn: number; tool: string; input: Record<string, unknown> }
  | { type: 'tool_end'; turn: number; tool: string; output: string; isError: boolean }
  | { type: 'compaction'; turn: number; kind: 'micro' | 'auto'; cleared: number;
      freedTokens: number;
      /** Qué la disparó: la presión del contexto o el conteo declarado. */
      trigger?: 'context_hint' | 'count' }
  /**
   * Un candidato que NO se limpió porque su registro falló, con su causa.
   *
   * No se calla: un fallo de registro es una señal de algo que mejorar, y
   * tragárselo lo convierte en deuda invisible. `llamada-desconocida` es la
   * que más dice — significa que la llamada quedó detrás de una frontera de
   * compactación y el índice se construye sobre los mensajes vivos.
   */
  | { type: 'cleared_unpersisted'; turn: number; toolUseId: string;
      reason: 'sin-store' | 'llamada-desconocida' | 'insert-fallo'; detail?: string }
  | { type: 'context_level'; turn: number; level: 'ok' | 'warn' | 'compact' | 'blocked' | 'unknown';
      tokens: number; pctLeft: number | null }
  /**
   * El veredicto de reconciliar el estado al reanudar tras un reinicio del
   * worker (bloque 21). Se emite una vez, al abrir una sesión con `resume`.
   * `lastTurn` dice qué estaba pasando cuando el proceso anterior murió;
   * `epoch`/`priorWorker` es el ordinal del worker (247 en la sesión que lo
   * originó); `rescatedToolUses` cuenta los `tool_use` huérfanos retirados.
   */
  | { type: 'session_reconcile'; lastTurn: 'none' | 'interrupted_turn' | 'interrupted_prompt';
      epoch: number; priorWorker: boolean; messages: number; rescuedToolUses: number }
  /**
   * El store no abrió al arranque (#26). Se emite UNA vez, temprano, en vez de
   * descubrirlo en la primera purga como `cleared_unpersisted · sin-store`. No
   * detiene el turno: el harness sigue, pero sin registro de purgas.
   */
  | { type: 'store_unavailable'; detail: string }
  | { type: 'done'; turn: number; result: LoopResult }
