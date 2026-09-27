#!/usr/bin/env bun
/**
 * Interfaz de linea de comandos de `@thyrox/binary`.
 *
 * Subcomandos:
 *   info                 version declarada, secciones, tamano de la tabla
 *   extract [--out R]    escribe el corpus en <R>/<version>/ con MANIFEST
 *   graph [--json]       grafo de imports entre modulos
 *   freshness [--root R] compara el corpus con el ejecutable vivo
 *   reflow <mod> [--out F] [--root R]
 *                        reformatea un modulo para que sea citable; con
 *                        --root lo lee del corpus y no del ejecutable vivo
 *   symbol <chunk> <nombre>... [--root R]
 *                        definiciones completas de cada nombre, por arbol
 *                        sintactico, siguiendo import/export entre chunks
 *   references <chunk> <nombre> [--root R]
 *                        usos del símbolo en su chunk y en los que lo
 *                        importan —por nombre o como namespace: import*as,
 *                        import() y el cargador que lo devuelve—, con el
 *                        miembro que cada uso llama
 *   literal <texto> [--root R]
 *                        declaraciones que contienen el literal, con su
 *                        chunk y su nombre: lo que se pasa luego a symbol
 *
 * Toda salida lleva su denominador. Un conteo sin el no es un resultado: con
 * el alcance oculto, un instrumento ciego y uno correcto publican la misma
 * cifra.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { findSection } from '../src/elf.ts'
import { BUNFS_PREFIX, SECTION_HEADER, deriveVersion, readModuleTable } from '../src/bunfs.ts'
import { buildGraph } from '../src/graph.ts'
import { writeCorpus } from '../src/corpus.ts'
import { corpusVersion, freshness } from '../src/freshness.ts'
import { reflow } from '../src/reflow.ts'
import { resolveSymbol, scanReferences } from '../src/symbol.ts'
import { scanLiteral } from '../src/declaration.ts'

const DEFAULT_BINARY = '/opt/claude-code/bin/claude'
const DEFAULT_CORPUS = '_references/claude-code-bin'
const EXIT_GUARD = 2

/** Muere con 2 y SIN emitir cifra: un 0 aqui seria un verde falso. */
function guard(message: string): never {
  console.error(`ERROR — ${message}. NO se emite un conteo.`)
  process.exit(EXIT_GUARD)
}

function option(argv: string[], name: string, fallback: string): string {
  const i = argv.indexOf(name)
  const value = argv[i + 1]
  return i >= 0 && value ? value : fallback
}

function open(argv: string[]) {
  const binaryPath = option(argv, '--bin', DEFAULT_BINARY)
  if (!existsSync(binaryPath)) guard(`no existe el ejecutable ${binaryPath}`)
  const bytes = readFileSync(binaryPath)
  const section = findSection(bytes, '.bun')
  if (section === null) guard(`${binaryPath} no declara una seccion .bun`)
  const payload = bytes.subarray(section.offset + SECTION_HEADER, section.offset + section.size)
  const version = deriveVersion(bytes.subarray(section.offset, section.offset + section.size))
  if (version === null) guard('el payload no declara su version')
  const table = readModuleTable(payload)
  if (table === null) guard('no se pudo derivar la forma de la tabla de modulos')
  return { binaryPath, bytes, section, payload, version, table }
}

const argv = process.argv.slice(2)
const command = argv[0] ?? 'info'

if (command === 'info') {
  const { binaryPath, section, version, table } = open(argv)
  const byKind = new Map<string, number>()
  for (const e of table.entries) {
    const ext = e.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '(sin)'
    byKind.set(ext, (byKind.get(ext) ?? 0) + 1)
  }
  const bytes = table.entries.reduce((n, e) => n + e.length, 0)
  console.log(`ejecutable  ${binaryPath}`)
  console.log(`version     ${version}   (declarada por el payload, no por --version)`)
  console.log(`seccion     .bun en ${section.offset}, ${section.size} B`)
  console.log(`tabla       ${table.entries.length} entradas, paso ${table.stride}, ${table.tableLength} B`)
  console.log(`contenido   ${bytes} B`)
  console.log(`por tipo    ${[...byKind].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
} else if (command === 'extract') {
  const { bytes, payload, version, table } = open(argv)
  const root = option(argv, '--out', DEFAULT_CORPUS)
  const r = writeCorpus(root, version, payload, table.entries, bytes)
  console.log(`escrito ${r.files} archivo(s), ${r.bytes} B en ${r.root}`)
  console.log(`(alcance medido: ${r.files} de ${table.entries.length} entradas de la tabla)`)
} else if (command === 'graph') {
  const { payload, table, version } = open(argv)
  const g = buildGraph(payload, table.entries)
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ version, nodes: Object.fromEntries(g.nodes), edges: g.edges }, null, 2))
  } else {
    const entry = new Map<string, number>()
    for (const [, ds] of g.nodes) for (const d of ds) entry.set(d, (entry.get(d) ?? 0) + 1)
    console.log(`version ${version}: ${g.nodes.size} nodos, ${g.edges} aristas, ${g.dangling.length} destinos colgantes`)
    console.log(`(alcance medido: ${g.nodes.size} de ${table.entries.length} entradas — solo los .js declaran imports)`)
    console.log('mas importados:')
    for (const [n, d] of [...entry].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${String(d).padStart(4)}  ${n}`)
  }
} else if (command === 'freshness') {
  const { version } = open(argv)
  const f = freshness(option(argv, '--root', DEFAULT_CORPUS), version)
  console.log(f.reason)
  process.exit(f.stale ? 1 : 0)
} else if (command === 'reflow') {
  const name = argv[1]
  if (!name || name.startsWith('--')) guard('falta el nombre del modulo (ej. chunk-vw215j9f.js)')
  // Con `--root`, el módulo sale del corpus versionado —como en `symbol`—;
  // sin él, del ejecutable vivo, cuyos chunks llevan otros nombres.
  const root = option(argv, '--root', '')
  let src: string
  if (root) {
    if (!existsSync(`${root}/${name}`)) guard(`no existe ${root}/${name}`)
    src = readFileSync(`${root}/${name}`, 'utf8')
  } else {
    const { payload, table } = open(argv)
    const e = table.entries.find(x => x.name === BUNFS_PREFIX + name || x.name.endsWith('/' + name))
    if (!e) guard(`la tabla no declara el modulo ${name}`)
    src = payload.subarray(e.offset, e.offset + e.length).toString('utf8')
  }
  const output = reflow(src)
  const destination = option(argv, '--out', '')
  const lines = (s: string) => s.split('\n')
  console.error(`${name}: ${lines(src).length} -> ${lines(output).length} lineas; ancho medio ${Math.round(src.length / lines(src).length)} -> ${Math.round(output.length / lines(output).length)}`)
  if (destination) writeFileSync(destination, output)
  else process.stdout.write(output)
} else if (command === 'symbol') {
  // Sin `--root`, la build más reciente del corpus: un literal fijo dejaba de
  // ser la última en cuanto se extraía otra.
  const latest = corpusVersion(DEFAULT_CORPUS)
  if (!argv.includes('--root') && latest === null) guard(`sin builds en ${DEFAULT_CORPUS}; use --root`)
  const root = option(argv, '--root', `${DEFAULT_CORPUS}/${latest}/bunfs-root`)
  const [chunk, ...rest] = argv.slice(1)
  const names = rest.filter((x, i) => !x.startsWith('--') && rest[i - 1] !== '--root')
  if (!chunk || names.length === 0) guard('uso: symbol <chunk> <nombre>... [--root R]')
  if (!existsSync(`${root}/${chunk}`)) guard(`no existe ${root}/${chunk}`)
  let missing = 0
  for (const name of names) {
    const defs = resolveSymbol(root, chunk, name)
    if (defs.length === 0) missing++
    const scope = defs.length > 0 && defs.every(d => d.kind === 'method') ? 'de método de clase' : 'de nivel superior'
    console.log(`==== ${name}: ${defs.length} definicion(es) ${scope}`)
    for (const d of defs) console.log(`---- ${d.file} ${d.kind} ${d.name} [${d.start},${d.end})\n${d.text}`)
  }
  console.error(`symbol: ${names.length - missing} de ${names.length} nombre(s) resueltos`)
  process.exit(missing > 0 ? 1 : 0)
} else if (command === 'literal') {
  // La pregunta con la que empieza una extracción: qué declaraciones llevan
  // este literal. Su salida alimenta a `symbol <chunk> <nombre>`.
  const latest = corpusVersion(DEFAULT_CORPUS)
  if (!argv.includes('--root') && latest === null) guard(`sin builds en ${DEFAULT_CORPUS}; use --root`)
  const root = option(argv, '--root', `${DEFAULT_CORPUS}/${latest}/bunfs-root`)
  const literal = argv[1]
  if (!literal || literal.startsWith('--')) guard('uso: literal <texto> [--root R]')
  if (!existsSync(root)) guard(`no existe ${root}`)
  const scan = scanLiteral(root, literal)
  for (const d of scan.sites) console.log(`${d.file} ${d.kind} ${d.binding ?? '-'} [${d.start},${d.end})`)
  console.error(`literal: ${scan.sites.length} declaración(es) en ${scan.chunksWithLiteral} de ${scan.chunks} chunk(s)`)
  process.exit(scan.sites.length > 0 ? 0 : 1)
} else if (command === 'references') {
  // La dirección que `symbol` no recorre: de la definición a sus usos, con el
  // miembro que cada uso llama. Es el flujo de un mecanismo, no sus literales.
  const latest = corpusVersion(DEFAULT_CORPUS)
  if (!argv.includes('--root') && latest === null) guard(`sin builds en ${DEFAULT_CORPUS}; use --root`)
  const root = option(argv, '--root', `${DEFAULT_CORPUS}/${latest}/bunfs-root`)
  const [chunk, name] = argv.slice(1)
  if (!chunk || !name || name.startsWith('--')) guard('uso: references <chunk> <nombre> [--root R]')
  if (!existsSync(`${root}/${chunk}`)) guard(`no existe ${root}/${chunk}`)
  const scan = scanReferences(root, chunk, name)
  for (const r of scan.references) console.log(`${r.file} ${r.kind} ${r.binding ?? '-'} ${r.member ? '.' + r.member : '-'} @${r.start}`)
  const files = new Set(scan.references.map(r => r.file)).size
  console.error(`references: ${scan.references.length} uso(s) de ${name} en ${files} chunk(s), exportado como ${scan.exportedAs.join(', ') || '(no se exporta)'} (alcance medido: ${scan.chunks} chunk(s))`)
  process.exit(scan.references.length > 0 ? 0 : 1)
} else {
  guard(`subcomando desconocido: ${command}. Use info | extract | graph | freshness | reflow | symbol | literal | references`)
}
