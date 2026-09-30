/**
 * Censo de lecturas de AgentMessage: por cada acceso a propiedad cuya RAIZ
 * tiene tipo con alias AgentMessage/AgentAssistantMessage (o un arreglo de
 * ellos indexado), registra la ruta completa leida (`.message.content`).
 * Uso: bun census.ts <raiz-del-arbol> <tsconfig> <archivo>...
 */
import ts from 'typescript'
import { resolve } from 'node:path'

const [root, tsconfigPath, ...files] = process.argv.slice(2)
const cfg = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, resolve(root))
const program = ts.createProgram(files.map(f => resolve(root, f)), { ...parsed.options, noEmit: true })
const checker = program.getTypeChecker()
const TARGET = new Set((process.env.CENSUS_TARGET ?? 'AgentMessage,AgentAssistantMessage').split(','))

function aliasName(t: ts.Type): string | undefined {
  const n = t.aliasSymbol?.name
  if (n && TARGET.has(n)) return n
  if (t.isUnionOrIntersection()) for (const s of t.types) { const m = aliasName(s); if (m) return m }
  return undefined
}

const rows = new Map<string, number>()
for (const f of files) {
  const sf = program.getSourceFile(resolve(root, f))
  if (!sf) { console.error(`sin fuente: ${f}`); continue }
  const visit = (node: ts.Node) => {
    // Solo el acceso mas externo de cada cadena: a.b.c se registra una vez.
    if (ts.isPropertyAccessExpression(node) && !ts.isPropertyAccessExpression(node.parent)) {
      // Prefijos reales del AST, de la raiz hacia fuera: a, a.b, a.b.c.
      const prefixes: ts.Expression[] = []
      let cur: ts.Expression = node
      while (ts.isPropertyAccessExpression(cur)) { prefixes.unshift(cur); cur = cur.expression }
      prefixes.unshift(cur)
      for (let i = 0; i < prefixes.length - 1; i++) {
        const name = aliasName(checker.getTypeAtLocation(prefixes[i]!))
        if (!name) continue
        const rest = prefixes.slice(i + 1).map(e => (e as ts.PropertyAccessExpression).name.text)
        const key = `${f}\t${name}\t.${rest.join('.')}`
        rows.set(key, (rows.get(key) ?? 0) + 1)
        break
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}
for (const [k, n] of [...rows].sort()) console.log(`${n}\t${k}`)
console.error(`censo: ${rows.size} rutas distintas en ${files.length} archivo(s)`)
