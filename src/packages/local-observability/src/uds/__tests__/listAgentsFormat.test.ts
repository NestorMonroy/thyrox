/**
 * `aYo` (`formatForModel`) y `ulr` (`formatForUser`), de `chunk-7h1n9jsx.js`
 * de 2.1.284.
 */
import { PRODUCT_NAME } from '@thyrox/config/product'
import { describe, expect, test } from 'bun:test'

import {
  type FormatForModelOptions,
  type FormatForUserOptions,
  type ListAgentsAppState,
  type PeerEntry,
  type PeerRefDependencies,
  formatForModel,
  formatForUser,
} from '../listAgentsFormat.ts'
import type { PeerCandidateWithRef } from '../peerRefTable.ts'

function emptyAppState(): ListAgentsAppState {
  return { agentNameRegistry: new Map(), tasks: {} }
}

function fakeRefs(): PeerRefDependencies {
  return {
    buildPeerRefTable: () => ({ candidates: [] as PeerCandidateWithRef[] }),
    formatWithRef: candidate => `${candidate.name} [${candidate.ref}]`,
    ownSocketNeedsLongRef: () => false,
  }
}

const context = (appState: ListAgentsAppState) => ({ appState, teamFile: null, callerTeammateId: null, self: null })

describe('formatForModel (aYo)', () => {
  test('sin filas devuelve "No reachable agents."', () => {
    expect(formatForModel([], context(emptyAppState()), fakeRefs())).toBe('No reachable agents.')
  })

  test('la sesión propia se antepone con su nombre', () => {
    const appState = emptyAppState()
    const ctx = {
      appState,
      teamFile: null,
      callerTeammateId: null,
      self: { token: 'alice', socketToken: 'alice [ref]', sock: '/tmp/a.sock', callerIsSubagent: false, nameIsUserChosen: true },
    }
    const out = formatForModel([], ctx, fakeRefs())
    expect(out).toContain('This session is alice')
    expect(out).toContain('a message to it would be a message to yourself')
  })

  test('Subagents, Teammates y Peer sessions aparecen con su recuento', () => {
    const appState: ListAgentsAppState = {
      agentNameRegistry: new Map([['scout', 'agent-1']]),
      tasks: {
        t1: { type: 'local_agent', id: 'agent-1', agentType: 'explore', status: 'running', startTime: Date.now() - 1000 },
      },
      teamContext: {
        teammates: {
          tm1: { name: 'bob', agentType: 'reviewer', tmuxPaneId: 'in-process', spawnedAt: Date.now() - 2000 },
        },
      },
    }
    const peers: PeerEntry[] = [
      {
        transport: 'uds',
        session: {
          sock: '/tmp/peer.sock',
          name: 'peer-session',
          cwd: '/home/user/proj',
          kind: 'interactive',
          status: 'active',
          startedAt: Date.now() - 5000,
        },
      },
    ]
    const out = formatForModel(peers, context(appState), fakeRefs())
    expect(out).toContain('Subagents (1):')
    expect(out).toContain('Teammates (1):')
    expect(out).toContain('Peer sessions (1):')
  })

  test('recorta a 100 teammates con "(… N more not shown)"', () => {
    const teammates: Record<string, { name: string; agentType: string; tmuxPaneId: string; spawnedAt: number }> = {}
    for (let i = 0; i < 105; i += 1) {
      teammates[`tm${i}`] = { name: `teammate-${i}`, agentType: 'worker', tmuxPaneId: 'pane', spawnedAt: Date.now() }
    }
    const appState: ListAgentsAppState = { agentNameRegistry: new Map(), tasks: {}, teamContext: { teammates } }
    const out = formatForModel([], context(appState), fakeRefs())
    expect(out).toContain('Teammates (105):')
    expect(out).toContain('(… 5 more not shown)')
  })

  test('el aviso de mensajería apagada se antepone cuando hay otras secciones', () => {
    const appState: ListAgentsAppState = {
      agentNameRegistry: new Map([['scout', 'agent-1']]),
      tasks: {
        t1: { type: 'local_agent', id: 'agent-1', agentType: 'explore', status: 'running', startTime: Date.now() },
      },
    }
    const options: FormatForModelOptions = { messagingDisabled: true }
    const out = formatForModel([], context(appState), fakeRefs(), options)
    expect(out.startsWith('Cross-session messaging is switched off in this session right now')).toBe(true)
    expect(out).toContain('Subagents (1):')
  })
})

describe('formatForUser (ulr)', () => {
  test('sin filas devuelve el mensaje de vacío', () => {
    expect(formatForUser([], context(emptyAppState()), fakeRefs())).toBe(`No subagents, teammates or other ${PRODUCT_NAME} sessions.`)
  })

  test('Subagents, Teammates y las otras sesiones aparecen con su recuento', () => {
    const appState: ListAgentsAppState = {
      agentNameRegistry: new Map([['scout', 'agent-1']]),
      tasks: {
        t1: { type: 'local_agent', id: 'agent-1', agentType: 'explore', status: 'running', startTime: Date.now() },
      },
      teamContext: {
        teammates: {
          tm1: { name: 'bob', agentType: 'reviewer', tmuxPaneId: 'in-process', spawnedAt: Date.now() },
        },
      },
    }
    const peers: PeerEntry[] = [
      {
        transport: 'uds',
        session: {
          sock: '/tmp/peer.sock',
          name: 'peer-session',
          cwd: '/home/user/proj',
          kind: 'interactive',
          status: 'active',
          startedAt: Date.now(),
        },
      },
    ]
    const out = formatForUser(peers, context(appState), fakeRefs())
    expect(out).toContain('Subagents (1):')
    expect(out).toContain('Teammates (1):')
    expect(out).toContain(`Other ${PRODUCT_NAME} sessions (1):`)
  })

  test('recorta Teammates a 100 con "(… N more not shown)"', () => {
    const teammates: Record<string, { name: string; agentType: string; tmuxPaneId: string; spawnedAt: number }> = {}
    for (let i = 0; i < 102; i += 1) {
      teammates[`tm${i}`] = { name: `teammate-${i}`, agentType: 'worker', tmuxPaneId: 'pane', spawnedAt: Date.now() }
    }
    const appState: ListAgentsAppState = { agentNameRegistry: new Map(), tasks: {}, teamContext: { teammates } }
    const out = formatForUser([], context(appState), fakeRefs())
    expect(out).toContain('Teammates (102):')
    expect(out).toContain('(… 2 more not shown)')
  })

  test('el aviso de mensajería apagada se antepone cuando hay otras secciones', () => {
    const appState: ListAgentsAppState = {
      agentNameRegistry: new Map([['scout', 'agent-1']]),
      tasks: {
        t1: { type: 'local_agent', id: 'agent-1', agentType: 'explore', status: 'running', startTime: Date.now() },
      },
    }
    const options: FormatForUserOptions = { messagingDisabled: true }
    const out = formatForUser([], context(appState), fakeRefs(), options)
    expect(out.startsWith('Cross-session messaging is switched off in this session right now')).toBe(true)
    expect(out).toContain('Subagents (1):')
  })
})
