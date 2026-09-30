// Sonda: nombres de los skills incrustados en la referencia, plano o zstd.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const root = process.argv[2]!
const rows: string[] = []
for (const f of readdirSync(root)) {
  if (!/^SKILL(-[a-z0-9]+)?\.md(\.zst)?$/.test(f)) continue
  const raw = readFileSync(join(root, f))
  const text = f.endsWith('.zst') ? Bun.zstdDecompressSync(raw).toString() : raw.toString()
  const name = /^name:\s*(.+)$/m.exec(text)?.[1] ?? '(sin name)'
  rows.push(`${name}\t${f}\t${raw.length}\t${text.length}`)
}
console.log(rows.sort().join('\n'))
