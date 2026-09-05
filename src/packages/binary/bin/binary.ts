#!/usr/bin/env bun
/**
 * Interfaz de linea de comandos de `@thyrox/binary`.
 *
 * Subcomandos:
 *   info                 version declarada, secciones, tamano de la tabla
 *   extract [--out R]    escribe el corpus en <R>/<version>/ con MANIFEST
 *   graph [--json]       grafo de imports entre modulos
 *   freshness [--root R] compara el corpus con el ejecutable vivo
 *   reflow <mod> [--out] reformatea un modulo para que sea citable
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
import { freshness } from '../src/freshness.ts'
import { reflow } from '../src/reflow.ts'

const BINARIO_DEFECTO = '/opt/claude-code/bin/claude'
const CORPUS_DEFECTO = '_references/claude-code-bin'
const EXIT_GUARD = 2

/** Muere con 2 y SIN emitir cifra: un 0 aqui seria un verde falso. */
function guard(mensaje: string): never {
  console.error(`ERROR — ${mensaje}. NO se emite un conteo.`)
  process.exit(EXIT_GUARD)
}

function opcion(argv: string[], nombre: string, defecto: string): string {
  const i = argv.indexOf(nombre)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : defecto
}

function abrir(argv: string[]) {
  const ruta = opcion(argv, '--bin', BINARIO_DEFECTO)
  if (!existsSync(ruta)) guard(`no existe el ejecutable ${ruta}`)
  const bytes = readFileSync(ruta)
  const seccion = findSection(bytes, '.bun')
  if (seccion === null) guard(`${ruta} no declara una seccion .bun`)
  const payload = bytes.subarray(seccion.offset + SECTION_HEADER, seccion.offset + seccion.size)
  const version = deriveVersion(bytes.subarray(seccion.offset, seccion.offset + seccion.size))
  if (version === null) guard('el payload no declara su version')
  const tabla = readModuleTable(payload)
  if (tabla === null) guard('no se pudo derivar la forma de la tabla de modulos')
  return { ruta, bytes, seccion, payload, version, tabla }
}

const argv = process.argv.slice(2)
const orden = argv[0] ?? 'info'

if (orden === 'info') {
  const { ruta, seccion, version, tabla } = abrir(argv)
  const porTipo = new Map<string, number>()
  for (const e of tabla.entries) {
    const ext = e.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '(sin)'
    porTipo.set(ext, (porTipo.get(ext) ?? 0) + 1)
  }
  const bytes = tabla.entries.reduce((n, e) => n + e.length, 0)
  console.log(`ejecutable  ${ruta}`)
  console.log(`version     ${version}   (declarada por el payload, no por --version)`)
  console.log(`seccion     .bun en ${seccion.offset}, ${seccion.size} B`)
  console.log(`tabla       ${tabla.entries.length} entradas, paso ${tabla.stride}, ${tabla.tableLength} B`)
  console.log(`contenido   ${bytes} B`)
  console.log(`por tipo    ${[...porTipo].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
} else if (orden === 'extract') {
  const { payload, version, tabla } = abrir(argv)
  const raiz = opcion(argv, '--out', CORPUS_DEFECTO)
  const r = writeCorpus(raiz, version, payload, tabla.entries)
  console.log(`escrito ${r.files} archivo(s), ${r.bytes} B en ${r.root}`)
  console.log(`(alcance medido: ${r.files} de ${tabla.entries.length} entradas de la tabla)`)
} else if (orden === 'graph') {
  const { payload, tabla, version } = abrir(argv)
  const g = buildGraph(payload, tabla.entries)
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ version, nodes: Object.fromEntries(g.nodes), edges: g.edges }, null, 2))
  } else {
    const entrada = new Map<string, number>()
    for (const [, ds] of g.nodes) for (const d of ds) entrada.set(d, (entrada.get(d) ?? 0) + 1)
    console.log(`version ${version}: ${g.nodes.size} nodos, ${g.edges} aristas, ${g.dangling.length} destinos colgantes`)
    console.log(`(alcance medido: ${g.nodes.size} de ${tabla.entries.length} entradas — solo los .js declaran imports)`)
    console.log('mas importados:')
    for (const [n, d] of [...entrada].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${String(d).padStart(4)}  ${n}`)
  }
} else if (orden === 'freshness') {
  const { version } = abrir(argv)
  const f = freshness(opcion(argv, '--root', CORPUS_DEFECTO), version)
  console.log(f.reason)
  process.exit(f.stale ? 1 : 0)
} else if (orden === 'reflow') {
  const { payload, tabla } = abrir(argv)
  const nombre = argv[1]
  if (!nombre || nombre.startsWith('--')) guard('falta el nombre del modulo (ej. chunk-vw215j9f.js)')
  const e = tabla.entries.find(x => x.name === BUNFS_PREFIX + nombre || x.name.endsWith('/' + nombre))
  if (!e) guard(`la tabla no declara el modulo ${nombre}`)
  const src = payload.subarray(e.offset, e.offset + e.length).toString('utf8')
  const salida = reflow(src)
  const destino = opcion(argv, '--out', '')
  const linea = (s: string) => s.split('\n')
  console.error(`${nombre}: ${linea(src).length} -> ${linea(salida).length} lineas; ancho medio ${Math.round(src.length / linea(src).length)} -> ${Math.round(salida.length / linea(salida).length)}`)
  if (destino) writeFileSync(destino, salida)
  else process.stdout.write(salida)
} else {
  guard(`subcomando desconocido: ${orden}. Use info | extract | graph | freshness | reflow`)
}
