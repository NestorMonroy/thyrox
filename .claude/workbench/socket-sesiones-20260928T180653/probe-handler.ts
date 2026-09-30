// Sonda: el manejador sobre un socket real, imprimiendo avisos y mensajes enrutados.
import { connect, createServer } from 'node:net'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { handleInboxConnection } from '../../../src/packages/local-observability/src/uds/inboxConnection.ts'
import { createInboxState } from '../../../src/packages/local-observability/src/uds/inboxState.ts'
const path = join(mkdtempSync(join(tmpdir(), 'probe-')), 's.sock')
const out: unknown[] = []
const server = createServer(socket => {
  try {
    handleInboxConnection(socket, {
      state: createInboxState(), route: m => out.push(['route', m]), trustsAncestry: () => false, ownPid: 1234,
      peerPid: () => 7, startTokenOf: () => 't', parentChain: () => [], log: m => out.push(['log', m]), warn: m => out.push(['warn', m]),
      telemetry: { ok: () => {}, bad: () => {}, sad: () => {} },
    })
  } catch (error) { out.push(['throw', String(error)]) }
})
server.listen(path, async () => {
  const client = connect(path)
  await new Promise(r => client.once('connect', r))
  client.write('{"type":"user"}\n')
  client.end()
  await Bun.sleep(200)
  console.log(JSON.stringify(out))
  server.close()
})
