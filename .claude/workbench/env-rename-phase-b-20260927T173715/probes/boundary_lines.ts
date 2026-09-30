// Líneas exactas de las lecturas CLAUDE_* fuera de src/packages, con el
// mismo extractor que el gate: file<TAB>line<TAB>name.
import { readFileSync } from 'node:fs'
import { classifyName, extractEnvReads, languageOf } from '../../../../src/verify/checkEnvPrefix.ts'
const pairs = readFileSync('src/verify/env_prefix_baseline.tsv', 'utf8').split('\n').filter(l => l && !l.startsWith('src/packages/'))
for (const file of new Set(pairs.map(p => p.split('\t')[0]!))) {
  for (const r of extractEnvReads(readFileSync(file, 'utf8'), languageOf(file)!)) {
    if (classifyName(r.name) === 'foreign' && !r.keep) console.log(`${file}\t${r.line}\t${r.name}`)
  }
}
