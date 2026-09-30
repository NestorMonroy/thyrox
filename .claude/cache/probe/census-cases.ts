import { censusFixes } from '../../../src/verify/tscFixCensus'
import { createMemoryService } from '../../../src/verify/tsLanguageService'
const base = { '/p/dep.ts': 'export const used = 1\nexport const unused = 2\n' }
for (const src of ["import { used, unused } from './dep'\nconsole.log(used)\n", 'export function f(x) { return x * 2 }\n', "export const n = 'a' as number\n"]) {
  const { service } = createMemoryService({ ...base, '/p/main.ts': src })
  console.log(JSON.stringify(censusFixes(service, ['/p/main.ts']).map(r => [r.code, r.fixes])))
}
