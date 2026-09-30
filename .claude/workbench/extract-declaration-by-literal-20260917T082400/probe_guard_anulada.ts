/**
 * Sonda: que ve la guarda de texto completo, y que veria anulada.
 *
 * Mide sobre el corpus REAL (no un caso fabricado) los dos modos del
 * predicado de sitio: igualdad de texto completo contra inclusion. Existe
 * porque el control de anulacion de la suite NO cayo donde se esperaba, y
 * un control que no cae es indistinguible de uno que no mide.
 */
import * as ts from 'typescript'
import { readFileSync } from 'node:fs'

const CHUNK = '_references/claude-code-bin/2.1.274/bunfs-root/chunk-ayyj05ne.js'
const LITERAL = 'used_percentage'
const src = readFileSync(CHUNK, 'utf8')
const sourceFile = ts.createSourceFile('payload.js', src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

function nodeValue(node: ts.Node): string | null {
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isNumericLiteral(node)) return node.text
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text
  return null
}

function sites(mode: 'equal' | 'includes') {
  const out: { length: number; kind: string }[] = []
  const visit = (node: ts.Node): void => {
    const value = nodeValue(node)
    const hit = mode === 'equal'
      ? value === LITERAL
      : value !== null && value.includes(LITERAL)
    if (hit) out.push({ length: node.getEnd() - node.getStart(sourceFile), kind: ts.SyntaxKind[node.kind] })
    node.forEachChild(visit)
  }
  sourceFile.forEachChild(visit)
  return out
}

for (const mode of ['equal', 'includes'] as const) {
  const found = sites(mode)
  console.log(mode.padEnd(9), 'sitios:', String(found.length).padStart(3),
    '| mayor:', String(Math.max(...found.map((s) => s.length))).padStart(6),
    '| kinds:', [...new Set(found.map((s) => s.kind))].join(','))
}
console.log('por texto (split):', src.split(LITERAL).length - 1)
