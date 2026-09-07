/**
 * Puerto fiel de `ccnmt: packages/bridge/src/bridgeMessaging.ts` (462
 * líneas fuente, 100% portado — 3 type guards, `isEligibleBridgeMessage`,
 * `extractTitleText`, `handleIngressMessage`, `ServerControlRequestHandlers`
 * + `handleServerControlRequest`, `makeResultMessage`, `BoundedUUIDSet`).
 *
 * Helpers de capa de transporte compartidos para el manejo de mensajes del
 * bridge. Extraídos de replBridge.ts en la fuente para que tanto el core
 * con env (initBridgeCore) como el core sin env (initEnvLessBridgeCore)
 * usen el mismo parseo de ingress, manejo de control-request, y la
 * máquina de dedup por eco.
 *
 * Todo aquí es puro — sin closures sobre estado propio del bridge. Todos
 * los colaboradores (transporte, sessionId, sets de UUID, callbacks) se
 * pasan como parámetros.
 *
 * Import cruzado: `SDKMessage`, `SDKControlRequest`/`SDKControlResponse`,
 * `SDKResultSuccess` vienen de `@thyrox/headless-sdk` — ya portado, con la
 * MISMA forma laxa (`{ type: string; [key: string]: unknown }`) que la
 * convención `coreTypes.generated.ts` fija para stubs sin schema propio.
 * `Message` viene de `@thyrox/agent/messageShapes` — porte MÍNIMO acotado
 * a `isHumanTurn`, sin los campos `isVirtual`/`isCompactSummary`/`origin`
 * que este archivo lee; se accede vía el índice `[key: string]: unknown`
 * que el tipo ya declara, con narrowing local (no se amplía
 * `messageShapes.ts` — fuera del alcance de este pase: sólo
 * `src/packages/{daemon,bridge}/**`). `logForDebugging`, `errorMessage`,
 * `logEvent`, `jsonParse` son PUNTOS DE INYECCIÓN ya existentes en
 * `./internal/pendingCrossPackageDeps.ts`. `EMPTY_USAGE` y `PermissionMode`
 * se añaden a ese mismo archivo en este pase (ver sus docstrings ahí:
 * `EMPTY_USAGE` NO es el mismo símbolo que el ya portado en
 * `@thyrox/provider`, y `PermissionMode` es un tipo estructural nuevo
 * porque `@thyrox/permission` aún no porta `PermissionMode.ts`).
 */

import { randomUUID } from 'node:crypto'
import type { SDKMessage } from '@thyrox/headless-sdk/agentSdkTypes.js'
import type {
  SDKControlRequest,
  SDKControlResponse,
  StdoutMessage,
} from '@thyrox/headless-sdk/controlTypes.js'
import type { SDKResultSuccess } from '@thyrox/headless-sdk/coreTypes.js'
import type { Message } from '@thyrox/agent/messageShapes.js'
import {
  EMPTY_USAGE,
  errorMessage,
  jsonParse,
  logEvent,
  logForDebugging,
  normalizeControlMessageKeys,
  stripDisplayTagsAllowEmpty,
  type PermissionMode,
} from './internal/pendingCrossPackageDeps.js'
import type { ReplBridgeTransport } from './replBridgeTransport.js'

// ─── Type guards ─────────────────────────────────────────────────────────────

/** Predicado de tipo para mensajes de WebSocket parseados. SDKMessage es una
 *  unión discriminada por `type` — validar el discriminante basta para el
 *  predicado; los callers refinan más por su cuenta con la unión. */
export function isSDKMessage(value: unknown): value is SDKMessage {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  )
}

/** Predicado de tipo para mensajes control_response del servidor. */
export function isSDKControlResponse(
  value: unknown,
): value is SDKControlResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type: unknown }).type === 'control_response' &&
    'response' in value
  )
}

/** Predicado de tipo para mensajes control_request del servidor. */
export function isSDKControlRequest(
  value: unknown,
): value is SDKControlRequest {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    (value as { type: unknown }).type === 'control_request' &&
    'request_id' in value &&
    'request' in value
  )
}

/**
 * True para los tipos de mensaje que deben reenviarse al transporte del
 * bridge. El servidor sólo quiere turnos user/assistant y eventos de
 * sistema de slash-command; todo lo demás (tool_result, progress, etc.)
 * es chat interno del REPL.
 */
export function isEligibleBridgeMessage(m: Message): boolean {
  // Los mensajes virtuales (llamadas internas del REPL) son display-only —
  // los consumidores de bridge/SDK ven el tool_use/result del REPL, que
  // resume el trabajo.
  if ((m.type === 'user' || m.type === 'assistant') && m.isVirtual) {
    return false
  }
  return (
    m.type === 'user' ||
    m.type === 'assistant' ||
    (m.type === 'system' && (m as { subtype?: unknown }).subtype === 'local_command')
  )
}

/**
 * Extrae texto apto para título de un Message, para onUserMessage. Devuelve
 * undefined para mensajes que no deben titular la sesión: no-user, meta
 * (nudges), resultados de herramienta, resúmenes de compact, orígenes
 * no-humanos (notificaciones de tarea, mensajes de canal), o contenido
 * puramente de display-tags (<ide_opened_file>, <session-start-hook>, etc.).
 *
 * Los interrupts sintéticos ([Request interrupted by user]) NO se filtran
 * aquí — isSyntheticMessage vive en messages.ts (import pesado, arrastra el
 * registro de comandos). El camino initialMessages en initReplBridge lo
 * chequea; que writeMessages reciba un interrupt como PRIMER mensaje es
 * implausible (un interrupt implica que ya fluyó un prompt previo).
 */
export function extractTitleText(m: Message): string | undefined {
  if (
    m.type !== 'user' ||
    m.isMeta ||
    m.toolUseResult ||
    m.isCompactSummary
  )
    return undefined
  if (m.origin && (m.origin as { kind?: string }).kind !== 'human')
    return undefined
  const content = m.message?.content
  let raw: string | undefined
  if (typeof content === 'string') {
    raw = content
  } else if (Array.isArray(content)) {
    for (const block of content as { type?: string; text?: string }[]) {
      if (block.type === 'text') {
        raw = block.text
        break
      }
    }
  }
  if (!raw) return undefined
  const clean = stripDisplayTagsAllowEmpty(raw)
  return clean || undefined
}

// ─── Enrutamiento de ingress ─────────────────────────────────────────────────

/**
 * Parsea un mensaje de WebSocket de ingress y lo enruta al handler
 * apropiado. Ignora mensajes cuyo UUID esté en recentPostedUUIDs (ecos de
 * lo que nosotros enviamos) o en recentInboundUUIDs (re-entregas ya
 * reenviadas — p. ej. el servidor reprodujo historial tras un swap de
 * transporte que perdió el cursor de seq-num).
 */
export function handleIngressMessage(
  data: string,
  recentPostedUUIDs: BoundedUUIDSet,
  recentInboundUUIDs: BoundedUUIDSet,
  onInboundMessage: ((msg: SDKMessage) => void | Promise<void>) | undefined,
  onPermissionResponse?: ((response: SDKControlResponse) => void) | undefined,
  onControlRequest?: ((request: SDKControlRequest) => void) | undefined,
): void {
  try {
    const parsed: unknown = normalizeControlMessageKeys(jsonParse(data))

    // control_response no es un SDKMessage — se chequea antes del type guard.
    if (isSDKControlResponse(parsed)) {
      logForDebugging('[bridge:repl] Ingress message type=control_response')
      onPermissionResponse?.(parsed)
      return
    }

    // control_request del servidor (initialize, set_model, can_use_tool).
    // Hay que responder pronto o el servidor mata el WS (~10-14s timeout).
    if (isSDKControlRequest(parsed)) {
      logForDebugging(
        `[bridge:repl] Inbound control_request subtype=${(parsed.request as { subtype?: string }).subtype}`,
      )
      onControlRequest?.(parsed)
      return
    }

    if (!isSDKMessage(parsed)) return

    // Chequea si hay UUID para detectar ecos de nuestros propios mensajes.
    const uuid =
      'uuid' in parsed && typeof parsed.uuid === 'string'
        ? parsed.uuid
        : undefined

    if (uuid && recentPostedUUIDs.has(uuid)) {
      logForDebugging(
        `[bridge:repl] Ignoring echo: type=${parsed.type} uuid=${uuid}`,
      )
      return
    }

    // Dedup defensivo: descarta prompts inbound ya reenviados. El
    // carryover de seq-num de SSE (lastTransportSequenceNum) es el fix
    // primario para la reproducción de historial; esto atrapa casos
    // límite donde esa negociación falla (el servidor ignora
    // from_sequence_num, el transporte murió antes de recibir frames, etc).
    if (uuid && recentInboundUUIDs.has(uuid)) {
      logForDebugging(
        `[bridge:repl] Ignoring re-delivered inbound: type=${parsed.type} uuid=${uuid}`,
      )
      return
    }

    logForDebugging(
      `[bridge:repl] Ingress message type=${parsed.type}${uuid ? ` uuid=${uuid}` : ''}`,
    )

    if (parsed.type === 'user') {
      if (uuid) recentInboundUUIDs.add(uuid)
      logEvent('tengu_bridge_message_received', {
        is_repl: true,
      })
      // Fire-and-forget — el handler puede ser async (resolución de adjuntos).
      void onInboundMessage?.(parsed)
    } else {
      logForDebugging(
        `[bridge:repl] Ignoring non-user inbound message: type=${parsed.type}`,
      )
    }
  } catch (err) {
    logForDebugging(
      `[bridge:repl] Failed to parse ingress message: ${errorMessage(err)}`,
    )
  }
}

// ─── Control requests iniciados por el servidor ──────────────────────────────

export type ServerControlRequestHandlers = {
  transport: ReplBridgeTransport | null
  sessionId: string
  /**
   * Cuando es true, todas las requests mutables (interrupt, set_model,
   * set_permission_mode, set_max_thinking_tokens) responden con error en
   * vez de false-success. initialize sigue respondiendo success — si no,
   * el servidor mata la conexión. Lo usa el modo bridge sólo-outbound y el
   * subpath /bridge del SDK, para que claude.ai vea un error propio en vez
   * de "la acción tuvo éxito pero no pasó nada localmente".
   */
  outboundOnly?: boolean
  onInterrupt?: () => void
  onSetModel?: (model: string | undefined) => void
  onSetMaxThinkingTokens?: (maxTokens: number | null) => void
  onSetPermissionMode?: (
    mode: PermissionMode,
  ) => { ok: true } | { ok: false; error: string }
}

const OUTBOUND_ONLY_ERROR =
  'This session is outbound-only. Enable Remote Control locally to allow inbound control.'

/**
 * Responde a mensajes control_request inbound del servidor. El servidor los
 * envía para eventos de ciclo de vida de sesión (initialize, set_model) y
 * para coordinación a nivel de turno (interrupt, set_max_thinking_tokens).
 * Si no respondemos, el servidor cuelga y mata el WS tras ~10-14s.
 *
 * Antes era un closure dentro de onWorkReceived de initBridgeCore; ahora
 * toma los colaboradores como parámetros para que ambos cores lo usen.
 */
export function handleServerControlRequest(
  request: SDKControlRequest,
  handlers: ServerControlRequestHandlers,
): void {
  const {
    transport,
    sessionId,
    outboundOnly,
    onInterrupt,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
  } = handlers
  if (!transport) {
    logForDebugging(
      '[bridge:repl] Cannot respond to control_request: transport not configured',
    )
    return
  }

  let response: SDKControlResponse

  // Sólo-outbound: responde error para requests mutables, así claude.ai no
  // muestra falso éxito. initialize debe seguir teniendo éxito (el
  // servidor mata la conexión si no — ver comentario arriba).
  const req = request.request as {
    subtype: string
    model?: string
    max_thinking_tokens?: number | null
    mode?: string
    [key: string]: unknown
  }
  if (outboundOnly && req.subtype !== 'initialize') {
    response = {
      type: 'control_response',
      response: {
        subtype: 'error',
        request_id: request.request_id,
        error: OUTBOUND_ONLY_ERROR,
      },
    } as SDKControlResponse
    const event = { ...response, session_id: sessionId }
    void transport.write(event as unknown as StdoutMessage)
    logForDebugging(
      `[bridge:repl] Rejected ${req.subtype} (outbound-only) request_id=${request.request_id}`,
    )
    return
  }

  switch (req.subtype) {
    case 'initialize':
      // Responde con capacidades mínimas — el REPL maneja comandos,
      // modelos e info de cuenta por su cuenta.
      response = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: request.request_id,
          response: {
            commands: [],
            output_style: 'normal',
            available_output_styles: ['normal'],
            models: [],
            account: {},
            pid: process.pid,
          },
        },
      } as SDKControlResponse
      break

    case 'set_model':
      onSetModel?.(req.model)
      response = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: request.request_id,
        },
      } as SDKControlResponse
      break

    case 'set_max_thinking_tokens':
      onSetMaxThinkingTokens?.(req.max_thinking_tokens ?? null)
      response = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: request.request_id,
        },
      } as SDKControlResponse
      break

    case 'set_permission_mode': {
      // El callback devuelve un veredicto de política para poder mandar un
      // control_response de error sin importar isAutoModeGateEnabled /
      // isBypassPermissionsModeDisabled aquí (aislamiento de bootstrap). Si
      // no hay callback registrado (contexto daemon, que no lo cablea —
      // ver daemonBridge.ts), devuelve un veredicto de error en vez de un
      // false-success silencioso: el modo nunca se aplica de verdad en ese
      // contexto, así que un success mentiría al cliente.
      const verdict = onSetPermissionMode?.(req.mode as PermissionMode) ?? {
        ok: false,
        error:
          'set_permission_mode is not supported in this context (onSetPermissionMode callback not registered)',
      }
      if (verdict.ok) {
        response = {
          type: 'control_response',
          response: {
            subtype: 'success',
            request_id: request.request_id,
          },
        } as SDKControlResponse
      } else {
        response = {
          type: 'control_response',
          response: {
            subtype: 'error',
            request_id: request.request_id,
            error: (verdict as { ok: false; error: string }).error,
          },
        } as SDKControlResponse
      }
      break
    }

    case 'interrupt':
      onInterrupt?.()
      response = {
        type: 'control_response',
        response: {
          subtype: 'success',
          request_id: request.request_id,
        },
      } as SDKControlResponse
      break

    default:
      // Subtype desconocido — responde con error para que el servidor no
      // se quede colgado esperando una respuesta que nunca llega.
      response = {
        type: 'control_response',
        response: {
          subtype: 'error',
          request_id: request.request_id,
          error: `REPL bridge does not handle control_request subtype: ${req.subtype}`,
        },
      } as SDKControlResponse
  }

  const event = { ...response, session_id: sessionId }
  void transport.write(event as unknown as StdoutMessage)
  logForDebugging(
    `[bridge:repl] Sent control_response for ${req.subtype} request_id=${request.request_id} result=${(response.response as { subtype?: string }).subtype}`,
  )
}

// ─── Mensaje de resultado (archivado de sesión en teardown) ──────────────────

/**
 * Construye un `SDKResultSuccess` mínimo para archivar la sesión. El
 * servidor necesita este evento antes de cerrar el WS para disparar el
 * archivado.
 */
export function makeResultMessage(sessionId: string): SDKResultSuccess {
  return {
    type: 'result_success',
    subtype: 'success',
    duration_ms: 0,
    duration_api_ms: 0,
    is_error: false,
    num_turns: 0,
    result: '',
    stop_reason: null,
    total_cost_usd: 0,
    usage: { ...EMPTY_USAGE },
    modelUsage: {},
    permission_denials: [],
    session_id: sessionId,
    uuid: randomUUID(),
  } as unknown as SDKResultSuccess
}

// ─── BoundedUUIDSet (anillo de dedup por eco) ────────────────────────────────

/**
 * Set FIFO acotado, respaldado por un buffer circular. Desaloja la entrada
 * más vieja al llegar a capacidad, manteniendo el uso de memoria constante
 * en O(capacidad).
 *
 * Los mensajes se agregan en orden cronológico, así que las entradas
 * desalojadas son siempre las más viejas. El caller confía en el orden
 * externo (lastWrittenIndexRef del hook) como dedup primario — este set es
 * una red de seguridad secundaria para filtrado de eco y dedup de carreras.
 */
export class BoundedUUIDSet {
  private readonly capacity: number
  private readonly ring: (string | undefined)[]
  private readonly set = new Set<string>()
  private writeIdx = 0

  constructor(capacity: number) {
    this.capacity = capacity
    this.ring = new Array<string | undefined>(capacity)
  }

  add(uuid: string): void {
    if (this.set.has(uuid)) return
    // Desaloja la entrada en la posición actual de escritura (si ocupada).
    const evicted = this.ring[this.writeIdx]
    if (evicted !== undefined) {
      this.set.delete(evicted)
    }
    this.ring[this.writeIdx] = uuid
    this.set.add(uuid)
    this.writeIdx = (this.writeIdx + 1) % this.capacity
  }

  has(uuid: string): boolean {
    return this.set.has(uuid)
  }

  clear(): void {
    this.set.clear()
    this.ring.fill(undefined)
    this.writeIdx = 0
  }
}
