/**
 * Comprueba con el compilador que cada simbolo que importa un archivo exista
 * en su modulo: crea el programa con ese unico archivo raiz y el tsconfig del
 * proyecto, y lista los diagnosticos de resolucion (TS2305 miembro ausente,
 * TS2307 modulo ausente, TS2614/TS2724 nombre ausente).
 * Uso: bun check_imports.ts <tsconfig> <archivo>
 */
import ts from 'typescript'
import { dirname, resolve } from 'node:path'
const [tsconfig, file] = process.argv.slice(2) as [string, string]
const cfg = ts.readConfigFile(tsconfig, ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, dirname(resolve(tsconfig)))
const program = ts.createProgram([resolve(file)], { ...parsed.options, noEmit: true })
const sf = program.getSourceFile(resolve(file))!
const codes = new Set([2305, 2307, 2614, 2724, 2459, 2460])
for (const d of program.getSemanticDiagnostics(sf)) {
  if (!codes.has(d.code)) continue
  const { line } = sf.getLineAndCharacterOfPosition(d.start ?? 0)
  console.log(`${line + 1}\tTS${d.code}\t${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`)
}
