/**
 * Renombra identificadores de UN archivo TypeScript por nodo del AST, no por
 * texto: deja intactos cadenas, comentarios y nombres de propiedad. Uso:
 *   bun run rename_identifiers.ts <archivo> viejo=nuevo ... [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import ts from 'typescript'

const [file, ...rest] = process.argv.slice(2)
const dryRun = rest.includes('--dry-run')
const mapping = new Map(rest.filter(a => a.includes('=')).map(a => a.split('=') as [string, string]))
const source = readFileSync(file, 'utf8')
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const edits: { start: number; end: number; to: string }[] = []

function isPropertyName(node: ts.Identifier): boolean {
  const parent = node.parent
  return (ts.isPropertyAccessExpression(parent) && parent.name === node)
    || (ts.isPropertyAssignment(parent) && parent.name === node)
    || (ts.isPropertySignature(parent) && parent.name === node)
}

function visit(node: ts.Node): void {
  if (ts.isIdentifier(node) && mapping.has(node.text) && !isPropertyName(node)) {
    edits.push({ start: node.getStart(tree), end: node.getEnd(), to: mapping.get(node.text)! })
  }
  node.forEachChild(visit)
}
visit(tree)

const counts = new Map<string, number>()
for (const e of edits) counts.set(source.slice(e.start, e.end), (counts.get(source.slice(e.start, e.end)) ?? 0) + 1)
for (const [from, to] of mapping) console.log(`${from} -> ${to}: ${counts.get(from) ?? 0}`)
if (!dryRun) {
  let out = source
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.to + out.slice(e.end)
  writeFileSync(file, out)
}
console.error(`rename_identifiers: ${edits.length} nodo(s) en ${file}${dryRun ? ' (sin escribir)' : ''}`)
