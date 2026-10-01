/**
 * Comparador LCP contra la referencia: prueba diferencial.
 *
 * `fixtures/lcp-script.jsonl` es un guion de operaciones —extraer turnos,
 * enlazar, buscar, refrescar, retirar por generación, consultar sesiones,
 * avanzar el reloj— con casos de extracción escritos a mano y 24 sesiones
 * al azar con semilla fija (generador: `probes/lcp-script.ts` del banco
 * `session-affinity-port`). `fixtures/lcp-expected.jsonl` es lo que
 * devolvió, línea a línea, el paquete de Go sin tocar
 * (`_references/cliproxyapi/sdk/cliproxy/session`) a través de
 * `probes/lcpgo`. Cada línea de aquí tiene que coincidir con la suya.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type CanonicalTurn, extractCanonicalTurns, goJsonString } from '../src/proxy/session/canonicalTurns.ts'
import { MerklePrefixMatcher } from '../src/proxy/session/lcpMatcher.ts'

type Op = {
  op: string
  format?: string
  payload?: string
  ns?: string
  auth?: string
  session?: string
  gen?: number
  gen_delta?: number
  from_last?: boolean
  ms?: number
  ttl_ms?: number
  max_turns?: number
  max_groups?: number
  max_prefixes?: number
}

const lines = (name: string) => readFileSync(join(import.meta.dir, 'fixtures', name), 'utf8').trim().split('\n')
const script = lines('lcp-script.jsonl').map(line => JSON.parse(line) as Op)
const expected = lines('lcp-expected.jsonl').map(line => JSON.parse(line) as unknown)

const START = Date.UTC(2026, 8, 27)

const turnsJson = (turns: CanonicalTurn[] | undefined) =>
  turns === undefined
    ? null
    : turns.map(turn => ({
      role: turn.role,
      parts: turn.parts.map(part => ({
        kind: part.kind,
        ...(part.mime && { mime: part.mime }),
        value: goJsonString(part.value),
        ...(part.digest && { digest: part.digest }),
        ...(part.originalSize !== 0 && { original_size: part.originalSize }),
        ...(part.sampled && { sampled: true }),
      })),
    }))
const orNull = (list: string[] | undefined) => (list && list.length > 0 ? list : null)

function replay(): unknown[] {
  let clock = START
  let matcher = new MerklePrefixMatcher({ now: () => clock })
  let lastSession = ''
  let lastAccess = 0
  return script.map(op => {
    const turns = extractCanonicalTurns(op.format ?? '', op.payload ?? '')
    switch (op.op) {
      case 'turns': {
        const prepared = matcher.prepareExt(turns ?? [])
        return { env: prepared.envDigest, fp: orNull(prepared.fingerprints), min: prepared.minPrefixLength, tail: orNull(prepared.tailFingerprints), turns: turnsJson(turns) }
      }
      case 'new':
        matcher = new MerklePrefixMatcher({ ttlMs: op.ttl_ms, maxTurns: op.max_turns, maxGroups: op.max_groups, maxPrefixes: op.max_prefixes, now: () => clock })
        return { ok: true }
      case 'advance':
        clock += op.ms ?? 0
        return { ok: true }
      case 'match': {
        const found = matcher.match(op.ns ?? '', turns ?? [])
        if (found) [lastSession, lastAccess] = [found.sessionId, found.accessNumber]
        return { match: goMatch(found), ok: found !== undefined }
      }
      case 'bind': {
        const bound = matcher.bindWithResult(op.ns ?? '', turns ?? [], op.auth ?? '')
        if (bound.sessionId) [lastSession, lastAccess] = [bound.sessionId, bound.accessNumber]
        return goBind(bound)
      }
      case 'touch':
        return { ok: matcher.touch(op.ns ?? '', turns ?? [], op.auth ?? '') }
      case 'remove': {
        const generation = op.from_last ? Math.max(0, lastAccess + (op.gen_delta ?? 0)) : (op.gen ?? 0)
        const { fingerprints } = matcher.prepare(turns ?? [])
        return { gen: generation, ok: matcher.removeFingerprintsBefore(op.ns ?? '', fingerprints, op.auth ?? '', generation) }
      }
      case 'lookup': {
        const found = matcher.lookupSession(op.from_last ? lastSession : (op.session ?? ''))
        return { auths: found ? found.authIds : null, ns: found?.namespace ?? '', ok: found !== undefined }
      }
      case 'invalidate':
        matcher.invalidateAuth(op.auth ?? '')
        return { ok: true }
      case 'clear':
        matcher.clear()
        return { ok: true }
      default:
        return { error: `op desconocida: ${op.op}` }
    }
  })
}

function goMatch(match: ReturnType<MerklePrefixMatcher['match']>) {
  return {
    AuthID: match?.authId ?? '', SessionID: match?.sessionId ?? '', ParentSessionID: match?.parentSessionId ?? '',
    PrefixLength: match?.prefixLength ?? 0, IsFork: match?.isFork ?? false, IsCompaction: match?.isCompaction ?? false,
    NodeKind: match?.nodeKind ?? '', AccessNumber: match?.accessNumber ?? 0,
  }
}

function goBind(bound: ReturnType<MerklePrefixMatcher['bindWithResult']>) {
  return {
    SessionID: bound.sessionId, ParentSessionID: bound.parentSessionId, IsFork: bound.isFork,
    IsCompaction: bound.isCompaction, NodeKind: bound.nodeKind, AccessNumber: bound.accessNumber,
  }
}

describe('comparador LCP: diferencial contra Go', () => {
  test('el guion y la salida de Go tienen las mismas líneas', () => {
    expect(expected.length).toBe(script.length)
  })

  const actual = replay()
  test.each(script.map((op, index) => [index + 1, op.op] as const))('línea %d (%s)', index => {
    expect(actual[index - 1]).toEqual(expected[index - 1])
  })
})
