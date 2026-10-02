// Recorre cada columna de texto de cada tabla de los stores SQLite dados y
// cuenta, por patrón de `provider/sanitize/credentialPatterns`, las celdas
// que casan. Sólo sale el conteo por tabla/columna/patrón: ningún valor.
import { Database } from 'bun:sqlite'

import { CREDENTIAL_PATTERNS } from '@thyrox/provider/sanitize/credentialPatterns'

const report: Record<string, unknown>[] = []
for (const path of process.argv.slice(2)) {
  const db = new Database(path, { readonly: true })
  const tables = db.query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'").all() as { name: string }[]
  let cells = 0
  for (const { name: table } of tables) {
    const columns = (db.query(`PRAGMA table_info("${table}")`).all() as { name: string; type: string }[]).filter(c => /TEXT|^$/i.test(c.type))
    for (const { name: column } of columns) {
      const counts: Record<string, number> = {}
      for (const row of db.query(`SELECT "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL`).iterate() as Iterable<{ v: unknown }>) {
        if (typeof row.v !== 'string') continue
        cells++
        for (const pattern of CREDENTIAL_PATTERNS) {
          pattern.regex.lastIndex = 0
          if (pattern.regex.test(row.v)) counts[pattern.name] = (counts[pattern.name] ?? 0) + 1
        }
      }
      if (Object.keys(counts).length > 0) report.push({ store: path, table, column, matches: counts })
    }
  }
  report.push({ store: path, textCellsScanned: cells, tables: tables.length })
}
console.log(JSON.stringify(report, null, 2))
