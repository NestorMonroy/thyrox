// Sonda: calibrar la base de los punteros buscando el nombre de 42 bytes.
import { readFileSync } from 'node:fs'
import { BUN_MAGIC } from '../../../src/packages/binary/src/bunfs.ts'
const bytes = readFileSync(process.argv[2]!)
const fin = bytes.lastIndexOf(BUN_MAGIC)
const needle = Buffer.from('/$bunfs/root/')
let p = bytes.length - 40_000_000
const hits: Array<[number, string]> = []
while ((p = bytes.indexOf(needle, p + 1)) >= 0 && hits.length < 400) {
  const end = bytes.indexOf(0, p)
  const s = bytes.subarray(p, Math.min(end, p + 80)).toString('latin1')
  if (/^[\x20-\x7e]+$/.test(s) && (s.length === 42 || s.length === 32)) hits.push([p, s])
}
console.log(hits.slice(0, 6), { byteCount: Number(bytes.readBigUInt64LE(fin - 32)), fin })
for (const [pos] of hits.slice(0, 4)) console.log('base si nombre=28375518:', pos - 28375518, 'si 29840322:', pos - 29840322)
