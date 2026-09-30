/**
 * El aviso que una sesión manda a sus correspondientes cuando cede su nombre:
 * `zkr` (`chunk-bhsyyycy.js`) de 2.1.283.
 */
import { beforeEach, describe, expect, test } from 'bun:test'

import { SessionNameState, type LiveSession } from '../src/uds/sessionNameState.ts'
import { notifyCorrespondentsOfRename, type RenameNoticeDeps } from '../src/uds/renameNotice.ts'

let sent: unknown[][]
let logs: string[]
let queries: unknown[]
let live: LiveSession[]
let deps: RenameNoticeDeps

beforeEach(() => {
  sent = []
  logs = []
  queries = []
  live = [
    { pid: 11, startedAt: 1, sock: '/tmp/a.sock' },
    { pid: 12, startedAt: 1, sock: '/tmp/b.sock' },
    { pid: 13, startedAt: 1, sock: '/tmp/moved.sock' },
  ]
  const state = new SessionNameState()
  state.noteCorrespondent('uds:/tmp/a.sock', 11, 'start-a')
  state.noteCorrespondent('uds:/tmp/b.sock', 12, undefined)
  state.noteCorrespondent('uds:/tmp/c.sock', 13, undefined)
  state.noteCorrespondent('uds:/tmp/self.sock', 14, undefined)
  state.senderMode = () => 'bypass'
  deps = {
    state,
    uniquenessEnabled: () => true,
    messagingEnabled: () => true,
    ownSocket: () => '/tmp/self.sock',
    listLive: async scope => (queries.push(scope), [...live, { pid: 14, startedAt: 1, sock: '/tmp/self.sock' }]),
    send: async (...args) => void sent.push(args),
    log: message => logs.push(message),
  }
})

const TEXT = 'This session was renamed from "foo" to "foo-brave-otter" ("foo" is held by another live session on this machine). Address this one as "foo-brave-otter" from now on.'

describe('notifyCorrespondentsOfRename (zkr)', () => {
  test('avisa a cada correspondiente cuyo socket sigue siendo el de su pid en el registro', async () => {
    await notifyCorrespondentsOfRename('foo', 'foo-brave-otter', 'foo', 'scope', deps)
    expect(queries).toEqual(['scope'])
    expect(sent).toEqual([
      ['/tmp/a.sock', TEXT, 'scope', 'foo-brave-otter', undefined, undefined, 'bypass', { trackReceipts: false, expectPeerPid: 11, expectPeerProcStart: 'start-a' }],
      ['/tmp/b.sock', TEXT, 'scope', 'foo-brave-otter', undefined, undefined, 'bypass', { trackReceipts: false, expectPeerPid: 12 }],
    ])
  })

  test('sanea los nombres del texto', async () => {
    await notifyCorrespondentsOfRename('  foo\u0007 ', 'foo-brave-otter', 'foo', 'scope', deps)
    expect(sent[0]![1]).toBe(TEXT)
  })

  test('sin unicidad, sin mensajería o sin correspondientes no consulta el registro', async () => {
    await notifyCorrespondentsOfRename('a', 'b', 'a', 's', { ...deps, uniquenessEnabled: () => false })
    await notifyCorrespondentsOfRename('a', 'b', 'a', 's', { ...deps, messagingEnabled: () => false })
    await notifyCorrespondentsOfRename('a', 'b', 'a', 's', { ...deps, state: new SessionNameState() })
    expect(queries).toEqual([])
    expect(sent).toEqual([])
  })

  test('sin socket propio no descarta ninguna dirección por ser la suya', async () => {
    await notifyCorrespondentsOfRename('foo', 'foo-brave-otter', 'foo', 'scope', { ...deps, ownSocket: () => undefined })
    expect(sent.map(call => call[0])).toEqual(['/tmp/a.sock', '/tmp/b.sock', '/tmp/self.sock'])
  })

  test('un registro ilegible cancela el aviso y lo registra con el código del error', async () => {
    const failing = { ...deps, listLive: async () => Promise.reject(Object.assign(new Error('x'), { code: 'EACCES' })) }
    await notifyCorrespondentsOfRename('foo', 'b', 'foo', 's', failing)
    await notifyCorrespondentsOfRename('foo', 'b', 'foo', 's', { ...deps, listLive: async () => Promise.reject(new Error('roto')) })
    expect(logs).toEqual(['[session-name] rename notice skipped: registry unreadable (EACCES)', '[session-name] rename notice skipped: registry unreadable (roto)'])
    expect(sent).toEqual([])
  })

  test('un envío fallido se registra y no detiene los demás', async () => {
    const flaky = {
      ...deps,
      send: async (target: string) => {
        if (target === '/tmp/a.sock') throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' })
        if (target === '/tmp/b.sock') throw new Error('otro')
      },
    }
    await notifyCorrespondentsOfRename('foo', 'b', 'foo', 's', flaky)
    expect(logs).toEqual(['[session-name] rename notice to uds:/tmp/a.sock failed: ECONNREFUSED', '[session-name] rename notice to uds:/tmp/b.sock failed: send error'])
  })

  test('una dirección que no es uds no recibe aviso', async () => {
    deps.state.correspondents.set('bridge:/tmp/a.sock', { pid: 11, procStart: undefined })
    await notifyCorrespondentsOfRename('foo', 'b', 'foo', 's', deps)
    expect(sent.map(call => call[0])).toEqual(['/tmp/a.sock', '/tmp/b.sock'])
  })
})
