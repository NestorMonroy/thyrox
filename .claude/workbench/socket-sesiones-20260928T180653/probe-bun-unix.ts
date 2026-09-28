// Sonda: qué error da Bun al escuchar sobre un socket Unix vivo o sobre un archivo que ya existe.
import { createServer } from 'node:net'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
const dir = mkdtempSync('/tmp/uds-probe-')
const listen = (path: string) => new Promise<string>(res => { const s = createServer(); s.once('error', e => res(`error ${(e as NodeJS.ErrnoException).code}`)); s.listen(path, () => { res('ok'); s.close() }) })
const live = join(dir, 'live.sock'); const a = createServer(); await new Promise<void>(r => a.listen(live, r))
console.log('sobre socket vivo:', await listen(live))
const file = join(dir, 'file.sock'); writeFileSync(file, '')
console.log('sobre archivo existente:', await listen(file))
a.close(); await new Promise(r => setTimeout(r, 50))
console.log('tras close, el archivo del socket existe:', existsSync(live))
