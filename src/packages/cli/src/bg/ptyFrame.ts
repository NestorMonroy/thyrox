/**
 * El códec de trama del socket entre el anfitrión de PTY y sus clientes.
 *
 * Un socket entrega bytes, no mensajes: dos escrituras pueden llegar en un
 * trozo y una escritura puede llegar en cinco. El códec es lo que devuelve la
 * frontera del mensaje, y su forma es la mínima que lo consigue —longitud por
 * delante, y una etiqueta que dice cómo leer el cuerpo:
 *
 *   ┌────────────────────┬───────────────┬──────────────────┐
 *   │ 4 B longitud (BE)  │ 1 B etiqueta  │ cuerpo de N B    │
 *   └────────────────────┴───────────────┴──────────────────┘
 *
 *   etiqueta 0 (DATA_TAG) — el cuerpo son bytes crudos: salida o entrada
 *                           del PTY, que NO se interpretan
 *   etiqueta 1 (CTRL_TAG) — el cuerpo es JSON en utf-8, con `t` de tipo
 *
 * Por qué la longitud va PRIMERO y en big-endian: primero, porque el lector
 * necesita saber cuánto esperar antes de poder esperar; big-endian porque es
 * el orden de red y lo que `readUInt32BE` da sin conversión.
 *
 * Por qué los datos crudos NO pasan por JSON: la salida de un PTY es binaria
 * —secuencias de escape, UTF-8 a medias en la frontera de un trozo— y
 * envolverla en JSON obligaría a escaparla y a re-parsearla en cada trozo, que
 * es coste por byte sobre el camino más caliente del protocolo. La etiqueta
 * separa los dos regímenes y deja el caro sólo para el control, que es raro.
 *
 * Adaptación del patrón de `ccnmt: packages/cli/src/bg/ptyFrame.ts`. NO es
 * copia de su texto: ccnmt declara `"license": "UNLICENSED"` (#207).
 */

/** El cuerpo son bytes crudos, sin interpretar. */
export const DATA_TAG = 0
/** El cuerpo es JSON en utf-8. */
export const CTRL_TAG = 1
/** Longitud (4 B) + etiqueta (1 B). */
export const FRAME_HEADER_BYTES = 5
/** Tope del búfer circular de reenganche — ver `ptyRing.ts`. */
export const RING_BUFFER_BYTES = 256 * 1024
/**
 * Tope del cuerpo de una trama, INCLUSIVE: un cuerpo de exactamente este
 * tamaño es válido. Existe para que una longitud corrupta no haga reservar
 * gigabytes antes de descubrir que la trama era basura.
 */
export const FRAME_SIZE_CAP = 1024 * 1024

/**
 * Las tramas de control, por sentido:
 *
 *   `hello`     anfitrión → cliente, al conectar
 *   `live`      anfitrión → cliente, terminó la reproducción del búfer
 *   `exit`      anfitrión → cliente, el hijo terminó
 *   `heartbeat` anfitrión → cliente, sigue vivo
 *   `resize`    cliente → anfitrión, cambia el tamaño del PTY
 *   `kill`      cliente → anfitrión, manda una señal
 *   `claim`     demonio → trabajador de reserva, le entrega la intención
 *   `reply`     demonio → trabajador, encola texto como próximo turno
 */
export type CtrlFrame =
  | { t: 'hello'; replPid: number; version: string }
  | { t: 'live' }
  | { t: 'exit'; code: number; signal?: string }
  | { t: 'resize'; cols: number; rows: number }
  | { t: 'kill'; sig: 'SIGKILL' | 'SIGTERM' }
  | { t: 'claim'; intent: string; cwd?: string; sessionId?: string }
  | { t: 'reply'; text: string }
  | { t: 'heartbeat'; ts: number; state?: string }

export type DecodedFrame =
  | { kind: typeof DATA_TAG; payload: Buffer }
  | { kind: typeof CTRL_TAG; ctrl: CtrlFrame }

/** Arma una trama con su cabecera. */
function frame(tag: number, body: Buffer): Buffer {
  const out = Buffer.allocUnsafe(FRAME_HEADER_BYTES + body.length)
  out.writeUInt32BE(body.length, 0)
  out.writeUInt8(tag, 4)
  body.copy(out, FRAME_HEADER_BYTES)
  return out
}

/** Envuelve bytes crudos en una trama de datos. */
export function encodeDataFrame(payload: Buffer | string): Buffer {
  return frame(DATA_TAG, typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload)
}

/** Envuelve un objeto de control en su trama. */
export function encodeCtrlFrame(ctrl: CtrlFrame): Buffer {
  return frame(CTRL_TAG, Buffer.from(JSON.stringify(ctrl), 'utf8'))
}

/**
 * Un decodificador con estado: acepta trozos del socket y llama a `onFrame`
 * por cada trama completa.
 *
 * **Ante un error PARA y no reanuda.** Es deliberado y no es pereza: una
 * longitud fuera de rango o una etiqueta desconocida significan que el flujo
 * perdió la sincronía, y a partir de ahí no hay forma de saber dónde empieza
 * la trama siguiente — seguir leyendo produciría tramas inventadas a partir
 * de bytes que son la mitad de otra cosa. Callar el error y seguir es peor
 * que parar: entrega datos que parecen válidos.
 *
 * Rendimiento: guarda un solo `Buffer` de bytes pendientes entre llamadas, con
 * un `concat` por trozo. Es O(n) por trama y suficiente para el tráfico de un
 * PTY; si algún día el perfil lo señalara, la forma es una cola de trozos con
 * lectura por índice en vez de la concatenación.
 */
export function createFrameDecoder(
  onFrame: (f: DecodedFrame) => void,
  onError: (msg: string) => void,
): (chunk: Buffer) => void {
  let pending = Buffer.alloc(0)
  let stopped = false

  return (chunk: Buffer) => {
    if (stopped) return
    pending = pending.length === 0 ? Buffer.from(chunk) : Buffer.concat([pending, chunk])

    while (pending.length >= FRAME_HEADER_BYTES) {
      const len = pending.readUInt32BE(0)
      if (len > FRAME_SIZE_CAP) {
        stopped = true
        onError(`trama demasiado grande (${len} > ${FRAME_SIZE_CAP})`)
        return
      }
      const total = FRAME_HEADER_BYTES + len
      // Todavía no llegó entera: se espera al trozo siguiente.
      if (pending.length < total) return

      const tag = pending.readUInt8(4)
      const body = pending.subarray(FRAME_HEADER_BYTES, total)
      pending = pending.subarray(total)

      if (tag === DATA_TAG) {
        // `Buffer.from` copia: el cuerpo es una vista sobre `pending`, y quien
        // reciba la trama no debe quedar atado a un búfer que va a mutar.
        onFrame({ kind: DATA_TAG, payload: Buffer.from(body) })
      } else if (tag === CTRL_TAG) {
        let parsed: CtrlFrame
        try {
          parsed = JSON.parse(body.toString('utf8')) as CtrlFrame
        } catch {
          // Cubre también el cuerpo de longitud 0: `JSON.parse('')` lanza.
          stopped = true
          onError('json de control mal formado')
          return
        }
        onFrame({ kind: CTRL_TAG, ctrl: parsed })
      } else {
        stopped = true
        onError(`etiqueta de trama desconocida: ${tag}`)
        return
      }
    }
  }
}
