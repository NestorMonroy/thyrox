/**
 * Comparador de prefijo común más largo (LCP) — porte de CLIProxyAPI
 * (`sdk/cliproxy/session/lcp.go`, `MerklePrefixMatcher`, leído como
 * referencia).
 *
 * Una petición sin identidad de sesión explícita se reconoce por su
 * historia: cada prefijo de turnos tiene una clave Merkle acumulada, y la
 * trayectoria enlazada que comparta el prefijo más largo da la credencial y
 * la sesión. Un prefijo que sólo contiene instrucciones de sistema no
 * basta (un prompt de sistema compartido no prueba que dos peticiones sean
 * la misma conversación). Si la petición se aparta de la trayectoria
 * conocida es una bifurcación, con su propia sesión y la de su padre; si
 * conserva la cola de una trayectoria tras resumir su principio, es una
 * compactación y hereda la credencial.
 *
 * El índice está acotado en grupos y en entradas de prefijo (desalojo del
 * menos usado), cada grupo caduca y su generación de acceso protege un
 * enlace refrescado de un fallo que llega tarde. El reloj es inyectable.
 *
 * Divergencias declaradas:
 * - Sin candados: un solo hilo. La limpieza de caducados corre cada 128
 *   operaciones, como en la referencia.
 * - Los mapas de Go se recorren en orden aleatorio; aquí en el de
 *   inserción. Donde la referencia no desempata (dos grupos de la misma
 *   sesión con la misma cola), el resultado de Go no es determinista.
 */
import { createHash } from 'node:crypto'
import {
  type CanonicalTurn,
  environmentDigest,
  fastTurnFingerprint,
  MAX_CANONICAL_TURNS,
  minimumAffinityPrefixLength,
  writeField,
} from './canonicalTurns.ts'

const DEFAULT_MAX_TURNS = 1024
const DEFAULT_MAX_GROUPS = 4096
const DEFAULT_MAX_PREFIXES = 262144
const MIN_COMPACTION_OVERLAP_TURNS = 2
const MAX_COMPACTION_PROBE_WINDOW = 32
const MAX_TAILS_PER_KEY = 16
const DEFAULT_TTL_MS = 60 * 60 * 1000

export type MerklePrefixMatch = {
  authId: string
  sessionId: string
  parentSessionId: string
  prefixLength: number
  isFork: boolean
  isCompaction: boolean
  nodeKind: string
  accessNumber: number
}

export type MerklePrefixBindResult = {
  sessionId: string
  parentSessionId: string
  isFork: boolean
  isCompaction: boolean
  nodeKind: string
  accessNumber: number
}

export type PreparedTurns = {
  fingerprints: string[]
  minPrefixLength: number
  tailFingerprints: string[]
  envDigest: string
}

export type MerklePrefixMatcherConfig = {
  ttlMs?: number
  maxTurns?: number
  maxGroups?: number
  /** Acota las entradas grupo→prefijo del índice, no sólo los grupos. */
  maxPrefixes?: number
  now?: () => number
}

type Group = {
  key: string
  namespace: string
  authId: string
  sessionId: string
  parentSessionId: string
  minPrefixLength: number
  isFork: boolean
  isCompaction: boolean
  nodeKind: string
  environmentDigest: string
  fingerprints: string[]
  tailFingerprints: string[]
  prefixKeys: string[]
  expiresAt: number
  lastAccessNumber: number
}

type Namespace = {
  groups: Map<string, Group>
  prefixes: Map<string, Map<string, Group>>
  tails: Map<string, Set<Group>>
}

const EMPTY_BIND: MerklePrefixBindResult = { sessionId: '', parentSessionId: '', isFork: false, isCompaction: false, nodeKind: '', accessNumber: 0 }

export class MerklePrefixMatcher {
  private readonly ttlMs: number
  private readonly maxTurns: number
  private readonly maxGroups: number
  private readonly maxPrefixes: number
  private readonly now: () => number
  private namespaces = new Map<string, Namespace>()
  /** Los grupos del menos al más usado. */
  private lru = new Set<Group>()
  private groupCount = 0
  private prefixCount = 0
  private accessCounter = 0
  private operations = 0

  constructor(config: MerklePrefixMatcherConfig = {}) {
    this.ttlMs = config.ttlMs && config.ttlMs > 0 ? config.ttlMs : DEFAULT_TTL_MS
    this.maxTurns = config.maxTurns && config.maxTurns > 0 ? config.maxTurns : DEFAULT_MAX_TURNS
    this.maxGroups = config.maxGroups && config.maxGroups > 0 ? config.maxGroups : DEFAULT_MAX_GROUPS
    const maxPrefixes = config.maxPrefixes && config.maxPrefixes > 0 ? config.maxPrefixes : DEFAULT_MAX_PREFIXES
    this.maxPrefixes = Math.max(maxPrefixes, this.maxTurns)
    this.now = config.now ?? Date.now
  }

  /** Las huellas acotadas y el primer límite de prefijo admisible. */
  prepare(turns: CanonicalTurn[]): { fingerprints: string[]; minPrefixLength: number } {
    return { fingerprints: turnFingerprints(turns), minPrefixLength: minimumAffinityPrefixLength(turns) }
  }

  /** Lo de `prepare`, más las huellas de la cola real y el resumen del entorno de sistema. */
  prepareExt(turns: CanonicalTurn[]): PreparedTurns {
    const tails = turns.slice(Math.max(0, turns.length - MAX_COMPACTION_PROBE_WINDOW)).map(fastTurnFingerprint)
    return { ...this.prepare(turns), tailFingerprints: tails, envDigest: environmentDigest(turns) }
  }

  match(namespace: string, turns: CanonicalTurn[]): MerklePrefixMatch | undefined {
    const p = this.prepareExt(turns)
    return this.matchFingerprints(namespace, p.fingerprints, p.tailFingerprints, p.envDigest, p.minPrefixLength)
  }

  /** El prefijo conocido más largo, o la continuación de una compactación. */
  matchFingerprints(namespace: string, fingerprints: string[], tailFingerprints: string[], envDigest: string, minPrefixLength: number): MerklePrefixMatch | undefined {
    if (!namespace) return undefined
    const tails = tailFingerprints.length > 0 ? tailFingerprints : extractTailFingerprints(fingerprints)
    const env = envDigest || prefixEnvironmentDigest(fingerprints, minPrefixLength)
    const sane = this.sanitize(fingerprints, minPrefixLength)
    if (!sane) return undefined
    this.prepareOperation()
    return this.matchInternal(namespace, sane.fingerprints, tails, env, sane.minPrefixLength, this.now())
  }

  bindWithResult(namespace: string, turns: CanonicalTurn[], authId: string): MerklePrefixBindResult {
    const p = this.prepareExt(turns)
    return this.bindFingerprints(namespace, p.fingerprints, p.tailFingerprints, p.envDigest, p.minPrefixLength, authId)
  }

  /** Enlaza una secuencia ya preparada a una credencial y devuelve sus identidades de sesión. */
  bindFingerprints(namespace: string, fingerprints: string[], tailFingerprints: string[], envDigest: string, minPrefixLength: number, authId: string): MerklePrefixBindResult {
    if (!namespace.trim() || !authId.trim()) return { ...EMPTY_BIND }
    const tails = tailFingerprints.length > 0 ? tailFingerprints : extractTailFingerprints(fingerprints)
    const env = envDigest || prefixEnvironmentDigest(fingerprints, minPrefixLength)
    const sane = this.sanitize(fingerprints, minPrefixLength)
    if (!sane) return { ...EMPTY_BIND }
    this.prepareOperation()
    return this.bindInternal(namespace, sane.fingerprints, tails, env, sane.minPrefixLength, authId.trim(), this.now())
  }

  touch(namespace: string, turns: CanonicalTurn[], authId: string): boolean {
    const p = this.prepareExt(turns)
    return this.touchFingerprints(namespace, p.fingerprints, p.tailFingerprints, p.envDigest, p.minPrefixLength, authId)
  }

  /** Refresca una secuencia existente o la enlaza si es una extensión nueva. */
  touchFingerprints(namespace: string, fingerprints: string[], tailFingerprints: string[], envDigest: string, minPrefixLength: number, authId: string): boolean {
    if (!namespace.trim() || !authId.trim()) return false
    const tails = tailFingerprints.length > 0 ? tailFingerprints : extractTailFingerprints(fingerprints)
    const env = envDigest || prefixEnvironmentDigest(fingerprints, minPrefixLength)
    const sane = this.sanitize(fingerprints, minPrefixLength)
    if (!sane) return false
    this.prepareOperation()
    return this.touchInternal(namespace, sane.fingerprints, tails, env, sane.minPrefixLength, authId.trim(), this.now())
  }

  /**
   * Retira la secuencia exacta si sigue enlazada a la credencial y no se
   * refrescó después de `maxGeneration`; con 0, sin condición de generación.
   */
  removeFingerprintsBefore(namespace: string, fingerprints: string[], authId: string, maxGeneration: number): boolean {
    if (!namespace || !authId || fingerprints.length === 0) return false
    const bounded = fingerprints.slice(0, this.maxTurns)
    this.prepareOperation()
    const ns = this.namespaces.get(namespace)
    if (!ns) return false
    const prefixKeys = rollingPrefixKeys(bounded)
    const group = ns.groups.get(prefixKeys[prefixKeys.length - 1]!)
    if (!group || group.authId !== authId) return false
    if (maxGeneration > 0 && group.lastAccessNumber > maxGeneration) return false
    this.removeGroup(group)
    return true
  }

  /** Retira todos los enlaces de una credencial. */
  invalidateAuth(authId: string): void {
    if (!authId) return
    for (const ns of [...this.namespaces.values()]) {
      for (const group of [...ns.groups.values()]) if (group.authId === authId) this.removeGroup(group)
    }
  }

  /** Olvida todos los enlaces; el contador de generación sigue creciendo. */
  clear(): void {
    this.namespaces = new Map()
    this.lru = new Set()
    this.groupCount = 0
    this.prefixCount = 0
  }

  /** Las credenciales vivas de una sesión LCP, sin efectos ni refresco; limpia las caducadas. */
  lookupSession(sessionId: string): { authIds: string[]; namespace: string } | undefined {
    if (!sessionId) return undefined
    const now = this.now()
    const expired: Group[] = []
    const active: Group[] = []
    for (const ns of this.namespaces.values()) {
      for (const group of ns.groups.values()) {
        if (group.sessionId !== sessionId) continue
        if (now < group.expiresAt) active.push(group)
        else expired.push(group)
      }
    }
    for (const group of expired) this.removeGroup(group)
    if (active.length === 0) return undefined
    const authIds = [...new Set(active.map(group => group.authId).filter(Boolean))].sort(compareStrings)
    return authIds.length > 0 ? { authIds, namespace: active[0]!.namespace } : undefined
  }

  private sanitize(fingerprints: string[], minPrefixLength: number): { fingerprints: string[]; minPrefixLength: number } | undefined {
    if (fingerprints.length === 0 || minPrefixLength <= 0 || minPrefixLength > fingerprints.length) return undefined
    const bounded = fingerprints.length > this.maxTurns ? fingerprints.slice(0, this.maxTurns) : fingerprints
    if (minPrefixLength > bounded.length) return undefined
    return { fingerprints: bounded, minPrefixLength }
  }

  private prepareOperation(): void {
    this.operations++
    if (this.operations % 128 === 0) this.cleanup(this.now())
  }

  private namespace(name: string): Namespace {
    let ns = this.namespaces.get(name)
    if (!ns) {
      ns = { groups: new Map(), prefixes: new Map(), tails: new Map() }
      this.namespaces.set(name, ns)
    }
    return ns
  }

  private nextAccessNumber(): number {
    return ++this.accessCounter
  }

  private moveToBack(group: Group): void {
    if (this.lru.delete(group)) this.lru.add(group)
  }

  private touchInternal(namespace: string, fingerprints: string[], tails: string[], env: string, minPrefixLength: number, authId: string, now: number): boolean {
    const ns = this.namespace(namespace)
    const existing = ns.groups.get(sequenceKey(fingerprints))
    if (!existing) {
      this.bindInternal(namespace, fingerprints, tails, env, minPrefixLength, authId, now)
      return true
    }
    if (now >= existing.expiresAt) {
      this.removeGroup(existing)
      this.bindInternal(namespace, fingerprints, tails, env, minPrefixLength, authId, now)
      return true
    }
    if (existing.authId !== authId) {
      // Una credencial pendiente se adopta; otra distinta ya revinculó la secuencia y un éxito tardío no la pisa.
      if (existing.authId !== 'home-pending' && existing.authId !== '') return false
      existing.authId = authId
    }
    existing.expiresAt = now + this.ttlMs
    existing.lastAccessNumber = this.nextAccessNumber()
    existing.environmentDigest = env
    if (tails.length > 0 && !equalStrings(existing.tailFingerprints, tails)) {
      this.removeGroup(existing)
      existing.tailFingerprints = tails
      this.addGroup(existing)
    }
    this.moveToBack(existing)
    return true
  }

  private bindInternal(namespace: string, fingerprints: string[], tailFingerprints: string[], envDigest: string, minPrefixLength: number, authId: string, now: number): MerklePrefixBindResult {
    const tails = tailFingerprints.length > 0 ? tailFingerprints : extractTailFingerprints(fingerprints)
    const env = envDigest || prefixEnvironmentDigest(fingerprints, minPrefixLength)
    const ns = this.namespace(namespace)
    const key = sequenceKey(fingerprints)
    const existing = ns.groups.get(key)
    if (existing) {
      if (now < existing.expiresAt) {
        this.removeGroup(existing)
        const rebound: Group = {
          ...existing, key, namespace, authId, minPrefixLength, environmentDigest: env,
          fingerprints: [...fingerprints], tailFingerprints: tails, expiresAt: now + this.ttlMs, lastAccessNumber: this.nextAccessNumber(),
        }
        this.addGroup(rebound)
        return bindResultOf(rebound)
      }
      this.removeGroup(existing)
    }

    let identity: Omit<MerklePrefixBindResult, 'accessNumber'> = { sessionId: '', parentSessionId: '', isFork: false, isCompaction: false, nodeKind: '' }
    let boundAuth = authId
    const found = this.matchInternal(namespace, fingerprints, tails, env, minPrefixLength, now)
    if (found) {
      identity = { sessionId: found.sessionId, parentSessionId: found.parentSessionId, isFork: found.isFork, isCompaction: found.isCompaction, nodeKind: found.nodeKind }
      if (found.isCompaction && found.authId && !boundAuth) boundAuth = found.authId
    }
    const prefixKeys = rollingPrefixKeys(fingerprints)
    if (!identity.sessionId) {
      const target = minPrefixLength > 0 && minPrefixLength <= prefixKeys.length ? minPrefixLength - 1 : 0
      identity.sessionId = newLcpSessionId(namespace, prefixKeys[target] ?? '')
    }
    const created: Group = {
      key, namespace, authId: boundAuth, ...identity, minPrefixLength, environmentDigest: env,
      fingerprints: [...fingerprints], tailFingerprints: tails, prefixKeys, expiresAt: now + this.ttlMs, lastAccessNumber: this.nextAccessNumber(),
    }
    this.addGroup(created)
    return bindResultOf(created)
  }

  private addGroup(group: Group): void {
    const ns = this.namespace(group.namespace)
    if (group.prefixKeys.length === 0) group.prefixKeys = rollingPrefixKeys(group.fingerprints)
    ns.groups.set(group.key, group)
    for (const prefix of group.prefixKeys) {
      let bucket = ns.prefixes.get(prefix)
      if (!bucket) ns.prefixes.set(prefix, (bucket = new Map()))
      bucket.set(group.key, group)
    }
    const tailKey = groupTailKey(group)
    if (tailKey !== undefined) {
      let bucket = ns.tails.get(tailKey)
      if (!bucket) ns.tails.set(tailKey, (bucket = new Set()))
      bucket.add(group)
    }
    group.lastAccessNumber = this.nextAccessNumber()
    this.lru.add(group)
    this.groupCount++
    this.prefixCount += group.prefixKeys.length
    while (this.groupCount > this.maxGroups || this.prefixCount > this.maxPrefixes) {
      const oldest = this.lru.values().next()
      if (oldest.done) break
      this.removeGroup(oldest.value)
    }
  }

  private removeGroup(group: Group): void {
    const ns = this.namespaces.get(group.namespace)
    if (ns) {
      if (ns.groups.get(group.key) === group) ns.groups.delete(group.key)
      for (const prefix of group.prefixKeys) {
        const bucket = ns.prefixes.get(prefix)
        if (!bucket) continue
        bucket.delete(group.key)
        if (bucket.size === 0) ns.prefixes.delete(prefix)
      }
      const tailKey = groupTailKey(group)
      if (tailKey !== undefined) {
        const bucket = ns.tails.get(tailKey)
        if (bucket) {
          bucket.delete(group)
          if (bucket.size === 0) ns.tails.delete(tailKey)
        }
      }
      if (ns.groups.size === 0) this.namespaces.delete(group.namespace)
    }
    this.lru.delete(group)
    if (this.groupCount > 0) this.groupCount--
    this.prefixCount = this.prefixCount >= group.prefixKeys.length ? this.prefixCount - group.prefixKeys.length : 0
  }

  private matchInternal(namespace: string, fingerprints: string[], tails: string[], env: string, minPrefixLength: number, now: number): MerklePrefixMatch | undefined {
    const ns = this.namespaces.get(namespace)
    if (!ns || fingerprints.length === 0 || minPrefixLength <= 0 || minPrefixLength > fingerprints.length) return undefined
    const prefixKeys = rollingPrefixKeys(fingerprints)
    let low = minPrefixLength
    let high = fingerprints.length
    let best: Group | undefined
    let bestLength = 0
    while (low <= high) {
      const middle = low + Math.floor((high - low) / 2)
      const candidate = newestMatchingGroup(ns.prefixes.get(prefixKeys[middle - 1]!), fingerprints.slice(0, middle), now)
      if (!candidate) {
        high = middle - 1
        continue
      }
      best = candidate
      bestLength = middle
      low = middle + 1
    }
    if (!best) return this.matchCompaction(ns, namespace, fingerprints, tails, env, minPrefixLength, 0, now)

    best.expiresAt = now + this.ttlMs
    best.lastAccessNumber = this.nextAccessNumber()
    this.moveToBack(best)
    let { sessionId, parentSessionId, nodeKind } = best
    let isFork = false
    // Un prefijo común más corto que la trayectoria enlazada, con la petición siguiendo más allá, es una bifurcación.
    if (bestLength < best.fingerprints.length && fingerprints.length > bestLength) {
      // Salvo que conserve la cola de la trayectoria: entonces es una compactación.
      const compaction = this.matchCompaction(ns, namespace, fingerprints, tails, env, minPrefixLength, bestLength, now)
      if (compaction) return compaction
      isFork = true
      nodeKind = 'fork'
      parentSessionId = newLcpSessionId(namespace, prefixKeys[bestLength - 1]!)
      sessionId = newLcpSessionId(namespace, prefixKeys[bestLength]!)
    }
    return {
      authId: best.authId, sessionId, parentSessionId, prefixLength: bestLength, isFork,
      isCompaction: best.isCompaction && !isFork, nodeKind, accessNumber: best.lastAccessNumber,
    }
  }

  private matchCompaction(ns: Namespace, namespace: string, fingerprints: string[], tailFingerprints: string[], env: string, minPrefixLength: number, bestLength: number, now: number): MerklePrefixMatch | undefined {
    const candidateTail = tailFingerprints.length > 0 ? tailFingerprints : extractTailFingerprints(fingerprints)
    const n = candidateTail.length
    if (n < MIN_COMPACTION_OVERLAP_TURNS) return undefined
    let maxCandidates: Group[] = []
    let bestOverlap = 0
    let hasOverflow = false
    for (let candidateEnd = n - 1; candidateEnd >= MIN_COMPACTION_OVERLAP_TURNS - 1; candidateEnd--) {
      const tailKey = `${candidateTail[candidateEnd - 1]}\0${candidateTail[candidateEnd]}`
      const bucket = ns.tails.get(tailKey)
      if (!bucket || bucket.size === 0) continue
      // Poda perezosa de los caducados del cubo.
      let activeCount = 0
      for (const group of [...bucket]) {
        if (now >= group.expiresAt) bucket.delete(group)
        else activeCount++
      }
      if (bucket.size === 0) {
        ns.tails.delete(tailKey)
        continue
      }
      if (activeCount > MAX_TAILS_PER_KEY) {
        hasOverflow = true
        continue
      }
      for (const group of bucket) {
        if (group.environmentDigest !== env) continue
        const tails = group.tailFingerprints.length > 0 ? group.tailFingerprints : group.fingerprints
        if (tails.length < MIN_COMPACTION_OVERLAP_TURNS) continue
        const overlap = calculateOverlap(candidateTail, tails, candidateEnd, tails.length - 1)
        if (overlap < MIN_COMPACTION_OVERLAP_TURNS) continue
        if (!isCompactionOverlap(fingerprints.length, n, candidateEnd, group.fingerprints.length, tails.length, tails.length - 1, overlap, minPrefixLength, bestLength)) continue
        if (overlap > bestOverlap) {
          bestOverlap = overlap
          maxCandidates = [group]
        } else if (overlap === bestOverlap && !maxCandidates.some(existing => existing.sessionId === group.sessionId)) {
          maxCandidates.push(group)
        }
      }
    }
    if (hasOverflow || maxCandidates.length === 0) return undefined
    // Fuera los candidatos que son antepasados de otro candidato: queda la hoja del linaje.
    const leaves = maxCandidates.filter(c1 => !maxCandidates.some(c2 => c1.sessionId !== c2.sessionId && isAncestorSession(ns, c1.sessionId, c2.sessionId)))
    if (leaves.length !== 1) return undefined
    const best = leaves[0]!
    best.expiresAt = now + this.ttlMs
    best.lastAccessNumber = this.nextAccessNumber()
    this.moveToBack(best)
    return {
      authId: best.authId, sessionId: newLcpCompactionSessionId(namespace, best.sessionId, sequenceKey(fingerprints)),
      parentSessionId: best.sessionId, prefixLength: bestOverlap, isFork: false, isCompaction: true, nodeKind: 'compaction', accessNumber: best.lastAccessNumber,
    }
  }

  private cleanup(now: number): void {
    for (const ns of [...this.namespaces.values()]) {
      for (const group of [...ns.groups.values()]) if (now >= group.expiresAt) this.removeGroup(group)
    }
  }
}

const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

const bindResultOf = (group: Group): MerklePrefixBindResult => ({
  sessionId: group.sessionId, parentSessionId: group.parentSessionId, isFork: group.isFork,
  isCompaction: group.isCompaction, nodeKind: group.nodeKind, accessNumber: group.lastAccessNumber,
})

function groupTailKey(group: Group): string | undefined {
  const tails = group.tailFingerprints.length > 0 ? group.tailFingerprints : group.fingerprints
  return tails.length >= MIN_COMPACTION_OVERLAP_TURNS ? `${tails[tails.length - 2]}\0${tails[tails.length - 1]}` : undefined
}

function turnFingerprints(turns: CanonicalTurn[]): string[] {
  return turns.slice(0, MAX_CANONICAL_TURNS).map(fastTurnFingerprint)
}

function extractTailFingerprints(fingerprints: string[]): string[] {
  return fingerprints.slice(Math.max(0, fingerprints.length - MAX_COMPACTION_PROBE_WINDOW))
}

/** `fallbackEnvironmentDigest`/`environmentDigest`: el resumen de las huellas previas al primer turno útil. */
function prefixEnvironmentDigest(fingerprints: string[], minPrefixLength: number): string {
  if (minPrefixLength <= 1 || fingerprints.length === 0) return ''
  const hash = createHash('sha256')
  for (const fingerprint of fingerprints.slice(0, Math.min(minPrefixLength - 1, fingerprints.length))) writeField(hash, fingerprint)
  return hash.digest('hex')
}

function isAncestorSession(ns: Namespace, ancestorId: string, descendantId: string): boolean {
  if (!ancestorId || !descendantId || ancestorId === descendantId) return false
  let current = descendantId
  for (let depth = 0; depth < 32; depth++) {
    let parent = ''
    for (const group of ns.groups.values()) {
      if (group.sessionId === current && group.parentSessionId) {
        parent = group.parentSessionId
        break
      }
    }
    if (!parent) break
    if (parent === ancestorId) return true
    current = parent
  }
  return false
}

function isCompactionOverlap(fullCandidateLength: number, candidateTailLength: number, candidateEnd: number, fullParentLength: number, parentTailLength: number, parentEnd: number, overlap: number, minPrefixLength: number, bestLength: number): boolean {
  const candidateStartInTail = candidateEnd - overlap + 1
  const parentStart = fullParentLength - 1 - (parentTailLength - 1 - parentEnd) - overlap + 1
  const allowedStart = Math.max(minPrefixLength, bestLength + 1)
  if (candidateStartInTail > 0) {
    const candidateStartInFull = fullCandidateLength - 1 - (candidateTailLength - 1 - candidateEnd) - overlap + 1
    if (candidateStartInFull > allowedStart) return false
  }
  // Tiene que haber reducción de historia: turnos del candidato resumidos o turnos del padre truncados.
  return candidateEnd - overlap + 1 > 0 || parentStart > 0
}

function calculateOverlap(candidate: string[], parent: string[], candidateEnd: number, parentEnd: number): number {
  let overlap = 0
  while (overlap < MAX_COMPACTION_PROBE_WINDOW && candidateEnd - overlap >= 0 && parentEnd - overlap >= 0 && candidate[candidateEnd - overlap] === parent[parentEnd - overlap]) overlap++
  return overlap
}

function newestMatchingGroup(bucket: Map<string, Group> | undefined, fingerprints: string[], now: number): Group | undefined {
  let best: Group | undefined
  for (const group of bucket?.values() ?? []) {
    if (now >= group.expiresAt || group.minPrefixLength > fingerprints.length || group.fingerprints.length < fingerprints.length) continue
    if (!equalStrings(group.fingerprints.slice(0, fingerprints.length), fingerprints)) continue
    // La trayectoria más larga primero, para que un prefijo exacto no oculte una bifurcación más profunda; luego la más reciente.
    if (!best || group.fingerprints.length > best.fingerprints.length ||
      (group.fingerprints.length === best.fingerprints.length &&
        (group.lastAccessNumber > best.lastAccessNumber || (group.lastAccessNumber === best.lastAccessNumber && group.expiresAt > best.expiresAt)))) {
      best = group
    }
  }
  return best
}

/** `rollingPrefixKeys`: la clave Merkle acumulada de cada prefijo, `n:hex`. */
export function rollingPrefixKeys(fingerprints: string[]): string[] {
  let previous = Buffer.alloc(32)
  return fingerprints.map((fingerprint, index) => {
    previous = createHash('sha256').update(previous).update('\0').update(fingerprint).digest()
    return `${index + 1}:${previous.toString('hex')}`
  })
}

const sequenceKey = (fingerprints: string[]) => rollingPrefixKeys(fingerprints).at(-1) ?? ''

export function newLcpSessionId(namespace: string, firstPrefix: string): string {
  return `lcp:v1:${createHash('sha256').update(`cli-proxy-api:lcp-session:v1\0${namespace}\0${firstPrefix}`).digest('hex')}`
}

function newLcpCompactionSessionId(namespace: string, parentSessionId: string, sequence: string): string {
  return `lcp:v1:${createHash('sha256').update(`cli-proxy-api:lcp-compaction-session:v1\0${namespace}\0${parentSessionId}\0${sequence}`).digest('hex')}`
}

function equalStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}
