/**
 * El paso `session.receive`: antes de encolar un mensaje entrante, los
 * módulos que escuchan esa señal pueden dejarlo pasar, reescribir su texto o
 * consumirlo. Porte de `Aot`, `NXe`, `R_e`, `WCt`, `jCt`, `Q0n`, `BXe`,
 * `HXe`, `jXe`, `FXe` y `$Xe` (`chunk-csayct82.js`) y de `Me`
 * (`chunk-0sxn6jc6.js`) de 2.1.283.
 *
 * La entrega se modela como un núcleo al fondo de la cadena de manejadores:
 * si la señal llega hasta él, la entrega «llegó» y el llamador la encola; el
 * núcleo contesta a la cadena cuando se encoló (`queued`) o con un error si
 * se soltó sin encolar. Si la cadena termina antes de que la señal llegue al
 * núcleo, un manejador la consumió.
 *
 * El runtime de módulos que ejecuta la cadena (`Ml`, `Vp`, `Xot` y lo que
 * usan) llega como `HookSite`; su porte es la serie MOD.
 */
import { stripHopChain } from './peerEnvelope.ts'

export const SESSION_RECEIVE = 'session.receive'
/** `FXe`. */
export const CONSUMED_WITHOUT_REASON = 'a hook answered without passing the delivery on'
/** `$Xe`. */
export const NOT_QUEUED_REASON = 'session.receive: the delivery was not queued (the drain refused or held it after the hooks passed it on)'

/** `Me`. */
export class HooksError extends Error {
  override name = 'HooksError'
  readonly telemetryMessage = 'function hooks error (message not reported: it may contain plugin details)'
  thrownName: string | undefined
}

export type ReceiveOrigin = { kind: string; [field: string]: unknown }
export type ContentBlock = { type: string; text?: string; [field: string]: unknown }
export type ReceiveEvent = { origin: ReceiveOrigin; text: string; event?: unknown; agentId?: string }
export type ReceiveArrival = { text: string }
export type ReceiveAnswer = { consumed?: string } & Record<string, unknown>

/** El núcleo que la cadena ejecuta al fondo (`Q0n`). */
export type HookCore = { name: 'core'; isCore: true; budgetMs: 0; run: (event: ReceiveEvent) => Promise<unknown> }

/** Lo que el runtime de módulos ofrece a este paso. */
export interface HookSite {
  /** `Vp`: si algún módulo cargado escucha la señal con este filtro. */
  hasHandlers: (name: string, filter: Record<string, unknown>) => boolean
  /** `Ml`: ejecuta la cadena de la señal con este núcleo al fondo. */
  call: (name: string, core: HookCore) => (event: ReceiveEvent) => Promise<unknown>
  /** `Xot`: los módulos que escuchan la señal con este filtro. */
  hookedBy: (name: string, filter: Record<string, unknown>) => string[]
}

export type ReceiveQueueing = { queued(): void; [Symbol.dispose](): void }

/** `HXe`: la reserva de cuando nadie escucha. */
const NO_QUEUEING: ReceiveQueueing = Object.freeze({ queued: () => {}, [Symbol.dispose]: () => {} })

/** `R_e`. */
function joinTextBlocks(blocks: readonly ContentBlock[], separator: string): string {
  return blocks.flatMap(block => (block.type === 'text' && block.text !== undefined ? [block.text] : [])).join(separator)
}

/** `NXe`: el texto que ven los hooks; de un par, sin la cadena de saltos. */
export function receiveText(origin: ReceiveOrigin, content: string | readonly ContentBlock[]): string {
  const clean = origin.kind === 'peer' ? stripHopChain : (text: string) => text
  if (typeof content === 'string') return clean(content)
  return joinTextBlocks(content.map(block => (block.type === 'text' ? { ...block, text: clean(block.text!) } : block)), '\n')
}

/** `jXe`: el contenido con el texto reescrito; con bloques, el texto primero y los no textuales detrás. */
function withText(content: string | readonly ContentBlock[], text: string): string | ContentBlock[] {
  return typeof content === 'string' ? text : [{ type: 'text', text }, ...content.filter(block => block.type !== 'text')]
}

type Delivery = {
  perform: (event: ReceiveEvent) => Promise<unknown>
  arrived: Promise<ReceiveEvent>
  hasArrived: () => boolean
  done: (answer: ReceiveArrival) => void
  failed: (error: unknown) => void
  [Symbol.dispose]: () => void
}

/** `WCt`: la entrega como núcleo: se marca al llegar y se contesta una sola vez. */
function createDelivery(notQueuedMessage: string): Delivery {
  const arrival = Promise.withResolvers<ReceiveEvent>()
  const answer = Promise.withResolvers<unknown>()
  let arrived = false
  let settled = false
  answer.promise.catch(() => {})
  const failed = (error: unknown) => {
    if (!settled) {
      settled = true
      answer.reject(error)
    }
  }
  return {
    perform(event) {
      if (!arrived) {
        arrived = true
        arrival.resolve(event)
      }
      return answer.promise
    },
    arrived: arrival.promise,
    hasArrived: () => arrived,
    done(result) {
      if (!settled) {
        settled = true
        answer.resolve(result)
      }
    },
    failed,
    [Symbol.dispose]: () => failed(new HooksError(notQueuedMessage)),
  }
}

/** `jCt`: o la entrega llega al núcleo, o la cadena contesta antes; en ese caso se suelta. */
async function awaitArrival(delivery: Delivery, chain: Promise<unknown>): Promise<{ arrived: ReceiveEvent } | { arrived?: undefined; answered: unknown }> {
  await Promise.race([delivery.arrived, chain.then(() => undefined, () => undefined)])
  if (delivery.hasArrived()) return { arrived: await delivery.arrived }
  delivery[Symbol.dispose]()
  return { answered: await chain }
}

export type ReceiveInput = { origin: ReceiveOrigin; content: string | readonly ContentBlock[]; event?: unknown; agentId?: string }
export type ReceiveResult = { consumed: string } | { consumed?: undefined; content: string | readonly ContentBlock[]; queueing: ReceiveQueueing }

/** `Aot`. */
export async function runSessionReceive(input: ReceiveInput, site: HookSite, log: (message: string) => void): Promise<ReceiveResult> {
  const { origin, content, event, agentId } = input
  const filter = { origin, ...(agentId !== undefined && { agentId }) }
  if (!site.hasHandlers(SESSION_RECEIVE, filter)) return { content, queueing: NO_QUEUEING }
  const text = receiveText(origin, content)
  const delivery = createDelivery(NOT_QUEUED_REASON)
  const core: HookCore = { name: 'core', isCore: true, budgetMs: 0, run: received => delivery.perform(received) }
  const outcome = await awaitArrival(
    delivery,
    site.call(SESSION_RECEIVE, core)({ origin, text, ...(event !== undefined && { event }), ...(agentId !== undefined && { agentId }) }),
  )
  if (outcome.arrived === undefined) {
    const reason = (outcome.answered as ReceiveAnswer).consumed ?? CONSUMED_WITHOUT_REASON
    log(`session.receive (${origin.kind}): consumed by a hook (${reason}; hooked by ${site.hookedBy(SESSION_RECEIVE, filter).join('+')}); not queued`)
    return { consumed: reason }
  }
  const arrived = outcome.arrived
  return {
    content: arrived.text === text ? content : withText(content, arrived.text),
    queueing: { queued: () => delivery.done({ text: arrived.text }), [Symbol.dispose]: delivery[Symbol.dispose] },
  }
}
