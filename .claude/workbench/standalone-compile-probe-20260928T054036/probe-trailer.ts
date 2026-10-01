// Sonda: localizar el payload de un ejecutable de Bun sin seccion .bun.
import { readFileSync } from 'node:fs'
import { BUN_MAGIC, readModuleTable, readTrailer } from '../../../src/packages/binary/src/bunfs.ts'
const bytes = readFileSync(process.argv[2]!)
const fin = bytes.lastIndexOf(BUN_MAGIC)
const total = Number(bytes.readBigUInt64LE(fin + BUN_MAGIC.length))
console.log({ fileLength: bytes.length, magicAt: fin, tailU64: total })
for (const back of [24, 28, 32, 36, 40]) {
  const byteCount = Number(bytes.readBigUInt64LE(fin - back))
  const start = fin + BUN_MAGIC.length - byteCount
  if (start < 0 || start >= fin) { console.log(back, 'fuera', byteCount); continue }
  const payload = bytes.subarray(start, fin + BUN_MAGIC.length)
  const table = readModuleTable(payload)
  console.log(back, byteCount, start, readTrailer(payload), table ? `${table.entries.length} entradas paso ${table.stride}` : null)
}
