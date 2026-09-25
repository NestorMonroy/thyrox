/**
 * Las declaraciones de nivel superior de un módulo TypeScript, con su rango de
 * líneas (incluido su JSDoc) y los identificadores que nombran.
 *
 * Es la entrada de `member_port.py plan`: reparte un porte por miembros en
 * ítems de pool. Antes se derivaba a mano en un banco
 * (`attachments-port-plan-*`); aquí lo decide el compilador, no una regex.
 *
 * Uso: bun src/verify/top_level_declarations.ts <archivo.ts>  → JSON por stdout.
 */
import ts from 'typescript'
import { readFileSync } from 'node:fs'

type Declaration = {
  name: string
  kind: 'function' | 'declaration'
  start: number
  end: number
  references: string[]
}

function namesOf(statement: ts.Statement): string[] {
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
    || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)
    || ts.isEnumDeclaration(statement)) {
    return statement.name ? [statement.name.text] : []
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .map(d => (ts.isIdentifier(d.name) ? d.name.text : ''))
      .filter(Boolean)
  }
  return []
}

function isFunctionLike(statement: ts.Statement): boolean {
  if (ts.isFunctionDeclaration(statement)) return true
  if (!ts.isVariableStatement(statement)) return false
  return statement.declarationList.declarations.some(d =>
    d.initializer !== undefined
    && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)))
}

function referencesOf(node: ts.Node, own: Set<string>): string[] {
  const found = new Set<string>()
  const visit = (child: ts.Node): void => {
    if (ts.isIdentifier(child) && !own.has(child.text)) found.add(child.text)
    ts.forEachChild(child, visit)
  }
  ts.forEachChild(node, visit)
  return [...found].sort()
}

export function topLevelDeclarations(path: string): Declaration[] {
  const text = readFileSync(path, 'utf8')
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const line = (position: number): number => source.getLineAndCharacterOfPosition(position).line + 1
  const result: Declaration[] = []
  for (const statement of source.statements) {
    const names = namesOf(statement)
    if (names.length === 0) continue
    const own = new Set(names)
    const kind = isFunctionLike(statement) ? 'function' : 'declaration'
    // getStart(source, true) incluye el JSDoc que precede a la declaración.
    const start = line(statement.getStart(source, true))
    const end = line(statement.getEnd())
    const references = referencesOf(statement, own)
    for (const name of names) result.push({ name, kind, start, end, references })
  }
  return result
}

if (import.meta.main) {
  const path = process.argv[2]
  if (!path) {
    console.error('top_level_declarations: falta la ruta del módulo')
    process.exit(2)
  }
  console.log(JSON.stringify(topLevelDeclarations(path)))
}
