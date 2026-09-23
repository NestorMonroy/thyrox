import { createMemoryService } from '../../../src/verify/tsLanguageService'
const base = { '/p/dep.ts': 'export const a = 1\nexport const b = 2\nexport const c = 3\n' }
for (const [label, src] of [['una instancia', "import { a, b } from './dep'\nconsole.log(a)\n"], ['dos instancias', "import { a, b, c } from './dep'\nconsole.log(a)\n"]]) {
  const { service } = createMemoryService({ ...base, '/p/main.ts': src })
  const d = service.getSemanticDiagnostics('/p/main.ts')[0]
  const fixes = service.getCodeFixesAtPosition('/p/main.ts', d.start!, d.start! + d.length!, [d.code], {}, {})
  console.log(label, JSON.stringify(fixes.map(f => ({ name: f.fixName, id: f.fixId, desc: f.description }))))
}
