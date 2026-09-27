/**
 * Rebautiza el producto en el texto visible de un archivo TypeScript (TASK
 * #67, fase C). Recorre el AST y sólo edita literales de cadena, plantillas y
 * texto JSX; identificadores (fase B) y comentarios quedan intactos.
 *
 * Mapa, en orden, sobre el texto crudo de cada literal:
 *   1. nombre de modelo con prefijo: se queda la familia, con su versión si
 *      la lleva delante («Opus 4.8», «3.7 Sonnet»);
 *   2. la API y el SDK del proveedor: «Anthropic API», «Agent SDK»;
 *   3. el archivo de instrucciones: `THYROX.md`, `THYROX.local.md`;
 *   4. el producto, con o sin «Code», y sus servicios («… in Chrome»,
 *      «… Desktop»): la constante `PRODUCT_NAME` (decisión del ejecutor
 *      2026-09-27: el texto visible dice thyrox, servicios incluidos).
 * Un dominio (`….ai`, `….com`) es una dirección y no se toca.
 * Un nombre seguido de guion y mayúscula (`X-Session`, un encabezado) o
 * precedido de guion es protocolo y no se toca; seguido de guion y minúscula
 * es prosa («X-voice») y sí. El nombre a sustituir se arma en tiempo de ejecución para que este
 * archivo no lo escriba.
 *
 * Uso: `bun src/verify/renameProductInText.ts [--write] <archivo>...`; sin
 * `--write` imprime lo que cambiaría. Sale 0, o 2 si un archivo no parsea.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import ts from 'typescript'

const OLD = ['Cl', 'aude'].join('')
const OLD_UPPER = OLD.toUpperCase()
const PRODUCT = `(?<![-\\w])${OLD}(?: Code)?(?![\\w]|-[A-Z]|\\.(?:ai|com)\\b)`

export type RenameEdit = { kind: string; line: number; before: string; after: string }
export type RenameOptions = { importFrom: string }

/** Las sustituciones que no llevan la constante: texto por texto. */
function plainRenames(raw: string): string {
  return raw
    .replace(new RegExp(`${OLD} ((?:\\d+(?:\\.\\d+)? )?(?:Opus|Sonnet|Haiku|Fable|Mythos))`, 'g'), '$1')
    .replace(new RegExp(`${OLD} API`, 'g'), 'Anthropic API')
    .replace(new RegExp(`${OLD} Agent SDK`, 'g'), 'Agent SDK')
    .replace(new RegExp(`${OLD_UPPER}\\.local\\.md`, 'g'), 'THYROX.local.md')
    .replace(new RegExp(`${OLD_UPPER}\\.md`, 'g'), 'THYROX.md')
}

const productPattern = () => new RegExp(PRODUCT, 'g')

/** Escapa lo que una cadena entre comillas simples o dobles no necesitaba
 * escapar y una plantilla sí. */
function toTemplateRaw(quotedRaw: string): string {
  return quotedRaw.replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

export function renameProductInSource(
  fileName: string,
  text: string,
  options: RenameOptions,
): { text: string; edits: RenameEdit[] } {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind)
  const edits: Array<RenameEdit & { start: number; end: number }> = []
  let usesConstant = false

  const record = (node: ts.Node, kindName: string, after: string) => {
    const before = node.getText(source)
    if (after === before) return
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
    edits.push({ kind: kindName, line: line + 1, before, after, start: node.getStart(source), end: node.getEnd() })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isExternalModuleReference(node)) return
    if (ts.isStringLiteral(node)) {
      const parent = node.parent
      const isKey = (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node
      if (!isKey && !ts.isLiteralTypeNode(parent)) {
        const raw = node.getText(source)
        const inner = plainRenames(raw.slice(1, -1))
        if (productPattern().test(inner)) {
          usesConstant = true
          const template = '`' + toTemplateRaw(inner).replace(productPattern(), '${PRODUCT_NAME}') + '`'
          record(node, 'cadena', ts.isJsxAttribute(parent) ? '{' + template + '}' : template)
        } else {
          record(node, 'cadena', raw[0] + inner + raw[0])
        }
      }
    } else if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      const raw = node.getText(source)
      const renamed = plainRenames(raw)
      const after = renamed.replace(productPattern(), () => {
        usesConstant = true
        return '${PRODUCT_NAME}'
      })
      record(node, 'plantilla', after)
    } else if (ts.isJsxText(node)) {
      const raw = node.getText(source)
      const after = plainRenames(raw).replace(productPattern(), () => {
        usesConstant = true
        return '{PRODUCT_NAME}'
      })
      record(node, 'jsx', after)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  let out = text
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.after + out.slice(e.end)
  }
  if (usesConstant && !/\bPRODUCT_NAME\b[^;\n]*from/.test(text) && !/import\s*\{[^}]*\bPRODUCT_NAME\b/.test(text)) {
    const line = `import { PRODUCT_NAME } from '${options.importFrom}'\n`
    const lastImport = [...out.matchAll(/^(?:import [^\n]*from '[^']+'|\} from '[^']+')\n/gm)].at(-1)
    const at = lastImport ? lastImport.index! + lastImport[0].length : 0
    out = out.slice(0, at) + line + out.slice(at)
  }
  return { text: out, edits: edits.map(({ start: _s, end: _e, ...rest }) => rest) }
}

function importFor(fileName: string): string {
  return /src\/packages\/config\//.test(fileName) ? relativeProduct(fileName) : '@thyrox/config/product'
}

function relativeProduct(fileName: string): string {
  const depth = fileName.split('src/packages/config/')[1]!.split('/').length - 1
  return (depth === 0 ? './' : '../'.repeat(depth)) + 'product.js'
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  let refused = 0
  for (const file of args.filter(a => a !== '--write')) {
    const text = readFileSync(file, 'utf8')
    const result = renameProductInSource(file, text, { importFrom: importFor(file) })
    const probe = ts.createSourceFile(file, result.text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const broken = (probe as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics.length > 0
    if (broken) {
      refused += 1
      console.error(`renameProductInText: ${file} no parsea tras el cambio — no se escribe`)
      continue
    }
    for (const e of result.edits) console.log(`${file}:${e.line} [${e.kind}] ${e.before}  =>  ${e.after}`)
    if (write && result.edits.length) writeFileSync(file, result.text)
  }
  process.exit(refused ? 2 : 0)
}
