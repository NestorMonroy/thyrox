/**
 * Protocolo de cable del socket del daemon.
 *
 * Envoltorio: cada request y response es un único objeto JSON seguido de
 * un terminador `\n`. `ant 4138.js` usa el mismo formato (línea 64-67:
 * `EH(H) + "\n"`).
 *
 * Versión de protocolo: ant usa `proto: W5` donde W5 es una constante que
 * se incrementa en cambios incompatibles. ccb la espeja como
 * `PROTO_VERSION` = 1 por ahora; se sube si cambia la semántica de framing.
 *
 * Op codes (CLI → Daemon salvo que se indique lo contrario):
 *   ping            — chequeo de vivacidad
 *   nudge           — sondea el estado de reinicio del daemon (devuelve {restarting})
 *   list            — enumera workers activos
 *   spawn           — crea una sesión bg nueva (con envoltorio de despacho)
 *   dispatch        — ruta de despacho alterna; toma nonce + archivo de spool
 *   await-ack       — espera el ACK de spawn/dispatch por nonce
 *   subscribe       — transmite la salida del worker (snapshot + delta)
 *   attach          — abre el socket de claim por job (handshake al PTY)
 *   resize          — propaga el resize de ventana desde el cliente
 *   kill            — señaliza al worker; devuelve {confirmed: bool}
 *   respawn         — kill + reinicio del mismo id corto
 *   retire          — programa el retiro tras idleGracePeriodMs
 *   shutdown        — apagado ordenado del daemon
 *   reply           — envía input de texto a un worker bloqueado
 *   attacher-caps   — anuncia las capacidades del cliente
 *   lease           — heartbeat de keepalive desde el cliente CLI
 *
 * Más los ops worker → daemon del lado del daemon (sólo hacia adelante):
 *   heartbeat, state, done, detach-request
 *
 * Puerto fiel de `ccnmt: packages/daemon/src/socketProto.ts`.
 */

export const PROTO_VERSION = 1

export type ProtoOp =
  | 'ping'
  | 'nudge'
  | 'list'
  | 'spawn'
  | 'dispatch'
  | 'await-ack'
  | 'subscribe'
  | 'attach'
  | 'resize'
  | 'kill'
  | 'respawn'
  | 'retire'
  | 'shutdown'
  | 'reply'
  | 'sendclaim'
  | 'respawn-stalled'
  | 'detach'
  | 'yield'
  | 'attacher-caps'
  | 'lease'

export interface BaseRequest {
  proto: number
  op: ProtoOp
}

export interface OkResponse {
  ok: true
  op?: ProtoOp
  [k: string]: unknown
}

export interface ErrorResponse {
  ok: false
  code:
    | 'ENOCONN'
    | 'ETIMEOUT'
    | 'ENOJOB'
    | 'ESTALE'
    | 'EALIVE'
    | 'EBUSY'
    | 'EBADREQ'
    | 'EUNSUPPORTED'
    | string
  error: string
  [k: string]: unknown
}

export type Response = OkResponse | ErrorResponse

/** Codifica un request/response como el envoltorio de cable (JSON + LF). */
export function encodeFrame(obj: object): string {
  return `${JSON.stringify(obj)}\n`
}

/**
 * Guarda contra desbordamiento por línea. El servidor rv de `ant 4291.js`
 * acota su buffer entrante a 1 MiB (`if(q.length>1048576)q="",_.destroy()`)
 * para que un peer que nunca manda un newline no pueda crecer el buffer
 * pendiente sin límite. Las tramas de protocolo legítimas (envoltorios RPC,
 * tramas de control rv) son líneas JSON diminutas, muy por debajo de este
 * tope, así que sólo se dispara ante un peer atascado u hostil.
 */
const MAX_PENDING_LINE_BYTES = 1024 * 1024

/**
 * Decodificador de línea con estado para datos de socket. Llama a
 * `onMessage` una vez por cada línea JSON completa terminada en `\n`;
 * llama a `onError` y se detiene ante input malformado o una sola línea
 * que exceda MAX_PENDING_LINE_BYTES.
 */
export function createLineDecoder(
  onMessage: (msg: unknown) => void,
  onError: (msg: string) => void,
): (chunk: string | Buffer) => void {
  let buf = ''
  let stopped = false
  return (chunk: string | Buffer) => {
    if (stopped) return
    buf += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    while (true) {
      const idx = buf.indexOf('\n')
      if (idx < 0) {
        // Sin línea completa todavía — acotar el buffer pendiente (ant 4291.js).
        if (buf.length > MAX_PENDING_LINE_BYTES) {
          stopped = true
          buf = ''
          onError(
            `protocol line exceeds ${MAX_PENDING_LINE_BYTES} bytes without terminator`,
          )
        }
        return
      }
      const line = buf.slice(0, idx)
      buf = buf.slice(idx + 1)
      if (line.length === 0) continue
      try {
        onMessage(JSON.parse(line))
      } catch (err) {
        stopped = true
        onError(`bad protocol line: ${(err as Error).message}`)
        return
      }
    }
  }
}
