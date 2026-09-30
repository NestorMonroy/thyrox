import { removeUnusedImports } from '../../../src/verify/removeUnusedImports'
const r = removeUnusedImports({
  '/p/typeOnly.ts': 'export type Metadata = never\nexport const unused = 1\n',
  '/p/main.ts': "import { Metadata, unused } from './typeOnly'\nexport const x = 1 as unknown as typeof Metadata\n",
}, ['/p/main.ts'])
console.log(JSON.stringify(r.get('/p/main.ts')))
