/**
 * `MemoryGrantIssuer` (ADR-007 1.14.0). Qué haría fallar a esta suite: un grant
 * que no lleva la identidad completa del plan ni su generación; uno emitido
 * para una identidad incoherente; uno que sigue vigente revocado o caducado; o
 * dos grants con el mismo identificador.
 */
import { describe, expect, test } from 'bun:test'

import { resolvedArtifact } from '@thyrox/model-artifacts/testing/resolvedArtifactFixture.ts'

import { MemoryGrantIssuer } from '../memoryGrantIssuer.ts'
import type { ExecutionPlan } from '../scheduler.ts'

const ISSUED_AT = new Date('2026-10-01T10:00:00.000Z')
const TTL_MS = 60_000
const PLAN: ExecutionPlan = {
  requestId: 'request-1',
  owner: 'host-coordinator',
  residencyKey: 'residency/qwen/cpu',
  artifact: resolvedArtifact(),
  runtime: 'ollama',
  placement: { kind: 'cpu' },
  residencyVramMib: 0,
  requestVramMib: 0,
  contextLength: 4_096,
  kvCacheType: 'f16',
}

function issuerAt(clock: { now: Date }): MemoryGrantIssuer {
  let counter = 0
  return new MemoryGrantIssuer({ ttlMs: TTL_MS, now: () => clock.now, newGrantId: () => `grant-${++counter}` })
}

async function issued(issuer: MemoryGrantIssuer, plan = PLAN, generation = 3) {
  const outcome = await issuer.issue(plan, generation)
  if (outcome.status !== 'issued') throw new Error(JSON.stringify(outcome))
  return outcome.grant
}

describe('MemoryGrantIssuer', () => {
  test('el grant lleva la identidad completa, la residencia y su generación, con su plazo', async () => {
    const grant = await issued(issuerAt({ now: ISSUED_AT }))
    expect(grant).toMatchObject({
      grantId: 'grant-1', requestId: 'request-1', artifact: PLAN.artifact, runtime: 'ollama', placement: { kind: 'cpu' },
      residency: { mode: 'create', instance: PLAN.residencyKey, generation: 3 },
      contextLength: 4_096, kvCacheType: 'f16',
      issuedAt: ISSUED_AT.toISOString(), expiresAt: new Date(ISSUED_AT.getTime() + TTL_MS).toISOString(),
    })
  })

  test('cada grant tiene su propio identificador', async () => {
    const issuer = issuerAt({ now: ISSUED_AT })
    expect((await issued(issuer)).grantId).not.toBe((await issued(issuer)).grantId)
  })

  test('una identidad incoherente no recibe grant', async () => {
    const outcome = await issuerAt({ now: ISSUED_AT }).issue({ ...PLAN, artifact: { ...PLAN.artifact, quantization: 'q8_0' } }, 3)
    expect(outcome).toMatchObject({ status: 'failed', reason: expect.stringContaining('quantization') })
  })

  test('vigente al emitirlo; deja de estarlo revocado', async () => {
    const issuer = issuerAt({ now: ISSUED_AT })
    const grant = await issued(issuer)
    expect(issuer.isCurrent(grant)).toBe(true)
    expect(await issuer.revoke(grant.grantId)).toBe('revoked')
    expect(issuer.isCurrent(grant)).toBe(false)
    expect(await issuer.revoke(grant.grantId)).toBe('absent')
  })

  test('deja de estar vigente al caducar', async () => {
    const clock = { now: ISSUED_AT }
    const issuer = issuerAt(clock)
    const grant = await issued(issuer)
    clock.now = new Date(ISSUED_AT.getTime() + TTL_MS)
    expect(issuer.isCurrent(grant)).toBe(false)
  })

  test('una copia alterada de un grant emitido no está vigente', async () => {
    const issuer = issuerAt({ now: ISSUED_AT })
    const grant = await issued(issuer)
    expect(issuer.isCurrent({ ...grant, residency: { ...grant.residency, generation: 4 } })).toBe(false)
  })
})
