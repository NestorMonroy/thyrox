/**
 * Compara, nombre por nombre, las declaraciones de tipo exportadas de tres
 * archivos: el porte en la raiz de thyrox, la copia en `types/` y la fuente.
 * Cada declaracion se normaliza sin comentarios ni espacios, asi que dos
 * iguales solo difieren en formato.
 *
 * Uso: bun compare_declarations.ts <porte> <copia> <fuente>
 * Salida: nombre<TAB>porte==copia<TAB>copia==fuente<TAB>porte==fuente
 */
import ts from 'typescript'
import { existsSync, readFileSync } from 'node:fs'

function declarations(path: string): Map<string, string> {
  const out = new Map<string, string>()
  if (!existsSync(path)) return out
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  const printer = ts.createPrinter({ removeComments: true })
  for (const node of source.statements) {
    const exported = (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0
    if (!exported) continue
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const text = printer.printNode(ts.EmitHint.Unspecified, node, source).replace(/\s+/g, ' ').replace(/;/g, '').trim()
      out.set(node.name.text, text)
    }
  }
  return out
}

const [port, copy, source] = process.argv.slice(2).map(declarations)
const names = new Set([...port!.keys(), ...copy!.keys(), ...source!.keys()])
const cmp = (a: Map<string, string>, b: Map<string, string>, n: string) =>
  !a.has(n) || !b.has(n) ? 'ausente' : a.get(n) === b.get(n) ? 'igual' : 'distinto'
for (const n of [...names].sort()) {
  console.log([n, cmp(port!, copy!, n), cmp(copy!, source!, n), cmp(port!, source!, n)].join('\t'))
}
