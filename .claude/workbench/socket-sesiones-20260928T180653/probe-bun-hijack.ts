// Sonda: si un segundo listen sobre una ruta viva gana, ¿a quién llega el siguiente cliente?
import { createServer, connect } from 'node:net'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
const path = join(mkdtempSync('/tmp/uds-hijack-'), 'x.sock')
const who: string[] = []
const first = createServer(c => { who.push('primero'); c.end() }); await new Promise<void>(r => first.listen(path, r))
const second = createServer(c => { who.push('segundo'); c.end() })
const r2 = await new Promise<string>(res => { second.once('error', e => res(`error ${(e as NodeJS.ErrnoException).code}`)); second.listen(path, () => res('ok')) })
await new Promise<void>(r => { const s = connect({ path }, () => { s.end(); setTimeout(r, 50) }); s.on('error', () => r()) })
console.log(`segundo listen: ${r2}; el cliente llegó a: ${who.join(',') || 'nadie'}; Bun ${Bun.version}`)
first.close(); second.close()
