import { semanticDiagnosticCodes, removeUnusedImports } from '../../../src/verify/removeUnusedImports'
const base = { '/p/compat.ts': 'export type Metadata = never\n', '/p/typeOnly.ts': "export type { Metadata } from './compat'\nexport const unused = 1\nexport function logEvent(_: string, __: object) {}\n" }
const variants: Record<string, string> = {
  typeofAs: "import { Metadata, unused } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n",
  inCall: "import {\n  Metadata,\n  logEvent,\n} from './typeOnly'\nexport function f(reason: string) {\n  logEvent('e', {\n    r:\n      reason as typeof Metadata,\n  })\n}\n",
}
for (const [k, src] of Object.entries(variants)) {
  const s = { ...base, '/p/main.ts': src }
  console.log(k, semanticDiagnosticCodes(s, '/p/main.ts'), JSON.stringify(removeUnusedImports(s, ['/p/main.ts']).get('/p/main.ts')?.split('\n').slice(0, 4)))
}
