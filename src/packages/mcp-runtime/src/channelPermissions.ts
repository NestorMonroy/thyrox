/**
 * Porte COMPLETO de `ccnmt: packages/mcp-runtime/src/channelPermissions.ts`
 * — sus 7 exportaciones (2 tipos, 5 funciones/constantes), ninguna omitida.
 *
 * Repuntado (subpath declarado y símbolo verificado con resolución real):
 * `@thyrox/local-observability/slowOperations.js` (`jsonStringify`).
 *
 * `getFeatureValue_CACHED_MAY_BE_STALE` (`@claude-code-how-works/config/feature-flags`)
 * NO resuelve — el subpath no está en el `exports` de `@thyrox/config`,
 * verificado contra la lista completa del paquete. Se usa sólo dentro del
 * cuerpo de `isChannelPermissionRelayEnabled` (nunca a nivel de módulo), así
 * que se envuelve con `require()` diferido: un `import` estático de un
 * paquete cuya base (`@claude-code-how-works/*`) no existe en este árbol
 * hace fallar la carga del MÓDULO ENTERO (`Cannot find module`), no sólo la
 * función que lo usa — mismo patrón que ya evita `appStateHooks.ts` de este
 * puerto, y el mismo defecto corregido en `mcpValidation.ts`,
 * `mcpInstructionsDelta.ts`, `dateTimeParser.ts`, `claudeai.ts`,
 * `macOsKeychainHelpers.ts`, `headersHelper.ts` y `elicitationHandler.ts` de
 * este mismo puerto.
 *
 * Prompts de permiso sobre canales (Telegram, iMessage, Discord).
 *
 * Refleja `BridgePermissionCallbacks` — cuando CC llega a un diálogo de
 * permiso, TAMBIÉN manda el prompt vía los canales activos y compite la
 * respuesta contra la UI local / bridge / hooks / clasificador. El primer
 * resolver que llega gana, vía claim().
 *
 * El entrante es un evento estructurado: el servidor parsea la respuesta
 * del usuario ("yes tbxkq") y emite notifications/claude/channel/permission
 * con {request_id, behavior}. CC nunca ve la respuesta como texto — aprobar
 * requiere que el servidor emita deliberadamente ese evento específico, no
 * sólo reenviar contenido. Los servidores se suscriben declarando
 * capabilities.experimental['claude/channel/permission'].
 *
 * La pregunta de Kenneth "¿esto le permitiría a Claude auto-aprobarse?": la
 * parte que aprueba es el humano vía el canal, no Claude. Pero la frontera
 * de confianza no es la terminal — es la allowlist (tengu_harbor_ledger). Un
 * servidor de canal comprometido PUEDE fabricar "yes <id>" sin que el humano
 * vea el prompt. Riesgo aceptado: un canal comprometido ya tiene turnos
 * ilimitados de inyección en la conversación (ingeniería social a lo largo
 * del tiempo, esperar a acceptEdits, etc.); inyectar-y-auto-aprobar es más
 * rápido, no más capaz. El diálogo frena a un canal comprometido; no lo
 * detiene. Ver discusión de PR 2956440848.
 */

import { jsonStringify } from '@thyrox/local-observability/slowOperations.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '@thyrox/config/feature-flags'

/**
 * Gate de GrowthBook en tiempo de ejecución — separado del gate de canales
 * (tengu_harbor) para que los canales puedan salir sin que el relay de
 * permisos viaje pegado (Kenneth: "no bake time si sale mañana"). Default
 * false; se puede voltear sin release. Se verifica una sola vez al montar
 * useManageMCPConnections — los cambios de bandera a mitad de sesión no
 * aplican hasta reiniciar.
 */
export function isChannelPermissionRelayEnabled(): boolean {
  return getFeatureValue_CACHED_MAY_BE_STALE(
    'tengu_harbor_permissions',
    false,
  )
}

export type ChannelPermissionResponse = {
  behavior: 'allow' | 'deny'
  /** De qué servidor de canal vino la respuesta (p. ej. "plugin:telegram:tg"). */
  fromServer: string
}

export type ChannelPermissionCallbacks = {
  /** Registra un resolver para un ID de petición. Devuelve unsubscribe. */
  onResponse(
    requestId: string,
    handler: (response: ChannelPermissionResponse) => void,
  ): () => void
  /** Resuelve una petición pendiente desde un evento de canal estructurado
   *  (notifications/claude/channel/permission). Devuelve true si el ID
   *  estaba pendiente — el servidor parseó la respuesta del usuario y emitió
   *  {request_id, behavior}; aquí sólo se compara contra el mapa. */
  resolve(
    requestId: string,
    behavior: 'allow' | 'deny',
    fromServer: string,
  ): boolean
}

/**
 * Especificación del formato de respuesta que deben implementar los
 * servidores de canal:
 *   /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i
 *
 * 5 letras minúsculas, sin 'l' (se parece a 1/I). Insensible a mayúsculas
 * (autocorrección del teléfono). Sin yes/no pelado (conversacional). Sin
 * charla antes/después.
 *
 * CC genera el ID y manda el prompt. El SERVIDOR parsea la respuesta del
 * usuario y emite notifications/claude/channel/permission con {request_id,
 * behavior} — CC ya no hace match de texto por regex. Se exporta para que
 * los plugins importen el regex exacto en vez de copiarlo a mano.
 */
export const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

// Alfabeto de 25 letras: a-z menos 'l' (se parece a 1/I). Espacio 25^5 ≈ 9.8M.
const ID_ALPHABET = 'abcdefghijkmnopqrstuvwxyz'

// Lista de subcadenas a evitar — 5 letras al azar pueden deletrear cosas
// (Kenneth, en el hilo de lanzamiento: "por eso prefiero números, es difícil
// que algo sea peor que 80085"). No exhaustiva, cubre el nivel "se lo mandas
// a tu jefe por accidente". Si un ID generado contiene alguna de éstas, se
// re-hashea con una sal.
// prettier-ignore
const ID_AVOID_SUBSTRINGS = [
  'fuck',
  'shit',
  'cunt',
  'cock',
  'dick',
  'twat',
  'piss',
  'crap',
  'bitch',
  'whore',
  'ass',
  'tit',
  'cum',
  'fag',
  'dyke',
  'nig',
  'kike',
  'rape',
  'nazi',
  'damn',
  'poo',
  'pee',
  'wank',
  'anus',
]

function hashToId(input: string): string {
  // FNV-1a → uint32, luego codificado en base-25. No es criptográfico, sólo
  // un ID corto de sólo-letras estable. 32 bits / log2(25) ≈ 6.9 letras de
  // entropía; tomar 5 desperdicia un poco, de sobra para esto.
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h = h >>> 0
  let s = ''
  for (let i = 0; i < 5; i++) {
    s += ID_ALPHABET[h % 25]
    h = Math.floor(h / 25)
  }
  return s
}

/**
 * ID corto a partir de un toolUseID. 5 letras de un alfabeto de 25
 * caracteres (a-z menos 'l' — se parece a 1/I en muchas fuentes). 25^5 ≈
 * 9.8M de espacio, colisión de cumpleaños al 50% necesita ~3K prompts
 * pendientes simultáneos, absurdo para una sola sesión interactiva. Sólo
 * letras para que los usuarios de teléfono no cambien de modo de teclado
 * (hex alterna a-f/0-9 → cambios de modo). Re-hashea con un sufijo de sal si
 * el resultado contiene una subcadena bloqueada — 5 letras al azar pueden
 * deletrear cosas que no quieres en un mensaje de texto a tu teléfono.
 * Los toolUseID son `toolu_` + algo tipo base64; se hashean en vez de
 * cortarlos.
 */
export function shortRequestId(toolUseID: string): string {
  // 7 de longitud-3 × 3 posiciones × 25² + 15 de longitud-4 × 2 × 25 + 2 de
  // longitud-5 ≈ 13,877 IDs bloqueados de 9.8M — aproximadamente 1 de cada
  // 700 cae en la lista bloqueada. Tope de 10 reintentos; (1/700)^10 es
  // despreciable.
  let candidate = hashToId(toolUseID)
  for (let salt = 0; salt < 10; salt++) {
    if (!ID_AVOID_SUBSTRINGS.some(bad => candidate.includes(bad))) {
      return candidate
    }
    candidate = hashToId(`${toolUseID}:${salt}`)
  }
  return candidate
}

/**
 * Trunca el input de una herramienta a una vista previa JSON de tamaño de
 * teléfono. 200 caracteres son aproximadamente 3 líneas en una pantalla
 * angosta de teléfono. El input completo está en el diálogo de la terminal
 * local; el canal recibe un resumen para que Write(archivo-de-5KB) no
 * inunde tus mensajes de texto. El servidor decide si/cómo mostrarlo.
 */
export function truncateForPreview(input: unknown): string {
  try {
    const s = jsonStringify(input)
    return s.length > 200 ? s.slice(0, 200) + '…' : s
  } catch {
    return '(unserializable)'
  }
}

/**
 * Filtra los clientes MCP a los que pueden relevar prompts de permiso. Tres
 * condiciones, TODAS requeridas: conectado + en la allowlist --channels de
 * la sesión + declara AMBAS capacidades. La segunda capacidad es la
 * suscripción explícita del servidor — un canal sólo-relay nunca se
 * convierte en superficie de permiso por accidente (Kenneth: "los usuarios
 * pueden sorprenderse de forma desagradable"). Centralizado aquí para que
 * una futura cuarta condición aterrice en un solo lugar.
 */
export function filterPermissionRelayClients<
  T extends {
    type: string
    name: string
    capabilities?: { experimental?: Record<string, unknown> }
  },
>(
  clients: readonly T[],
  isInAllowlist: (name: string) => boolean,
): (T & { type: 'connected' })[] {
  return clients.filter(
    (c): c is T & { type: 'connected' } =>
      c.type === 'connected' &&
      isInAllowlist(c.name) &&
      c.capabilities?.experimental?.['claude/channel'] !== undefined &&
      c.capabilities?.experimental?.['claude/channel/permission'] !== undefined,
  )
}

/**
 * Factory del objeto de callbacks. El Map de pendientes queda cerrado por
 * closure — NO a nivel de módulo (según src/CLAUDE.md de ccnmt), NO en
 * AppState (funciones-en-estado causa problemas con igualdad/serialización).
 * Mismo patrón de vida que `replBridgePermissionCallbacks`: se construye una
 * vez por sesión dentro de un hook de React, referencia estable guardada en
 * AppState.
 *
 * resolve() se llama desde el manejador de notificación dedicado
 * (notifications/claude/channel/permission) con el payload estructurado. El
 * servidor ya parseó "yes tbxkq" → {request_id, behavior}; aquí sólo se
 * compara contra el mapa de pendientes. Sin regex del lado de CC — el texto
 * en el canal general no puede aprobar nada por accidente.
 */
export function createChannelPermissionCallbacks(): ChannelPermissionCallbacks {
  const pending = new Map<
    string,
    (response: ChannelPermissionResponse) => void
  >()

  return {
    onResponse(requestId, handler) {
      // Minúsculas aquí también — resolve() ya lo hace; la asimetría
      // significaría que un futuro llamador que pase un ID de mayúsculas
      // mezcladas nunca haría match en silencio. shortRequestId siempre
      // emite minúsculas así que hoy esto es un noop, pero la simetría hace
      // el contrato explícito.
      const key = requestId.toLowerCase()
      pending.set(key, handler)
      return () => {
        pending.delete(key)
      }
    },

    resolve(requestId, behavior, fromServer) {
      const key = requestId.toLowerCase()
      const resolver = pending.get(key)
      if (!resolver) return false
      // Se borra ANTES de llamar — si el resolver lanza o re-entra, la
      // entrada ya se fue. También cubre eventos duplicados (la segunda
      // emisión cae en este caso — bug del servidor o duplicado de red, se
      // ignora).
      pending.delete(key)
      resolver({ behavior, fromServer })
      return true
    },
  }
}
