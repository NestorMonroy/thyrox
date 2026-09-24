// Mide extractByLiteral sobre el chunk real que usa declaration.test.ts.
import { readFileSync, statSync } from 'node:fs'
import { extractByLiteral } from '../../../../src/packages/binary/src/declaration.ts'
const path = process.argv[2]
const src = readFileSync(path, 'utf8')
const t0 = performance.now()
const found = extractByLiteral(src, 'seven_day_overage_included')
console.log(`bytes=${statSync(path).size} candidatos=${found.length} ms=${(performance.now() - t0).toFixed(0)}`)
