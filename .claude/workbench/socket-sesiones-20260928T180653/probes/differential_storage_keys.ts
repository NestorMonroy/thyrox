/**
 * Oráculo diferencial de `chunk-qbkceaaj.js` (2.1.283): el módulo entero se
 * evalúa tal cual (no importa nada) y se compara con el porte en entradas
 * generadas — nombres para las reglas de segmento, y claves de todos los
 * constructores para la forma canónica.
 */
import * as port from '../../../../src/packages/local-observability/src/storageKeys.ts'

const raw = await Bun.file('_references/claude-code-bin/2.1.283/bunfs-root/chunk-qbkceaaj.js').text()
const body = raw.replace(/export\s*\{([^}]*)\}\s*;?\s*$/, (_, names: string) => `return {${names}}`)
const reference = new Function(body)() as Record<string, any>

let seed = 20260928
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
const pieces = ['.', ' ', ':', '/', '\\', '\0', 'a', 'B', 'x', '0123456789abcdef', '.aside', '.ASIDE', '.tmp', '~', '.tmp.', '0a1b2c3d', '.purge.', '01234567-89ab-cdef-0123-456789abcdef', '.jsonl', '.JSONL', 'ñ', 'İ']
const name = () => Array.from({ length: Math.floor(random() * 6) }, () => pick(pieces)).join('')

let mismatches = 0
const report: string[] = []
const check = (label: string, left: unknown, right: unknown) => {
  const a = JSON.stringify(left)
  const b = JSON.stringify(right)
  if (a !== b) {
    mismatches++
    if (report.length < 5) report.push(`${label}: ours=${a} ref=${b}`)
  }
}

const names = 20000
for (let index = 0; index < names; index++) {
  const text = name()
  check(`cK(${JSON.stringify(text)})`, port.nameVariants(text), reference.cK(text))
  check(`qBt(${JSON.stringify(text)})`, port.isAsideName(text), reference.qBt(text))
  check(`_Uo(${JSON.stringify(text)})`, port.isTempArtifactName(text), reference._Uo(text))
  check(`jn(${JSON.stringify(text)})`, port.isValidPathSegment(text), reference.jn(text))
  check(`KBt(${JSON.stringify(text)})`, port.isJsonlName(text), reference.KBt(text))
  const segments = Array.from({ length: Math.floor(random() * 3) }, name)
  check(`sR`, port.isValidPathSegments(segments), reference.sR(segments))
}

const constructors = Object.keys(reference.Re)
check('constructores', Object.keys(port.storageKeys).sort(), [...constructors].sort())
const arg = () => (random() < 0.15 ? undefined : random() < 0.3 ? [name(), name()] : random() < 0.2 ? { year: 2026, month: 9, day: 28, agentId: name(), runId: random() < 0.5 ? undefined : name() } : name())
const keys = 20000
for (let index = 0; index < keys; index++) {
  const builder = pick(constructors)
  const args = [arg(), arg(), arg(), arg()]
  let ours: unknown
  let theirs: unknown
  try {
    ours = (port.storageKeys as any)[builder](...args)
  } catch (error) {
    ours = `throw ${(error as Error).name}`
  }
  try {
    theirs = reference.Re[builder](...args)
  } catch (error) {
    theirs = `throw ${(error as Error).name}`
  }
  check(`Re.${builder}`, ours, theirs)
  if (typeof theirs === 'object' && theirs !== null) {
    check(`mhn(${builder})`, port.storageKeyIdentity(theirs as port.StorageKey), reference.mhn(theirs))
    let other: port.StorageKey
    try {
      other = reference.Re[pick(constructors)](...[arg(), arg(), arg(), arg()])
    } catch {
      other = reference.Re[builder](...args)
    }
    check(`SUo(${builder})`, port.sameStorageKey(theirs as port.StorageKey, other), reference.SUo(theirs, other))
  }
}
check('bUo', port.transcriptRootKey('p', 's'), reference.bUo('p', 's'))
check('wUo', port.bridgeSpawnKey(), reference.wUo())
for (const relPath of [undefined, [], ['a']]) check('vUo', port.marketplaceCacheKey('m', relPath), reference.vUo('m', relPath))
check('YBt', port.TEAM_SEGMENT, reference.YBt)

console.log(`nombres=${names} claves=${keys} discrepancias=${mismatches}`)
for (const line of report) console.log(line.slice(0, 400))
process.exit(mismatches === 0 ? 0 : 1)
