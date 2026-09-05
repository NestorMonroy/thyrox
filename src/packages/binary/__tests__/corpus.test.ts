/**
 * Tests de las etapas que consumen la tabla: escritura del corpus, grafo de
 * dependencias y frescura.
 *
 * Cada asercion se ancla a una de tres fuentes, y el comentario dice a cual:
 *
 *   - el contenedor  — lo que Bun declara (`/$bunfs/root/`, la forma del
 *                      import que el empaquetador emite).
 *   - la build       — cifras de UN ejecutable concreto, inmutable.
 *   - el proposito   — invariantes de la etapa, no del formato.
 *
 * Control positivo del corpus: `_references/claude-code-bin/2.1.246/MANIFEST.tsv`,
 * escrito por el probe Python. Las columnas y el SHA-256 de esta etapa tienen
 * que ser los mismos, o el corpus deja de ser comparable entre builds.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findSection } from '../src/elf.ts'
import { BUNFS_PREFIX, SECTION_HEADER, deriveVersion, readModuleTable } from '../src/bunfs.ts'
import { buildGraph, importsOf } from '../src/graph.ts'
import { corpusVersion, freshness } from '../src/freshness.ts'
import { writeCorpus } from '../src/corpus.ts'

const BINARY = '/opt/claude-code/bin/claude'
const bytes = existsSync(BINARY) ? readFileSync(BINARY) : null
const tabla = bytes
  ? (() => {
      const s = findSection(bytes, '.bun')!
      const payload = bytes.subarray(s.offset + SECTION_HEADER, s.offset + s.size)
      return { payload, table: readModuleTable(payload)!, version: deriveVersion(bytes.subarray(s.offset, s.offset + s.size))! }
    })()
  : null

describe('grafo de dependencias entre modulos', () => {
  test('importsOf lee la forma que el empaquetador emite', () => {
    // El contenedor: todo import entre chunks se escribe contra la raiz
    // virtual. `import{a}from"/$bunfs/root/chunk-x.js"` y su variante `export
    // … from` son las dos formas observadas.
    const src = 'import{BZt,Fe}from"/$bunfs/root/chunk-czaspe53.js";export{x}from"/$bunfs/root/chunk-y.js";'
    expect(importsOf(src)).toEqual(['chunk-czaspe53.js', 'chunk-y.js'])
  })

  test('un import a si mismo no se cuenta como arista', () => {
    // El proposito: un ciclo trivial ensucia toda metrica de grado.
    expect(importsOf('from"/$bunfs/root/a.js"', 'a.js')).toEqual([])
  })

  test('el texto que solo MENCIONA la raiz no produce arista', () => {
    // El proposito: la raiz aparece en cadenas de diagnostico del propio
    // cliente. Contarlas inflaria el grafo con aristas que no existen.
    expect(importsOf('console.log("/$bunfs/root/chunk-x.js")')).toEqual([])
  })

  test.if(tabla !== null)('el grafo de la build viva tiene aristas y ningun destino fantasma', () => {
    // La build: cada destino tiene que existir como entrada de la tabla. Un
    // destino ausente significa que el patron leyo algo que no es un import.
    const g = buildGraph(tabla!.payload, tabla!.table.entries)
    expect(g.edges).toBeGreaterThan(1000)
    expect(g.dangling).toEqual([])
    expect(g.nodes.size).toBe(tabla!.table.entries.filter(e => e.name.endsWith('.js')).length)
  }, 60_000)
})

describe('escritura del corpus', () => {
  test.if(tabla !== null)('escribe bajo <raiz>/<version>/ con MANIFEST de cuatro columnas', () => {
    // Control positivo: las columnas son las que el probe Python ya escribio en
    // `_references/claude-code-bin/2.1.246/MANIFEST.tsv`. Cambiarlas rompe la
    // comparabilidad entre builds.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    const r = writeCorpus(raiz, tabla!.version, tabla!.payload, tabla!.table.entries.slice(0, 5))

    expect(readdirSync(raiz)).toEqual([tabla!.version])
    const manifest = readFileSync(join(raiz, tabla!.version, 'MANIFEST.tsv'), 'utf8').split('\n')
    expect(manifest[0]).toBe('archivo\tbytes\ttipo\tsha256')
    expect(manifest[1].split('\t')).toHaveLength(4)
    expect(r.files).toBe(5)
  })

  test.if(tabla !== null)('el sha256 del manifest es el del archivo escrito', () => {
    // El proposito: el SHA es lo que hace verificable la extraccion. Si no
    // coincide con el archivo, el manifest no prueba nada.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    writeCorpus(raiz, tabla!.version, tabla!.payload, tabla!.table.entries.slice(0, 3))
    const [, ...filas] = readFileSync(join(raiz, tabla!.version, 'MANIFEST.tsv'), 'utf8').trim().split('\n')
    for (const fila of filas) {
      const [archivo, , , sha] = fila.split('\t')
      const real = new Bun.CryptoHasher('sha256').update(readFileSync(join(raiz, tabla!.version, archivo))).digest('hex')
      expect(real).toBe(sha)
    }
  })

  test.if(tabla !== null)('una version ya EXTRAIDA NO se pisa', () => {
    // El proposito: el corpus de una build es inmutable. Sobrescribirlo
    // destruiria la evidencia contra la que se citan las mediciones viejas.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    writeCorpus(raiz, tabla!.version, tabla!.payload, tabla!.table.entries.slice(0, 2))
    expect(() => writeCorpus(raiz, tabla!.version, tabla!.payload, tabla!.table.entries.slice(0, 2))).toThrow(/ya extraida/)
  })

  test.if(tabla !== null)('un directorio con prosa NO bloquea la extraccion', () => {
    // Los dos modulos tienen que usar el MISMO discriminador. `corpusVersion`
    // exige MANIFEST y `writeCorpus` exigia solo que el directorio no
    // existiera: con eso, `_references/claude-code-bin/2.1.258/` —que trae README y
    // volcado de strings, ninguna extraccion— quedaba a la vez «sin corpus»
    // para el gate e «intocable» para la escritura. Lo destapo el primer
    // intento real de extraer, no una lectura del codigo.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    mkdirSync(join(raiz, '9.9.9'), { recursive: true })
    writeFileSync(join(raiz, '9.9.9', 'README.md'), 'procedencia\n')
    const r = writeCorpus(raiz, '9.9.9', tabla!.payload, tabla!.table.entries.slice(0, 2))
    expect(r.files).toBe(2)
    // Y lo que ya estaba se conserva: extraer no borra la prosa que lo describe.
    expect(existsSync(join(raiz, '9.9.9', 'README.md'))).toBe(true)
  })

  test.if(tabla !== null)('la ruta se confina bajo la raiz', () => {
    // El proposito: el nombre viene del binario, no de nosotros. Un `..` en una
    // entrada escribiria fuera del corpus.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    const trampa = [{ name: `${BUNFS_PREFIX}../fuera.js`, offset: 0, length: 4 }]
    expect(() => writeCorpus(raiz, '9.9.9', tabla!.payload, trampa)).toThrow(/fuera de la raiz/)
  })
})

describe('frescura del corpus contra el ejecutable vivo', () => {
  test('corpusVersion devuelve null si el directorio no existe', () => {
    expect(corpusVersion('/no/existe/_references/claude-code-bin')).toBeNull()
  })

  test.if(tabla !== null)('la build viva se compara contra lo extraido, no contra el nombre del directorio', () => {
    // El proposito: en H-DOCS-455 el contenedor actualizo el ejecutable a media
    // sesion y tanto `claude --version` como el nombre del directorio mintieron
    // sobre lo que el corpus contenia. Aqui la version viva se DERIVA del
    // payload; la del corpus, de lo que hay en disco.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    writeCorpus(raiz, '1.0.0', tabla!.payload, tabla!.table.entries.slice(0, 2))

    const f = freshness(raiz, tabla!.version)
    expect(f.corpus).toBe('1.0.0')
    expect(f.live).toBe(tabla!.version)
    expect(f.stale).toBe(true)
    // El motivo se nombra: un booleano solo no dice que hacer.
    expect(f.reason).toContain(tabla!.version)
  })

  test.if(tabla !== null)('coincidiendo, no esta rancio', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    writeCorpus(raiz, tabla!.version, tabla!.payload, tabla!.table.entries.slice(0, 2))
    expect(freshness(raiz, tabla!.version).stale).toBe(false)
  })
})

describe('un directorio NO es un corpus', () => {
  test('una build sin MANIFEST no cuenta como extraida', () => {
    // El defecto que esto cierra lo destapo el propio gate al correr contra el
    // corpus real: `_references/claude-code-bin/2.1.258/` EXISTE y trae dos archivos
    // —README y volcado de strings—, ninguna extraccion. Contar el directorio
    // es el sub-patron D: un verde que no distingue «extraida» de «tiene
    // carpeta con su nombre».
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    mkdirSync(join(raiz, '9.9.9'), { recursive: true })
    writeFileSync(join(raiz, '9.9.9', 'README.md'), 'solo prosa\n')
    expect(corpusVersion(raiz)).toBeNull()
  })

  test('el sufijo tras el parche no descoloca el orden', () => {
    // Tambien real: el corpus tiene `2.1.246-nombrado` junto a `2.1.246`. Con
    // el comparador roto, `Number('246-nombrado')` da NaN, el orden queda sin
    // definir, y el gate publico 2.1.246-nombrado como la build mas alta
    // teniendo 2.1.258 en disco.
    const raiz = mkdtempSync(join(tmpdir(), 'corpus-'))
    for (const v of ['2.1.246', '2.1.246-nombrado', '2.1.258']) {
      mkdirSync(join(raiz, v), { recursive: true })
      writeFileSync(join(raiz, v, 'MANIFEST.tsv'), 'archivo\tbytes\ttipo\tsha256\n')
    }
    expect(corpusVersion(raiz)).toBe('2.1.258')
  })
})
