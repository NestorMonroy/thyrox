/**
 * Auditor de forma de mensajes: el segundo verificador del lazo de correccion.
 *
 * El paquete `agent` tiene dos modelos de mensaje separados a proposito: el
 * del bucle (`AgentMessage`, anidado: `message.content`, `message.usage`) y el
 * de `AgentCore` (`CoreMessage`, plano: `content`, `usage` en la raiz). La
 * separacion se conserva; lo que este auditor vigila es que la frontera entre
 * los dos pase por sus adaptadores y no por casts sueltos ni por lecturas que
 * adivinan la forma.
 *
 * Emite en el formato de tsc, con codigo propio, para que el lazo, su memoria
 * de patrones y sus gates lo lean sin cambios
 * (`analyze_typescript_diagnostics.py::DIAGNOSTIC`):
 *
 *   SHAPE001  lectura de doble forma: `.message.<campo>` sobre un valor tipado
 *             `Core*`. Un `CoreMessage` es plano; si alguien lee `.message`
 *             es porque el objeto real vino anidado, que es justo lo que el
 *             adaptador existe para impedir.
 *   SHAPE002  cruce de modelo sin adaptador, fuera de los adaptadores: una
 *             asercion de tipo (`as`) cuyo destino es `Core*` desde un valor
 *             que no lo es, o que saca un valor `Core*` a cualquier otro tipo
 *             (`Agent*`, o `never` para pasarlo a un sumidero ajeno).
 *
 * Uso:
 *   bun src/verify/message_shape_audit.ts [--root R] [--tsconfig T] [--scope DIR]
 *
 * Metrica: accesos a propiedad y aserciones de tipo en los archivos no-prueba
 * de `--scope`, resueltos con el type checker.
 * Ciega a: el acceso por indice con cadena (`m['message']`), la
 * desestructuracion (`const { message } = core`) y un cruce que pase por una
 * funcion tipada `unknown` sin asercion.
 */
import ts from 'typescript'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export const CORE_TYPES = new Set([
  'CoreMessage',
  'CoreUserMessage',
  'CoreAssistantMessage',
  'CoreSystemMessage',
])
export const AGENT_TYPES = new Set(['AgentMessage', 'AgentAssistantMessage'])
/** Las unicas funciones donde un cruce entre modelos es legitimo. */
export const ADAPTERS = new Set([
  'toCoreMessage',
  'toCoreMessages',
  'fromCoreMessage',
  'fromCoreMessages',
])

export type ShapeFinding = {
  file: string
  line: number
  column: number
  code: 'SHAPE001' | 'SHAPE002'
  message: string
}

type Family = 'core' | 'agent' | undefined

/** Familia de un tipo por su alias; un arreglo se juzga por su elemento. */
function familyOf(checker: ts.TypeChecker, type: ts.Type): Family {
  const element = checker.isArrayType(type) || checker.isTupleType(type)
    ? checker.getTypeArguments(type as ts.TypeReference)[0]
    : undefined
  if (element) return familyOf(checker, element)
  const name = type.aliasSymbol?.name
  if (name && CORE_TYPES.has(name)) return 'core'
  if (name && AGENT_TYPES.has(name)) return 'agent'
  if (type.isUnionOrIntersection()) {
    for (const part of type.types) {
      const family = familyOf(checker, part)
      if (family) return family
    }
  }
  return undefined
}

/** El nombre de la funcion que encierra al nodo, si tiene uno. */
function enclosingFunctionName(node: ts.Node): string | undefined {
  for (let cur: ts.Node | undefined = node.parent; cur; cur = cur.parent) {
    if ((ts.isFunctionDeclaration(cur) || ts.isMethodDeclaration(cur)) && cur.name) {
      return cur.name.getText()
    }
    if ((ts.isArrowFunction(cur) || ts.isFunctionExpression(cur)) &&
        ts.isVariableDeclaration(cur.parent) && ts.isIdentifier(cur.parent.name)) {
      return cur.parent.name.text
    }
  }
  return undefined
}

/** `x as unknown as T`: la fuente real es `x`, no el `unknown` intermedio. */
function assertionSource(node: ts.AsExpression | ts.TypeAssertion): ts.Expression {
  let source = node.expression
  while ((ts.isAsExpression(source) || ts.isTypeAssertionExpression(source)) &&
         source.type.kind === ts.SyntaxKind.UnknownKeyword) {
    source = source.expression
  }
  while (ts.isParenthesizedExpression(source)) source = source.expression
  return source
}

export function auditSourceFile(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  displayPath: string,
): ShapeFinding[] {
  const findings: ShapeFinding[] = []
  const at = (node: ts.Node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'message') {
      const family = familyOf(checker, checker.getTypeAtLocation(node.expression))
      if (family === 'core') {
        const outer = ts.isPropertyAccessExpression(node.parent) ? node.parent.name.text : undefined
        const pos = at(node)
        findings.push({
          file: displayPath, line: pos.line + 1, column: pos.character + 1, code: 'SHAPE001',
          message: `dual-shape read .message${outer ? '.' + outer : ''} on a flat CoreMessage`,
        })
      }
    }
    // El eslabon interior de `x as unknown as T` se juzga en el exterior: la
    // cadena es un solo cruce.
    const innerOfChain = (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) &&
      (ts.isAsExpression(node.parent) || ts.isTypeAssertionExpression(node.parent))
    if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && !innerOfChain) {
      const target = familyOf(checker, checker.getTypeFromTypeNode(node.type))
      const source = familyOf(checker, checker.getTypeAtLocation(assertionSource(node)))
      // Tres formas de cruzar: algo ajeno afirmado como Core, un Core afirmado
      // como Agent, y un Core borrado a un tipo ajeno (`as never` para pasarlo
      // a un sumidero que espera otra forma).
      const crosses = (target === 'core' && source !== 'core') ||
                      (source === 'core' && target !== 'core')
      const inAdapter = ADAPTERS.has(enclosingFunctionName(node) ?? '')
      if (crosses && !inAdapter) {
        const pos = at(node)
        findings.push({
          file: displayPath, line: pos.line + 1, column: pos.character + 1, code: 'SHAPE002',
          message: `model crossing without adapter: ${source ?? 'foreign'} value asserted as ${target ?? checker.typeToString(checker.getTypeFromTypeNode(node.type))}`,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return findings
}

function listSources(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...listSources(path))
    else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(path)
    }
  }
  return out
}

export function auditScope(root: string, tsconfigPath: string, scope: string): {
  findings: ShapeFinding[]
  files: number
} {
  const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root)
  const files = listSources(scope)
  const program = ts.createProgram(files, { ...parsed.options, noEmit: true })
  const checker = program.getTypeChecker()
  const findings: ShapeFinding[] = []
  for (const file of files) {
    const sourceFile = program.getSourceFile(file)
    if (sourceFile) findings.push(...auditSourceFile(checker, sourceFile, relative(root, file)))
  }
  return { findings, files: files.length }
}

function option(argv: string[], name: string, fallback: string): string {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const root = resolve(option(argv, '--root', '.'))
  const tsconfig = resolve(root, option(argv, '--tsconfig', 'tsconfig.json'))
  const scope = resolve(root, option(argv, '--scope', 'src/packages/agent'))
  // Sin alcance medible no se emite cifra: un 0 aqui no distinguiria «la
  // frontera esta limpia» de «no hubo nada que mirar».
  if (!existsSync(tsconfig) || !existsSync(scope)) {
    console.error(`message_shape_audit: REHUSA — falta ${existsSync(tsconfig) ? scope : tsconfig}`)
    process.exit(2)
  }
  const { findings, files } = auditScope(root, tsconfig, scope)
  if (files === 0) {
    console.error(`message_shape_audit: REHUSA — 0 archivos fuente en ${scope}`)
    process.exit(2)
  }
  for (const f of findings) console.log(`${f.file}(${f.line},${f.column}): error ${f.code}: ${f.message}`)
  console.error(`message_shape_audit: ${findings.length} hallazgo(s) (alcance medido: ${files} archivo(s) de ${relative(root, scope)})`)
  process.exit(findings.length > 0 ? 1 : 0)
}
