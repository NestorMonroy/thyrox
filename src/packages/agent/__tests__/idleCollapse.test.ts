/**
 * Porte de `ccnmt: packages/agent/__tests__/idleCollapse.test.ts`.
 *
 * Tests for the idle-notification collapse policy in
 * packages/agent/attachments/mailbox.ts.
 *
 * The previous policy ("keep only the latest idle per sender") was
 * too aggressive — it discarded mid-turn transitions
 * (`available → interrupted → available`), changing peer-DM summaries,
 * and per-task completion idles, leaving the leader blind to
 * teammate progress.
 *
 * The new policy: drop only idle notifications that are byte-for-byte
 * identical to the immediately-previous idle from the same sender. A
 * non-idle message between idles resets the sender's run.
 *
 * `collapseConsecutiveIdleDuplicates` is a pure function — easy to
 * verify in isolation. The fixture builds raw mailbox messages and
 * checks which ones survive.
 *
 * DIVERGENCIA DE INFRAESTRUCTURA, declarada (ver
 * `../attachments/mailbox.ts` para el detalle completo): la fuente
 * importa `createIdleNotification` de `@claude-code-how-works/swarm` e
 * instala `installSwarmAppRuntime`/`_test_resetSwarmAppRuntime` con
 * ~90 claves de binding simuladas — un paquete y una capa de inyección
 * que este árbol no tiene. El puerto local de
 * `collapseConsecutiveIdleDuplicates` llama `JSON.parse` directo (sin
 * binding de host), así que esa verificación no aplica aquí; en su
 * lugar se instala `AgentHostBindings` vacío (`../host.ts`) porque
 * `logForDebugging` (`../internal/logging.ts`) lanza `HostBindingsError`
 * sin host instalado — mismo patrón que
 * `__tests__/goalStopHook.test.ts` ya establece. Este `beforeAll` no es
 * un caso de test — no cuenta para el gate de fidelidad.
 */
import { beforeAll, describe, expect, test } from 'bun:test'

import { installAgentHostBindings } from '../host.ts'
import type { AgentHostBindings } from '../host.ts'
import {
  collapseConsecutiveIdleDuplicates,
  createIdleNotification,
  type RawMessage,
} from '../attachments/mailbox.ts'

beforeAll(() => {
  // Ataduras de host vacías — logForDebugging cae al no-op vía
  // optional-chain en vez de lanzar HostBindingsError.
  installAgentHostBindings({} as AgentHostBindings)
})

function idleMsg(
  from: string,
  options?: Parameters<typeof createIdleNotification>[1],
): RawMessage {
  return {
    from,
    text: JSON.stringify(createIdleNotification(from, options)),
    timestamp: 'x',
  }
}

function plainMsg(from: string, text = 'hello'): RawMessage {
  return { from, text, timestamp: 'x' }
}

describe('collapseConsecutiveIdleDuplicates', () => {
  test('three identical idles in a row → keep first only', () => {
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', { idleReason: 'available' }),
      idleMsg('alice', { idleReason: 'available' }),
      idleMsg('alice', { idleReason: 'available' }),
    ])
    expect(result.length).toBe(1)
  })

  test('idleReason transitions are preserved', () => {
    // available → interrupted → available is real progress info.
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', { idleReason: 'available' }),
      idleMsg('alice', { idleReason: 'interrupted' }),
      idleMsg('alice', { idleReason: 'available' }),
    ])
    expect(result.length).toBe(3)
  })

  test('changing summary preserves both', () => {
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', { idleReason: 'available', summary: 'turn 1 done' }),
      idleMsg('alice', { idleReason: 'available', summary: 'turn 2 done' }),
    ])
    expect(result.length).toBe(2)
  })

  test('non-idle message between idles resets per-sender collapse state', () => {
    // alice idles A, sends "hi" to leader, then idles A again — both
    // idles must survive because the non-idle message is a real event
    // that breaks the run.
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', { idleReason: 'available' }),
      plainMsg('alice', 'hi'),
      idleMsg('alice', { idleReason: 'available' }),
    ])
    expect(result.length).toBe(3)
  })

  test('different senders do not interfere', () => {
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', { idleReason: 'available' }),
      idleMsg('bob', { idleReason: 'available' }),
      idleMsg('alice', { idleReason: 'available' }),
      idleMsg('bob', { idleReason: 'available' }),
    ])
    // alice→bob breaks alice's run from alice's perspective — but
    // alice's *next* idle still has the same key as her last one,
    // so we collapse it.
    expect(result.length).toBe(2)
    expect(result[0]!.from).toBe('alice')
    expect(result[1]!.from).toBe('bob')
  })

  test('completedTaskId variation preserves both', () => {
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', {
        idleReason: 'available',
        completedTaskId: '1',
        completedStatus: 'resolved',
      }),
      idleMsg('alice', {
        idleReason: 'available',
        completedTaskId: '2',
        completedStatus: 'resolved',
      }),
    ])
    expect(result.length).toBe(2)
  })

  test('failureReason variation preserves both', () => {
    const result = collapseConsecutiveIdleDuplicates([
      idleMsg('alice', { idleReason: 'failed', failureReason: 'oom' }),
      idleMsg('alice', { idleReason: 'failed', failureReason: 'timeout' }),
    ])
    expect(result.length).toBe(2)
  })

  test('empty input passes through', () => {
    expect(collapseConsecutiveIdleDuplicates([])).toEqual([])
  })

  test('single message passes through', () => {
    const m = idleMsg('alice', { idleReason: 'available' })
    expect(collapseConsecutiveIdleDuplicates([m])).toEqual([m])
  })

  test('all non-idle messages pass through unchanged', () => {
    const msgs = [
      plainMsg('alice', 'a'),
      plainMsg('bob', 'b'),
      plainMsg('alice', 'c'),
    ]
    expect(collapseConsecutiveIdleDuplicates(msgs)).toEqual(msgs)
  })

  test('long run of identical idles → keep first only', () => {
    const idles = Array.from({ length: 10 }, () =>
      idleMsg('alice', { idleReason: 'available' }),
    )
    expect(collapseConsecutiveIdleDuplicates(idles).length).toBe(1)
  })
})
