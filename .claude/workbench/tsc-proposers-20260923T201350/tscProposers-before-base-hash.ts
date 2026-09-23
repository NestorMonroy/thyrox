/**
 * Proponentes baratos del lazo tsc cero, reunidos: para cada archivo, una
 * propuesta por proponente con sus ediciones, sus objetivos y sus archivos.
 *
 * El contrato de salida es el JSONL que ya leen `batch_verification
 * --proposals` y `tsc_schedule --candidates`:
 *
 *   proposal_id  `<proponente>:<archivo relativo>` — estable entre corridas
 *   proposer     el nombre del proponente, la unidad de la posterior Beta
 *   targets      claves `archivo: TSnnnn: mensaje` de los diagnósticos que la
 *                edición toca, con la forma exacta de `tsc --pretty false`
 *   files        archivos que la propuesta edita, relativos a `cwd`
 *   edits        las ediciones, para aplicarlas y revertirlas en el paso
 *   bases        sha256 del texto de cada archivo sobre el que se propuso: las
 *                posiciones de `edits` sólo valen sobre ese texto, así que dos
 *                propuestas del mismo archivo no se componen, y el aplicador
 *                rehúsa en vez de escribir en el sitio equivocado
 *
 * Cada proponente conserva SUS guardas: este módulo no decide qué es seguro,
 * sólo reúne y etiqueta. Un diagnóstico cuenta como objetivo cuando su código
 * es de los que el proponente reclama y su tramo toca una edición: reclamar un
 * error ajeno haría rechazar la propuesta por algo que no era suyo.
 *
 * Métrica: diagnósticos del servicio de lenguaje con sus claves de `tsc`.
 * Ciega a: si la clave aparece en el log real de `tsc`, que es otro universo;
 * lo mide `batch_verification`, que da `no-targets` cuando no aparece.
 */
import { createHash } from 'node:crypto'
import path from 'node:path'
import ts from 'typescript'
import { inferredTypeEdits } from './applyInferredTypes'
import { unusedImportEdits } from './removeUnusedImports'
import {
  DEFAULT_OPTIONS,
  applyEdits,
  createMemoryService,
  createProjectService,
  type Reader,
} from './tsLanguageService'

export type ProposalEdit = { file: string; start: number; length: number; newText: string }

export type ProposalRow = {
  proposal_id: string
  proposer: string
  targets: string[]
  files: string[]
  edits: ProposalEdit[]
  bases: Record<string, string>
}

export function textHash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

type Proposer = {
  name: string
  codes: ReadonlySet<number>
  edits: (service: ts.LanguageService, fileName: string, text: string) => ts.TextChange[]
}

export const PROPOSERS: readonly Proposer[] = [
  {
    name: 'unused-imports',
    codes: new Set([6133, 6192, 6196, 6198]),
    edits: (service, fileName) => unusedImportEdits(service, fileName).edits,
  },
  {
    name: 'infer-from-usage',
    codes: new Set([7005, 7006, 7008, 7019, 7031, 7034, 7043, 7044, 7045, 7046, 7047, 7050]),
    edits: (service, fileName, text) => inferredTypeEdits(service, fileName, text),
  },
]

/** La clave sin coordenadas que `analyze_typescript_diagnostics` extrae de
 * una línea de `tsc`: el archivo relativo a `cwd`, el código y la primera
 * línea del mensaje (las encadenadas van en líneas propias, sangradas). */
export function diagnosticKey(diagnostic: ts.Diagnostic, cwd: string): string {
  const file = path.relative(cwd, diagnostic.file!.fileName)
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n').split('\n')[0]
  return `${file}: TS${diagnostic.code}: ${message}`
}

function touches(diagnostic: ts.Diagnostic, edits: readonly ts.TextChange[]): boolean {
  const start = diagnostic.start!
  const end = start + (diagnostic.length ?? 0)
  // Tramos cerrados: una anotación se INSERTA justo al final del nombre que
  // el diagnóstico señala, con longitud cero.
  return edits.some(edit => edit.span.start <= end && start <= edit.span.start + edit.span.length)
}

function propose(service: ts.LanguageService, files: string[], read: Reader, cwd: string): ProposalRow[] {
  const program = service.getProgram()
  if (!program) throw new Error('el servicio de lenguaje no tiene programa')
  const rows: ProposalRow[] = []
  for (const fileName of files) {
    const source = program.getSourceFile(fileName)
    const text = read(fileName)
    if (!source || text === undefined) continue
    const diagnostics = [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
      .filter(diagnostic => diagnostic.start !== undefined)
    const relative = path.relative(cwd, fileName)
    for (const proposer of PROPOSERS) {
      const edits = proposer.edits(service, fileName, text)
      if (edits.length === 0) continue
      const targets = diagnostics
        .filter(diagnostic => proposer.codes.has(diagnostic.code) && touches(diagnostic, edits))
        .map(diagnostic => diagnosticKey(diagnostic, cwd))
      // Una edición que no toca ningún diagnóstico reclamado no tiene objeto:
      // el verificador la daría `no-targets` y no enseñaría nada.
      if (targets.length === 0) continue
      rows.push({
        proposal_id: `${proposer.name}:${relative}`,
        proposer: proposer.name,
        targets: targets.sort(),
        files: [relative],
        edits: edits.map(edit => ({
          file: relative,
          start: edit.span.start,
          length: edit.span.length,
          newText: edit.newText,
        })),
        bases: { [relative]: textHash(text) },
      })
    }
  }
  return rows
}

/** Variante en memoria: `sources` es el universo entero del programa. */
export function proposeInMemory(
  sources: Record<string, string>,
  files: string[],
  cwd: string,
  options: ts.CompilerOptions = DEFAULT_OPTIONS,
): ProposalRow[] {
  const { service, read } = createMemoryService(sources, options)
  return propose(service, files, read, cwd)
}

/** Aplica las ediciones de una propuesta a un universo en memoria. */
export function applyProposalEdits(
  sources: Record<string, string>,
  row: ProposalRow,
  cwd: string,
): Record<string, string> {
  const next = { ...sources }
  for (const file of row.files) {
    const absolute = path.resolve(cwd, file)
    if (textHash(next[absolute] ?? '') !== row.bases[file]) {
      throw new Error(`${file} cambió desde que se propuso ${row.proposal_id}: las posiciones ya no valen`)
    }
    const edits = row.edits
      .filter(edit => edit.file === file)
      .map(edit => ({ span: { start: edit.start, length: edit.length }, newText: edit.newText }))
    next[absolute] = applyEdits(next[absolute], edits)
  }
  return next
}

/** Variante de proyecto: los archivos del `tsconfig` con algún diagnóstico. */
export function proposeInProject(tsconfigPath: string, cwd: string): ProposalRow[] {
  const service = createProjectService(tsconfigPath)
  const program = service.getProgram()
  if (!program) throw new Error('el servicio de lenguaje no tiene programa')
  const files = program
    .getSourceFiles()
    .filter(source => !source.isDeclarationFile && !source.fileName.includes('/node_modules/'))
    .map(source => source.fileName)
  return propose(service, files, ts.sys.readFile, cwd)
}

if (import.meta.main) {
  // Uso: bun src/verify/tscProposers.ts <tsconfig>   (JSONL por stdout)
  const [tsconfig] = process.argv.slice(2)
  if (!tsconfig) {
    console.error('uso: tsc_proposers <tsconfig>')
    process.exit(2)
  }
  const rows = proposeInProject(tsconfig, process.cwd())
  for (const row of rows) process.stdout.write(JSON.stringify(row) + '\n')
  const byProposer = new Map<string, number>()
  for (const row of rows) byProposer.set(row.proposer, (byProposer.get(row.proposer) ?? 0) + 1)
  console.error(
    `tsc_proposers: ${rows.length} propuesta(s) · ` +
      [...byProposer].map(([name, count]) => `${name} ${count}`).join(' · ') +
      ` · objetivos ${rows.reduce((sum, row) => sum + row.targets.length, 0)}`,
  )
}
