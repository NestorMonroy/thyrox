/**
 * Codec de trama de cable para el protocolo de socket bg-pty-host.
 *
 * Puerto fiel Y COMPLETO (no un sustituto acotado, ver abajo) de
 * `ccnmt: packages/cli/src/bg/ptyFrame.ts` — es un módulo puro y
 * autocontenido (sin imports propios), así que se porta entero en vez de
 * declararlo punto de inyección. Layout de la trama:
 *
 *   ┌──────────────┬─────┬─────────────┐
 *   │ 4B length BE │ 1B  │ payload N B │
 *   └──────────────┴─────┴─────────────┘
 *
 * Byte de tag:
 *   0 (DATA_TAG)   — el payload son bytes crudos (salida/entrada de PTY)
 *   1 (CTRL_TAG)   — el payload es JSON UTF-8 `{t: <kind>, ...resto}`
 *
 * Límites: cuerpo máximo de trama = 1 MiB (FRAME_SIZE_CAP). Ring buffer
 * máximo para replay de reattach = 256 KiB (RING_BUFFER_BYTES).
 *
 * Vive aquí (en `daemon/src/internal/`, no en `@thyrox/cli`) porque el
 * hogar real del módulo —`packages/cli/src/bg/`— es dominio de otro
 * paquete fuera de las rutas de este porte; se retira de aquí cuando
 * `@thyrox/cli` porte `bg/ptyFrame` Y `@thyrox/daemon` sea miembro del
 * bun workspace.
 */

export const DATA_TAG = 0
export const CTRL_TAG = 1
export const FRAME_HEADER_BYTES = 5
/** ant 4641.js hX_ — tope del ring buffer para replay de reattach. */
export const RING_BUFFER_BYTES = 256 * 1024
/** ant 4641.js qiH — tamaño máximo del cuerpo de la trama. */
export const FRAME_SIZE_CAP = 1024 * 1024

/**
 * Forma del payload de trama de control. `ant 4702.js` despacha por `.t`:
 *   - `hello`: servidor → cliente, al conectar (lleva replPid + version)
 *   - `live`:  servidor → cliente, terminó el replay del ring buffer
 *   - `exit`:  servidor → cliente, el hijo salió (code + signal)
 *   - `resize`: cliente → servidor, pide resize del PTY
 *   - `kill`:  cliente → servidor, pide entrega de señal
 *   - `claim`: daemon → worker de repuesto, entrega intent + cwd (ant 4644.js).
 *   - `reply`: daemon → worker, encola texto como el siguiente prompt de usuario (ant 4643.js cw6).
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

/**
 * Codifica bytes crudos en una trama DATA. Espeja ant SX_ (4641.js:13-17).
 */
export function encodeDataFrame(payload: Buffer | string): Buffer {
  const body =
    typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload
  const out = Buffer.allocUnsafe(FRAME_HEADER_BYTES + body.length)
  out.writeUInt32BE(body.length, 0)
  out.writeUInt8(DATA_TAG, 4)
  body.copy(out, FRAME_HEADER_BYTES)
  return out
}

/**
 * Codifica un objeto de control en una trama CTRL. Espeja ant Vm (4641.js:18-22).
 */
export function encodeCtrlFrame(ctrl: CtrlFrame): Buffer {
  const body = Buffer.from(JSON.stringify(ctrl), 'utf8')
  const out = Buffer.allocUnsafe(FRAME_HEADER_BYTES + body.length)
  out.writeUInt32BE(body.length, 0)
  out.writeUInt8(CTRL_TAG, 4)
  body.copy(out, FRAME_HEADER_BYTES)
  return out
}
