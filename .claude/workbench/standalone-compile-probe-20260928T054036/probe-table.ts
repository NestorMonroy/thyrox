// Sonda: volcar la tabla de modulos del payload de trailer, sin suponer el paso.
import { readFileSync } from 'node:fs'
import { BUN_MAGIC } from '../../../src/packages/binary/src/bunfs.ts'
const bytes = readFileSync(process.argv[2]!)
const fin = bytes.lastIndexOf(BUN_MAGIC)
const byteCount = Number(bytes.readBigUInt64LE(fin - 32))
const payload = bytes.subarray(fin + BUN_MAGIC.length - byteCount, fin + BUN_MAGIC.length)
const t = payload.readUInt32LE(fin - 24 - (fin + BUN_MAGIC.length - byteCount))
const n = payload.readUInt32LE(fin - 20 - (fin + BUN_MAGIC.length - byteCount))
const words = []
for (let p = t; p < t + n; p += 4) words.push(payload.readUInt32LE(p))
console.log({ t, n, words })
for (let i = 0; i < words.length; i++) {
  const [o, l] = [words[i]!, words[i + 1]!]
  if (l > 0 && l < 200 && o + l <= payload.length) {
    const s = payload.subarray(o, o + l).toString('utf8')
    if (/^[\x20-\x7e]+$/.test(s)) console.log(i, o, l, JSON.stringify(s))
  }
}
const base = fin + BUN_MAGIC.length - byteCount
for (const [o, l] of [[words[1]!, words[2]!], [words[14]!, words[15]!]]) console.log(JSON.stringify(payload.subarray(o, o + l).toString('utf8')))
console.log(JSON.stringify(payload.subarray(words[3]!, words[3]! + 80).toString('utf8')))
void base
