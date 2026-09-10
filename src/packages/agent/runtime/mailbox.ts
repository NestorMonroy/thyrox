/**
 * `Mailbox` — cola de mensajes asíncrona con soporte de filtro — porte de
 * `ccnmt: packages/agent/runtime/mailbox.ts`.
 *
 * Es el primitivo de paso de mensajes entre workers `teammate`: un
 * despacho equivocado del waiter produce deadlocks (el worker queda
 * bloqueado en `receive()` mientras los mensajes se acumulan en cola sin
 * que nadie los retire); un `poll` equivocado consume mensajes fuera de
 * orden. Dos rutas de entrega, y sólo una de las dos toca la cola:
 *
 *  - Si al llamar `send()` ya hay un `waiter` cuyo filtro acepta el
 *    mensaje, se le entrega directo — el mensaje NUNCA pasa por la cola
 *    (`length` se queda en 0).
 *  - Si ningún waiter lo acepta (o no hay ninguno), el mensaje se encola;
 *    un `receive()`/`poll()` posterior lo retira por FIFO, salvo que su
 *    filtro prefiera otro más viejo que sí calce primero.
 *
 * DIVERGENCIA DE ALCANCE, declarada: la fuente importa `createSignal` de
 * `@claude-code-how-works/config/signal` (`packages/config/signal.ts`,
 * 30 líneas), inexistente en este árbol. Es un primitivo trivial — un
 * `Set` de listeners con `subscribe`/`emit`/`clear`, sin lógica de red ni
 * de settings que perder — así que se reimplementa localmente como
 * `createLocalSignal` (mismo criterio que `context.ts` ya declara para su
 * reimplementación local de `readEnv`/`isEnvTruthy`). Sólo se reimplementan
 * `subscribe` y `emit`, que son los dos que este módulo consume; `clear`
 * no tiene consumidor aquí y se omite.
 */

type SignalListener = () => void

/** Reimplementación local mínima del `Signal` de `config/signal.ts` (ver arriba). */
function createLocalSignal(): {
  subscribe: (listener: SignalListener) => () => void
  emit: () => void
} {
  const listeners = new Set<SignalListener>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    emit() {
      for (const listener of listeners) listener()
    },
  }
}

export type MessageSource = 'user' | 'teammate' | 'system' | 'tick' | 'task'

export type Message = {
  id: string
  source: MessageSource
  content: string
  from?: string
  color?: string
  timestamp: string
}

/** Un receptor en espera de un mensaje que satisfaga `matches`. */
type Waiter = {
  matches: (msg: Message) => boolean
  deliver: (msg: Message) => void
}

export class Mailbox {
  private queue: Message[] = []
  private waiters: Waiter[] = []
  private readonly signal = createLocalSignal()
  private sendCount = 0

  get length(): number {
    return this.queue.length
  }

  get revision(): number {
    return this.sendCount
  }

  /**
   * Encola un mensaje o, si ya hay un waiter cuyo filtro lo acepta, se lo
   * entrega directo (nunca pasa por la cola en ese caso). El primer waiter
   * registrado cuyo filtro calce gana — no el filtro "más específico".
   */
  send(msg: Message): void {
    this.sendCount++
    const waiterIndex = this.waiters.findIndex(w => w.matches(msg))
    if (waiterIndex !== -1) {
      const [waiter] = this.waiters.splice(waiterIndex, 1)
      waiter?.deliver(msg)
      this.signal.emit()
      return
    }
    this.queue.push(msg)
    this.signal.emit()
  }

  /** Retira y devuelve el primer mensaje en cola que satisfaga `matches`, o `undefined`. */
  poll(matches: (msg: Message) => boolean = () => true): Message | undefined {
    const index = this.queue.findIndex(matches)
    if (index === -1) return undefined
    return this.queue.splice(index, 1)[0]
  }

  /**
   * Devuelve una promesa que resuelve con el primer mensaje que satisfaga
   * `matches`. Si ya hay uno en cola, resuelve de inmediato (síncrono en el
   * sentido de que no crea un waiter); si no, registra un waiter que `send()`
   * resolverá cuando llegue el mensaje correcto.
   */
  receive(matches: (msg: Message) => boolean = () => true): Promise<Message> {
    const index = this.queue.findIndex(matches)
    if (index !== -1) {
      const found = this.queue.splice(index, 1)[0]
      if (found) {
        this.signal.emit()
        return Promise.resolve(found)
      }
    }
    return new Promise<Message>(resolve => {
      this.waiters.push({ matches, deliver: resolve })
    })
  }

  subscribe = this.signal.subscribe
}
