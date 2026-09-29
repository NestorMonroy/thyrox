/**
 * Contrato IPC entre el supervisor (`main.ts`) y el proceso worker que
 * arranca (`workerRegistry.ts`, `claude --daemon-worker=<kind>`).
 *
 * Puerto de las piezas de IPC de `class Ue` (`chunk-92tvramn.js`,
 * referencia 2.1.283, resueltas con `bin/binary symbol`):
 *
 *   - bootstrap por stdin: `n.stdin.write(b({config:this.config,
 *     initialAccessToken:this.authManager?.getAccessToken()})+"\n"),
 *     n.stdin.end()` (en `Ue.spawn`).
 *   - mensaje `shutdown` por el canal IPC: `e.send(r!==void 0?
 *     {type:"shutdown",cause:r}:{type:"shutdown"})`, con `catch{}`
 *     silencioso (en `Ue.stop`) y escalada a SIGKILL tras `yr`=5000ms:
 *     `setTimeout((h)=>h.kill("SIGKILL"),yr,e)`.
 *   - mensajes worker→supervisor `rc_busy`/`rc_serving_tools`, validados
 *     con guardas de forma exactas (en el `n.on("message", ...)` de
 *     `Ue.spawn`); `Ybn`=64 es el tope de `count`.
 *
 * `b` es `JSON.stringify` (porte directo, sin equivalente propio en este
 * paquete).
 */

/** Tope de `count` en `rc_serving_tools` — `Ybn` (`chunk-egkwesgj.js`). */
export const MAX_SERVED_TOOLS_COUNT = 64

/**
 * Plazo de gracia entre mandar el mensaje `shutdown` (o SIGTERM) y
 * escalar a SIGKILL — `yr` (`chunk-92tvramn.js`, `class Ue`).
 */
export const WORKER_SHUTDOWN_SIGKILL_GRACE_MS = 5_000

/** Payload que el supervisor manda por stdin al arrancar el worker. */
export interface WorkerBootstrapPayload {
  config: unknown
  initialAccessToken?: string
}

/** El worker avisa que empezó/dejó de estar ocupado sirviendo una sesión. */
export interface WorkerBusyMessage {
  type: 'rc_busy'
  busy: boolean
}

/** El worker avisa cuántas sesiones remoteControl está sirviendo. */
export interface WorkerServingToolsMessage {
  type: 'rc_serving_tools'
  count: number
}

export type WorkerToSupervisorMessage = WorkerBusyMessage | WorkerServingToolsMessage

/** El supervisor pide al worker que se apague de forma ordenada. */
export interface WorkerShutdownMessage {
  type: 'shutdown'
  cause?: string
}

/**
 * Codifica el bootstrap para escribirlo por stdin. Porte de
 * `` b({config,initialAccessToken})+"\n" `` (`b`=`JSON.stringify`).
 */
export function encodeWorkerBootstrap(payload: WorkerBootstrapPayload): string {
  return `${JSON.stringify(payload)}\n`
}

/**
 * Mínima superficie de un stdin escribible que este módulo necesita —
 * evita acoplar la firma a `NodeJS.WritableStream` completo.
 */
export interface WritableStdinLike {
  write(chunk: string): boolean
  end(): void
  on(event: 'error', listener: (error: Error) => void): unknown
}

/**
 * Escribe el bootstrap y cierra stdin — porte de `n.stdin.write(...),
 * n.stdin.end()`. `onError` es el listener de `n.stdin.on("error", ...)`
 * que la referencia registra antes de escribir; aquí se registra en el
 * mismo orden si se provee.
 */
export function writeWorkerBootstrap(
  stdin: WritableStdinLike,
  payload: WorkerBootstrapPayload,
  onError?: (error: Error) => void,
): void {
  if (onError) stdin.on('error', onError)
  stdin.write(encodeWorkerBootstrap(payload))
  stdin.end()
}

/**
 * Valida un mensaje entrante worker→supervisor. Porte exacto de las
 * guardas de forma del `n.on("message", (u) => {...})` de `Ue.spawn`:
 * `rc_busy` exige `busy: boolean`; `rc_serving_tools` exige `count`
 * entero en `[0, MAX_SERVED_TOOLS_COUNT]`. Cualquier otra forma —
 * incluido `null`/no-objeto/tipo desconocido— devuelve `undefined`, la
 * misma degradación segura que la referencia aplica dejando el mensaje
 * sin efecto.
 */
export function parseWorkerToSupervisorMessage(
  raw: unknown,
): WorkerToSupervisorMessage | undefined {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) return undefined
  const message = raw as Record<string, unknown>
  if (message.type === 'rc_busy' && 'busy' in message && typeof message.busy === 'boolean') {
    return { type: 'rc_busy', busy: message.busy }
  }
  if (
    message.type === 'rc_serving_tools' &&
    'count' in message &&
    typeof message.count === 'number' &&
    Number.isInteger(message.count) &&
    message.count >= 0 &&
    message.count <= MAX_SERVED_TOOLS_COUNT
  ) {
    return { type: 'rc_serving_tools', count: message.count }
  }
  return undefined
}

/**
 * Arma el mensaje de apagado ordenado — porte exacto de
 * `` r!==void 0?{type:"shutdown",cause:r}:{type:"shutdown"} ``: la clave
 * `cause` está ausente (no `undefined`) cuando no se provee causa.
 */
export function buildWorkerShutdownMessage(cause?: string): WorkerShutdownMessage {
  return cause !== undefined ? { type: 'shutdown', cause } : { type: 'shutdown' }
}

/**
 * Mínima superficie de un child con canal IPC que este módulo necesita.
 * `send` va en sintaxis de método (no de propiedad-flecha) para que la
 * comparación de parámetros sea bivariante y `ChildProcess` —cuyo `send`
 * real exige `Serializable`, más angosto que `unknown`— siga siendo un
 * `IpcSendable` válido.
 */
export interface IpcSendable {
  send?(message: unknown): boolean
}

/**
 * Manda el mensaje de apagado por el canal IPC. Porte de:
 * `` if(typeof e.send==="function")try{n=e.send(...)}catch{} ``. Un
 * `send` ausente o que lanza se degrada en silencio a `false` — el
 * llamador decide entonces mandar SIGTERM (mismo criterio que
 * `Ue.stop`: `if(O()!=="windows"||!n)e.kill("SIGTERM")`).
 */
export function sendWorkerShutdownMessage(child: IpcSendable, cause?: string): boolean {
  if (typeof child.send !== 'function') return false
  try {
    return child.send(buildWorkerShutdownMessage(cause))
  } catch {
    return false
  }
}

/**
 * Mínima superficie de un proceso matable que este módulo necesita.
 * `signal` es `NodeJS.Signals` (no `string` a secas) y el retorno es
 * `unknown` para que `ChildProcess.kill` —que devuelve `boolean` y sólo
 * acepta `NodeJS.Signals | number`— siga siendo un `KillableLike` válido.
 */
export interface KillableLike {
  kill(signal: NodeJS.Signals): unknown
}

/**
 * Programa el SIGKILL de gracia tras mandar `shutdown`/SIGTERM — porte
 * de `` let a=setTimeout((h)=>h.kill("SIGKILL"),yr,e); a.unref() ``. El
 * llamador limpia el timer (`clearTimeout`) cuando el worker ya salió.
 */
export function scheduleForceKill(
  target: KillableLike,
  graceMs: number = WORKER_SHUTDOWN_SIGKILL_GRACE_MS,
): NodeJS.Timeout {
  const timer = setTimeout(() => target.kill('SIGKILL'), graceMs)
  timer.unref()
  return timer
}
