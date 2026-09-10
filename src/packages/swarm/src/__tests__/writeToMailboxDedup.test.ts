/**
 * Tests de la clave de deduplicación que `writeToMailbox` usa para
 * descartar mensajes de protocolo reintentados.
 *
 * Procedencia: `ccnmt: packages/swarm/src/__tests__/writeToMailboxDedup.test.ts`
 * (126 líneas). Ese árbol declara `"license": "UNLICENSED"`, así que el
 * cuerpo se **reimplementa** y no se copia.
 *
 * Contexto: la implementación previa apendaba cada llamada sin condición.
 * Un `shutdown_request` reintentado con el mismo requestId apilaba cuatro
 * entradas en el buzón del destinatario; el runner procesaba la primera
 * pero la carrera del flag `read` volvía invisibles a las otras tres —
 * dejando al teammate atrapado en un limbo de "aprobado pero sin salir".
 * El fix deduplica en el sitio de escritura: si el buzón ya tiene una
 * entrada con el mismo par (type, requestId), la escritura nueva es un
 * no-op.
 *
 * Verificado al nivel del helper (`extractDedupKey`) porque el camino
 * completo de `writeToMailbox` arrastra los bindings de runtime de
 * swarm; el helper es el punto de decisión real y cubre exhaustivamente
 * cada forma de mensaje relevante para el dedup. No necesita
 * `installSwarmAppRuntime` — usa `JSON.parse` crudo, no el binding
 * `jsonParse`.
 */
import { describe, expect, test } from 'bun:test'

import { extractDedupKey } from '../mailbox/index.js'

describe('extractDedupKey — los mensajes de protocolo con requestId se dedupean', () => {
  test('shutdown_request con requestId devuelve la clave de dedup', () => {
    const text = JSON.stringify({
      type: 'shutdown_request',
      requestId: 'req-1',
      from: 'team-lead',
      timestamp: 't',
    })
    expect(extractDedupKey(text)).toEqual({
      type: 'shutdown_request',
      requestId: 'req-1',
    })
  })

  test('plan_approval_request con requestId devuelve la clave de dedup', () => {
    const text = JSON.stringify({
      type: 'plan_approval_request',
      requestId: 'plan-1',
      from: 'alice',
      plan: '...',
      timestamp: 't',
    })
    expect(extractDedupKey(text)).toEqual({
      type: 'plan_approval_request',
      requestId: 'plan-1',
    })
  })

  test('requestIds distintos producen claves distintas', () => {
    const a = extractDedupKey(
      JSON.stringify({ type: 'shutdown_request', requestId: 'r1' }),
    )
    const b = extractDedupKey(
      JSON.stringify({ type: 'shutdown_request', requestId: 'r2' }),
    )
    expect(a).toEqual({ type: 'shutdown_request', requestId: 'r1' })
    expect(b).toEqual({ type: 'shutdown_request', requestId: 'r2' })
  })

  test('tipos distintos con el mismo requestId producen claves distintas', () => {
    const a = extractDedupKey(
      JSON.stringify({ type: 'shutdown_request', requestId: 'r1' }),
    )
    const b = extractDedupKey(
      JSON.stringify({ type: 'plan_approval_request', requestId: 'r1' }),
    )
    expect(a).toEqual({ type: 'shutdown_request', requestId: 'r1' })
    expect(b).toEqual({ type: 'plan_approval_request', requestId: 'r1' })
  })
})

describe('extractDedupKey — los mensajes sin clave devuelven null', () => {
  test('texto plano devuelve null', () => {
    expect(extractDedupKey('hello there')).toBeNull()
  })

  test('JSON sin type+requestId devuelve null', () => {
    // idle_notification tiene type pero no requestId — quien llama
    // decide si quiere duplicados.
    expect(
      extractDedupKey(
        JSON.stringify({
          type: 'idle_notification',
          from: 'alice',
          timestamp: 't',
        }),
      ),
    ).toBeNull()
  })

  test('JSON con requestId pero sin type devuelve null', () => {
    expect(
      extractDedupKey(JSON.stringify({ requestId: 'r1', payload: 'x' })),
    ).toBeNull()
  })

  test('type no-string devuelve null', () => {
    expect(
      extractDedupKey(JSON.stringify({ type: 42, requestId: 'r1' })),
    ).toBeNull()
  })

  test('requestId no-string devuelve null', () => {
    expect(
      extractDedupKey(JSON.stringify({ type: 'shutdown_request', requestId: 42 })),
    ).toBeNull()
  })

  test('JSON malformado devuelve null', () => {
    expect(extractDedupKey('{not json')).toBeNull()
  })

  test('string vacío devuelve null', () => {
    expect(extractDedupKey('')).toBeNull()
  })

  test('JSON null devuelve null', () => {
    expect(extractDedupKey('null')).toBeNull()
  })

  test('array JSON devuelve null (no es un objeto)', () => {
    expect(extractDedupKey('["shutdown_request","r1"]')).toBeNull()
  })
})
