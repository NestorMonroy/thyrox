// Sonda: con la base calibrada, la tabla existente se lee sin tocar el parser.
import { readFileSync } from 'node:fs'
import { BUN_MAGIC, deriveVersion, readModuleTable } from '../../../src/packages/binary/src/bunfs.ts'
const bytes = readFileSync(process.argv[2]!)
const fin = bytes.lastIndexOf(BUN_MAGIC)
const offsetsStart = fin - 32
const byteCount = Number(bytes.readBigUInt64LE(offsetsStart))
const payload = bytes.subarray(offsetsStart - byteCount, fin + BUN_MAGIC.length)
const table = readModuleTable(payload)
console.log(table?.stride, table?.entries.map(e => [e.name, e.length]), deriveVersion(payload))
