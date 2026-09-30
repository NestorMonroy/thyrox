/**
 * Oráculo diferencial de la clase `By` (`chunk-t6pwageh.js` de 2.1.283):
 * aplica las mismas secuencias aleatorias de `setRegisteredName` y
 * `setAsideRegisteredName` a la clase de la referencia y al porte, con el
 * mismo reloj, sesión y bandera, y compara el estado y los avisos.
 */
import { SessionRegistryState } from '../../../../src/packages/local-observability/src/uds/sessionRegistryState.ts'

const raw = await Bun.file('_references/claude-code-bin/2.1.283/bunfs-root/chunk-t6pwageh.js').text()
const classText = raw.slice(386532, 388790)
if (!classText.startsWith('class By{')) throw new Error('el rango de By no empieza en la clase')
const normalize = (e: string) => e.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, n => (/\s/.test(n) ? n : '')).trim().toLowerCase().replace(/\s+/g, '-')
const signal = () => {
  const listeners = new Set<() => void>()
  return { subscribe: (fn: () => void) => (listeners.add(fn), () => listeners.delete(fn)), emit: () => listeners.forEach(fn => fn()), clear: () => listeners.clear() }
}

let seed = 20260928
// mulberry32: el producto se hace con Math.imul, porque en coma flotante el
// LCG pierde bits por encima de 2^53 y cae en un ciclo corto.
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
const names = ['foo', 'Foo', 'bar', 'baz', 'qux', 'a', 'b', 'c', 'd']
const sources = ['user', 'collision', 'auto', 'derived', 'peer']
const conversations = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10']

const snapshot = (state: any, emitted: number) =>
  JSON.stringify({ registeredName: state.registeredName, formerNames: state.formerNames, heldNames: [...state.heldNames], conversationNames: [...state.conversationNames], emitted })

const mismatches: string[] = []
const total = 3000
const realNow = Date.now
for (let run = 0; run < total; run++) {
  let clock = 1000
  let sessionId = 's1'
  let stable = random() < 0.5
  Date.now = () => clock
  const Reference = new Function('Cr', 'Y', 'Nq', 'JM', 'KKn', 'XM', 'He', `return (${classText})`)(normalize, () => sessionId, () => stable, 1e4, 3, 8, signal)
  const reference = new Reference()
  const port = new SessionRegistryState({ now: () => clock, sessionId: () => sessionId, stableAddress: () => stable })
  let referenceEmits = 0
  let portEmits = 0
  reference.registeredNameChanged.subscribe(() => void referenceEmits++)
  port.registeredNameChanged.subscribe(() => void portEmits++)
  const steps = 1 + Math.floor(random() * 25)
  for (let step = 0; step < steps; step++) {
    clock += pick([0, 1, 5000, 9999, 10000, 20000])
    if (random() < 0.2) sessionId = pick(['s1', 's2', 's3'])
    if (random() < 0.1) stable = !stable
    if (random() < 0.15) {
      const live = random() < 0.5 ? undefined : pick(conversations)
      reference.liveSessionId = live
      port.liveSessionId = live
    }
    if (random() < 0.7) {
      const name = pick(names)
      const source = pick(sources)
      const launched = random() < 0.3 ? random() < 0.5 : undefined
      reference.setRegisteredName(name, source, launched)
      port.setRegisteredName(name, source, launched)
    } else {
      const conversation = pick(conversations)
      const keep = pick(conversations)
      reference.setAsideRegisteredName(conversation, keep)
      port.setAsideRegisteredName(conversation, keep)
    }
    const left = snapshot(port, portEmits)
    const right = snapshot(reference, referenceEmits)
    if (left !== right) {
      mismatches.push(`run ${run} step ${step}: ours=${left} ref=${right}`)
      break
    }
  }
}
Date.now = realNow
console.log(`secuencias=${total} discrepancias=${mismatches.length}`)
for (const line of mismatches.slice(0, 5)) console.log(line.slice(0, 700))
process.exit(mismatches.length === 0 ? 0 : 1)
