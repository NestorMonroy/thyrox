/**
 * Los identificadores que un archivo TypeScript declara, con su línea, para
 * que `check_identifier_language.py` los juzgue con su léxico.
 *
 * Es el `declared_identifiers` del gate llevado al AST de TypeScript, con el
 * compilador del propio árbol: funciones, clases, métodos, interfaces, tipos,
 * enums y sus miembros, variables (también las de un patrón de
 * desestructuración), parámetros, propiedades y las claves de un objeto
 * literal que pueden ser un nombre. Lo que no entra es lo que el archivo no
 * nombra: un comentario, una cadena, un nombre importado sin alias o el uso de
 * una variable ya declarada.
 *
 * Uso: `bun src/verify/ts_declared_identifiers.ts ARCHIVO...`. Escribe un JSON
 * con una entrada por archivo: `parsed` en falso si el compilador lo rechazó,
 * para que el gate no lo cuente como medido.
 */
import { readFileSync } from 'node:fs'
import ts from 'typescript'

type FileIdentifiers = { path: string, parsed: boolean, names: [string, number][] }

const IDENTIFIER_LIKE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function scriptKindOf(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX
  if (/\.(c|m)?js$/.test(path)) return ts.ScriptKind.JS
  return ts.ScriptKind.TS
}

/** El nombre que una declaración introduce, si es un identificador. */
function declaredName(node: ts.Node): ts.Identifier | ts.StringLiteral | undefined {
  if (ts.isImportSpecifier(node)) return node.propertyName ? node.name : undefined
  if (ts.isPropertyAssignment(node)) {
    const name = node.name
    return ts.isIdentifier(name) || (ts.isStringLiteral(name) && IDENTIFIER_LIKE.test(name.text)) ? name : undefined
  }
  if (
    ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isMethodDeclaration(node)
    || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)
    || ts.isEnumMember(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)
    || ts.isMethodSignature(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)
    || ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)
  ) {
    const name = node.name
    return name && ts.isIdentifier(name) ? name : undefined
  }
  return undefined
}

function identifiersOf(path: string): FileIdentifiers {
  const text = readFileSync(path, 'utf8')
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKindOf(path))
  // `parseDiagnostics` es interno; su ausencia se lee como «sin errores».
  const diagnostics = (source as unknown as { parseDiagnostics?: readonly unknown[] }).parseDiagnostics ?? []
  if (diagnostics.length > 0) return { path, parsed: false, names: [] }
  const names: [string, number][] = []
  const visit = (node: ts.Node): void => {
    const name = declaredName(node)
    if (name) names.push([name.text, source.getLineAndCharacterOfPosition(name.getStart(source)).line + 1])
    ts.forEachChild(node, visit)
  }
  visit(source)
  return { path, parsed: true, names }
}

console.log(JSON.stringify(process.argv.slice(2).map(identifiersOf)))
