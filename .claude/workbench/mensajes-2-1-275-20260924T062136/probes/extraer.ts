// Extrae funciones por nombre: desde `function NOMBRE(` crece hasta el
// primer `}` con el que el fragmento parsea limpio.
import { readFileSync, writeFileSync } from 'node:fs'
import { parsesClean } from '../../../../src/packages/binary/src/declaration.ts'
const [chunk, out, ...names] = process.argv.slice(2)
const src = readFileSync(chunk, 'utf8')
const parts: string[] = []
for (const name of names) {
  const re = new RegExp(`(async )?function ${name.replace(/\$/g, '\\$')}\\(`)
  const m = re.exec(src)
  if (!m) { parts.push(`==== ${name} AUSENTE\n`); continue }
  let k = src.indexOf('}', m.index)
  let found = ''
  while (k !== -1 && k - m.index < 60000) {
    const frag = src.slice(m.index, k + 1)
    if (parsesClean(frag)) { found = frag; break }
    k = src.indexOf('}', k + 1)
  }
  parts.push(`==== ${name} (${found.length})\n${found}\n`)
}
writeFileSync(out, parts.join('\n'))
console.log(parts.map(p => p.split('\n')[0]).join('\n'))
